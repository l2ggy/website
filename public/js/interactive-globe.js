const TAU = Math.PI * 2;
const MASK_SIZE = { width: 720, height: 360 };
const TORONTO = { lat: 43.6532, lon: -79.3832 };
const TORONTO_PIN = "#1E3765";

const normalizeLongitude = (lon) => ((lon + 180) % 360 + 360) % 360 - 180;

const unwrapRing = (ring) => {
  if (!ring.length) {
    return [];
  }

  const unwrapped = [[ring[0][0], ring[0][1]]];
  for (let index = 1; index < ring.length; index += 1) {
    const [lon, lat] = ring[index];
    let nextLon = lon;
    const previousLon = unwrapped[index - 1][0];

    while (nextLon - previousLon > 180) {
      nextLon -= 360;
    }
    while (nextLon - previousLon < -180) {
      nextLon += 360;
    }

    unwrapped.push([nextLon, lat]);
  }

  return unwrapped;
};

const drawRing = (ctx, ring, shift) => {
  ring.forEach(([lon, lat], index) => {
    const x = ((lon + shift + 180) / 360) * (MASK_SIZE.width - 1);
    const y = ((90 - lat) / 180) * (MASK_SIZE.height - 1);

    if (index === 0) {
      ctx.moveTo(x, y);
      return;
    }

    ctx.lineTo(x, y);
  });
  ctx.closePath();
};

const buildLandMask = (geojson) => {
  const canvas = document.createElement("canvas");
  canvas.width = MASK_SIZE.width;
  canvas.height = MASK_SIZE.height;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return null;
  }

  context.fillStyle = "#000";
  context.fillRect(0, 0, MASK_SIZE.width, MASK_SIZE.height);
  context.fillStyle = "#fff";

  const drawPolygon = (outerRing) => {
    if (!outerRing?.length) {
      return;
    }

    const unwrapped = unwrapRing(outerRing.map(([lon, lat]) => [normalizeLongitude(lon), lat]));
    [-360, 0, 360].forEach((shift) => {
      context.beginPath();
      drawRing(context, unwrapped, shift);
      context.fill();
    });
  };

  geojson.features?.forEach(({ geometry }) => {
    if (!geometry) {
      return;
    }

    if (geometry.type === "Polygon") {
      drawPolygon(geometry.coordinates[0]);
      return;
    }

    if (geometry.type === "MultiPolygon") {
      geometry.coordinates.forEach((polygon) => drawPolygon(polygon[0]));
    }
  });

  return {
    data: context.getImageData(0, 0, MASK_SIZE.width, MASK_SIZE.height).data,
    width: MASK_SIZE.width,
    height: MASK_SIZE.height
  };
};

const rotateY = ([x, y, z], cos, sin) => [x * cos + z * sin, y, -x * sin + z * cos];
const rotateX = ([x, y, z], cos, sin) => [x, y * cos - z * sin, y * sin + z * cos];

const geoToVector = (lat, lon) => {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  const cosLat = Math.cos(latRad);
  return [cosLat * Math.cos(lonRad), Math.sin(latRad), -cosLat * Math.sin(lonRad)];
};

const buildSphereSamples = (size) => {
  const center = size * 0.5;
  const radius = size * 0.44;
  const samples = [];

  for (let y = 0; y < size; y += 1) {
    const ny = (y + 0.5 - center) / radius;
    for (let x = 0; x < size; x += 1) {
      const nx = (x + 0.5 - center) / radius;
      const radial = nx * nx + ny * ny;
      if (radial > 1) {
        continue;
      }
      samples.push({ x, y, vector: [nx, -ny, Math.sqrt(1 - radial)] });
    }
  }

  return { size, center, radius, samples };
};

let landMaskPromise;
const loadLandMask = () => {
  if (!landMaskPromise) {
    landMaskPromise = fetch("/data/ne_110m_land.geojson")
      .then((response) => (response.ok ? response.json() : { features: [] }))
      .then(buildLandMask)
      .catch(() => null);
  }

  return landMaskPromise;
};

export const setupInteractiveGlobe = () => {
  const canvas = document.querySelector("#hero-globe");
  if (!canvas) {
    return;
  }

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) {
    return;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const torontoVector = geoToVector(TORONTO.lat, TORONTO.lon);

  let yaw = -0.4;
  let pitch = 0.05;
  let velocity = 0.005;
  let dragPointerId = null;
  let dragX = 0;
  let dragY = 0;
  let sphere = buildSphereSamples(canvas.clientWidth || 248);
  let frameBuffer = ctx.createImageData(sphere.size, sphere.size);
  let landMask = null;

  const resize = () => {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const cssSize = Math.max(120, Math.round(canvas.clientWidth || 248));
    const pixelSize = Math.round(cssSize * dpr);

    canvas.width = pixelSize;
    canvas.height = pixelSize;
    sphere = buildSphereSamples(pixelSize);
    frameBuffer = ctx.createImageData(pixelSize, pixelSize);
  };

  const draw = () => {
    const styles = getComputedStyle(document.documentElement);
    const text = styles.getPropertyValue("--text").trim();
    const line = styles.getPropertyValue("--line").trim();
    const { center, radius, size, samples } = sphere;

    ctx.clearRect(0, 0, size, size);
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, TAU);
    ctx.fillStyle = `${line}78`;
    ctx.fill();

    if (landMask) {
      const cosYaw = Math.cos(-yaw);
      const sinYaw = Math.sin(-yaw);
      const cosPitch = Math.cos(-pitch);
      const sinPitch = Math.sin(-pitch);
      const output = frameBuffer.data;

      output.fill(0);
      samples.forEach(({ x, y, vector }) => {
        let rotated = rotateX(vector, cosPitch, sinPitch);
        rotated = rotateY(rotated, cosYaw, sinYaw);

        const lon = Math.atan2(-rotated[2], rotated[0]);
        const lat = Math.asin(rotated[1]);
        const u = ((lon + Math.PI) / TAU) * (landMask.width - 1);
        const v = ((Math.PI / 2 - lat) / Math.PI) * (landMask.height - 1);
        const landIndex = ((Math.floor(v) * landMask.width) + Math.floor(u)) * 4;
        const isLand = landMask.data[landIndex] > 120;

        const offset = (y * size + x) * 4;
        if (isLand) {
          output[offset] = 220;
          output[offset + 1] = 220;
          output[offset + 2] = 220;
          output[offset + 3] = 214;
          return;
        }

        output[offset] = 25;
        output[offset + 1] = 25;
        output[offset + 2] = 25;
        output[offset + 3] = 170;
      });

      ctx.putImageData(frameBuffer, 0, 0);

      let marker = rotateY(torontoVector, Math.cos(yaw), Math.sin(yaw));
      marker = rotateX(marker, Math.cos(pitch), Math.sin(pitch));
      if (marker[2] > 0) {
        const pinX = center + marker[0] * radius;
        const pinY = center - marker[1] * radius;
        const pinRadius = Math.max(2, radius * 0.025);

        ctx.beginPath();
        ctx.arc(pinX, pinY, pinRadius * 2, 0, TAU);
        ctx.strokeStyle = `${TORONTO_PIN}b8`;
        ctx.lineWidth = Math.max(1, window.devicePixelRatio || 1);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(pinX, pinY, pinRadius, 0, TAU);
        ctx.fillStyle = TORONTO_PIN;
        ctx.fill();
      }
    }

    ctx.beginPath();
    ctx.arc(center, center, radius * 0.99, 0, TAU);
    ctx.strokeStyle = `${text}55`;
    ctx.lineWidth = Math.max(1, window.devicePixelRatio || 1);
    ctx.stroke();
  };

  const animate = () => {
    yaw += velocity;
    velocity *= 0.986;
    if (Math.abs(velocity) < 0.00035) {
      velocity = 0.00035;
    }
    draw();
    window.requestAnimationFrame(animate);
  };

  const onPointerDown = (event) => {
    dragPointerId = event.pointerId;
    dragX = event.clientX;
    dragY = event.clientY;
    velocity = 0;
    canvas.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event) => {
    if (dragPointerId !== event.pointerId) {
      return;
    }

    const dx = event.clientX - dragX;
    const dy = event.clientY - dragY;
    dragX = event.clientX;
    dragY = event.clientY;

    yaw += dx * 0.012;
    pitch = Math.max(-1.3, Math.min(1.3, pitch + dy * 0.008));
    velocity = dx * 0.00075;
    draw();
  };

  const onPointerUp = (event) => {
    if (dragPointerId !== event.pointerId) {
      return;
    }

    dragPointerId = null;
    canvas.releasePointerCapture(event.pointerId);
  };

  loadLandMask().then((mask) => {
    landMask = mask;
    resize();
    draw();

    if (!prefersReducedMotion.matches) {
      window.requestAnimationFrame(animate);
    }
  });

  window.addEventListener("resize", resize);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
};
