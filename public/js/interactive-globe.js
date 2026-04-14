const TAU = Math.PI * 2;
const MASK_WIDTH = 720;
const MASK_HEIGHT = 360;
const TORONTO = { lat: 43.6532, lon: -79.3832 };
const TORONTO_COLOR = "#1E3765";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const normalizeLongitude = (lon) => ((lon + 180) % 360 + 360) % 360 - 180;

const rotateY = ([x, y, z], cosYaw, sinYaw) => [x * cosYaw + z * sinYaw, y, -x * sinYaw + z * cosYaw];
const rotateX = ([x, y, z], cosPitch, sinPitch) => [x, y * cosPitch - z * sinPitch, y * sinPitch + z * cosPitch];

const unwrapRing = (ring) => {
  if (!ring.length) {
    return [];
  }

  const unwrapped = [[ring[0][0], ring[0][1]]];
  for (let index = 1; index < ring.length; index += 1) {
    let [lon, lat] = ring[index];
    const previousLon = unwrapped[index - 1][0];

    while (lon - previousLon > 180) {
      lon -= 360;
    }
    while (lon - previousLon < -180) {
      lon += 360;
    }

    unwrapped.push([lon, lat]);
  }

  return unwrapped;
};

const drawMaskRing = (ctx, ring, shift = 0) => {
  ring.forEach(([lon, lat], index) => {
    const x = ((lon + shift + 180) / 360) * (MASK_WIDTH - 1);
    const y = ((90 - lat) / 180) * (MASK_HEIGHT - 1);
    if (index === 0) {
      ctx.moveTo(x, y);
      return;
    }
    ctx.lineTo(x, y);
  });
  ctx.closePath();
};

const createLandMask = (geojson) => {
  const canvas = document.createElement("canvas");
  canvas.width = MASK_WIDTH;
  canvas.height = MASK_HEIGHT;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return null;
  }

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, MASK_WIDTH, MASK_HEIGHT);
  ctx.fillStyle = "#fff";

  const drawPolygon = (ring) => {
    if (!ring?.length) {
      return;
    }
    const unwrapped = unwrapRing(ring.map(([lon, lat]) => [normalizeLongitude(lon), lat]));
    [-360, 0, 360].forEach((shift) => {
      ctx.beginPath();
      drawMaskRing(ctx, unwrapped, shift);
      ctx.fill();
    });
  };

  geojson.features?.forEach((feature) => {
    const geometry = feature?.geometry;
    if (geometry?.type === "Polygon") {
      drawPolygon(geometry.coordinates[0]);
    }
    if (geometry?.type === "MultiPolygon") {
      geometry.coordinates.forEach((polygon) => drawPolygon(polygon[0]));
    }
  });

  return { data: ctx.getImageData(0, 0, MASK_WIDTH, MASK_HEIGHT).data, width: MASK_WIDTH, height: MASK_HEIGHT };
};

const geoToVector = (lat, lon) => {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  const cosLat = Math.cos(latRad);
  return [cosLat * Math.cos(lonRad), Math.sin(latRad), -cosLat * Math.sin(lonRad)];
};

const buildSphere = (size) => {
  const center = size * 0.5;
  const radius = size * 0.44;
  const samples = [];

  for (let y = 0; y < size; y += 1) {
    const yN = (y + 0.5 - center) / radius;
    for (let x = 0; x < size; x += 1) {
      const xN = (x + 0.5 - center) / radius;
      const radialSq = xN * xN + yN * yN;
      if (radialSq > 1) {
        continue;
      }
      samples.push({ x, y, vector: [xN, -yN, Math.sqrt(1 - radialSq)] });
    }
  }

  return { size, center, radius, samples };
};

let maskPromise;
const loadLandMask = () => {
  if (!maskPromise) {
    maskPromise = fetch("/data/ne_110m_land.geojson")
      .then((response) => (response.ok ? response.json() : { features: [] }))
      .then(createLandMask)
      .catch(() => null);
  }
  return maskPromise;
};

export const setupInteractiveGlobe = () => {
  const globe = document.querySelector("#hero-globe");
  if (!globe) {
    return;
  }

  const ctx = globe.getContext("2d", { alpha: true });
  if (!ctx) {
    return;
  }

  const torontoVector = geoToVector(TORONTO.lat, TORONTO.lon);
  let landMask = null;
  let sphere = buildSphere(globe.clientWidth || 248);
  let frame = null;

  let yaw = -0.4;
  let pitch = 0.05;
  let velocity = 0.005;
  let dragId = null;
  let dragX = 0;
  let dragY = 0;

  const resize = () => {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const cssSize = Math.max(140, Math.round(globe.clientWidth || 248));
    const pixelSize = Math.round(cssSize * dpr);
    globe.width = pixelSize;
    globe.height = pixelSize;
    sphere = buildSphere(pixelSize);
    frame = ctx.createImageData(pixelSize, pixelSize);
  };

  const draw = () => {
    const { center, radius, samples, size } = sphere;
    const styles = getComputedStyle(document.documentElement);
    const line = styles.getPropertyValue("--line").trim();
    const text = styles.getPropertyValue("--text").trim();

    ctx.clearRect(0, 0, size, size);
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, TAU);
    ctx.fillStyle = `${line}78`;
    ctx.fill();

    if (landMask && frame) {
      const cosInvYaw = Math.cos(-yaw);
      const sinInvYaw = Math.sin(-yaw);
      const cosInvPitch = Math.cos(-pitch);
      const sinInvPitch = Math.sin(-pitch);
      const data = frame.data;

      const ocean = [25, 25, 25, 170];
      const land = [220, 220, 220, 214];

      samples.forEach(({ x, y, vector }) => {
        let rotated = rotateX(vector, cosInvPitch, sinInvPitch);
        rotated = rotateY(rotated, cosInvYaw, sinInvYaw);

        const lon = Math.atan2(-rotated[2], rotated[0]);
        const lat = Math.asin(rotated[1]);
        const u = ((lon + Math.PI) / TAU) * (landMask.width - 1);
        const v = ((Math.PI / 2 - lat) / Math.PI) * (landMask.height - 1);

        const maskIndex = ((Math.floor(v) * landMask.width) + Math.floor(u)) * 4;
        const [r, g, b, a] = landMask.data[maskIndex] > 120 ? land : ocean;

        const pixelIndex = (y * size + x) * 4;
        data[pixelIndex] = r;
        data[pixelIndex + 1] = g;
        data[pixelIndex + 2] = b;
        data[pixelIndex + 3] = a;
      });

      ctx.putImageData(frame, 0, 0);

      let marker = rotateY(torontoVector, Math.cos(yaw), Math.sin(yaw));
      marker = rotateX(marker, Math.cos(pitch), Math.sin(pitch));
      if (marker[2] > 0) {
        const markerX = center + marker[0] * radius;
        const markerY = center - marker[1] * radius;
        const markerSize = Math.max(2, radius * 0.025);

        ctx.beginPath();
        ctx.arc(markerX, markerY, markerSize * 1.85, 0, TAU);
        ctx.strokeStyle = `${text}88`;
        ctx.lineWidth = Math.max(1, (window.devicePixelRatio || 1) * 0.85);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(markerX, markerY, markerSize, 0, TAU);
        ctx.fillStyle = TORONTO_COLOR;
        ctx.fill();
      }
    }

    ctx.beginPath();
    ctx.arc(center, center, radius * 0.99, 0, TAU);
    ctx.strokeStyle = `${text}55`;
    ctx.lineWidth = Math.max(1, window.devicePixelRatio || 1);
    ctx.stroke();
  };

  const tick = () => {
    yaw += velocity;
    velocity *= 0.986;
    if (Math.abs(velocity) < 0.00035) {
      velocity = 0.00035;
    }
    draw();
    window.requestAnimationFrame(tick);
  };

  const onPointerDown = (event) => {
    dragId = event.pointerId;
    dragX = event.clientX;
    dragY = event.clientY;
    velocity = 0;
    globe.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event) => {
    if (dragId !== event.pointerId) {
      return;
    }
    const deltaX = event.clientX - dragX;
    const deltaY = event.clientY - dragY;
    dragX = event.clientX;
    dragY = event.clientY;
    yaw += deltaX * 0.012;
    pitch = clamp(pitch + deltaY * 0.008, -1.3, 1.3);
    velocity = deltaX * 0.00075;
    draw();
  };

  const onPointerUp = (event) => {
    if (dragId !== event.pointerId) {
      return;
    }
    dragId = null;
    globe.releasePointerCapture(event.pointerId);
  };

  loadLandMask().then((mask) => {
    landMask = mask;
    resize();
    draw();

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.requestAnimationFrame(tick);
    }
  });

  window.addEventListener("resize", resize);
  globe.addEventListener("pointerdown", onPointerDown);
  globe.addEventListener("pointermove", onPointerMove);
  globe.addEventListener("pointerup", onPointerUp);
  globe.addEventListener("pointercancel", onPointerUp);
};
