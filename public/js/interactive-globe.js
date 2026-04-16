const TAU = Math.PI * 2;
const MASK_WIDTH = 720;
const MASK_HEIGHT = 360;
const HOME_MARKER = { lat: 43.65, lon: -79.38 };
const HOME_MARKER_COLOR = "#1E3765";
const VISITOR_MARKER_COLOR = "#B5744A";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const normalizeLongitude = (lon) => {
  const wrapped = ((lon + 180) % 360 + 360) % 360;
  return wrapped - 180;
};

const unwrapRing = (ring) => {
  if (!ring.length) {
    return [];
  }

  const unwrapped = [[ring[0][0], ring[0][1]]];
  for (let index = 1; index < ring.length; index += 1) {
    const [lon, lat] = ring[index];
    const previousLon = unwrapped[index - 1][0];
    let adjustedLon = lon;

    while (adjustedLon - previousLon > 180) {
      adjustedLon -= 360;
    }
    while (adjustedLon - previousLon < -180) {
      adjustedLon += 360;
    }

    unwrapped.push([adjustedLon, lat]);
  }

  return unwrapped;
};

const drawRing = (ctx, ring, shift = 0) => {
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
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return null;
  }

  context.fillStyle = "#000";
  context.fillRect(0, 0, MASK_WIDTH, MASK_HEIGHT);
  context.fillStyle = "#fff";

  const fillOuterRing = (ring) => {
    if (!ring?.length) {
      return;
    }

    const normalized = ring.map(([lon, lat]) => [normalizeLongitude(lon), lat]);
    const unwrapped = unwrapRing(normalized);
    [-360, 0, 360].forEach((shift) => {
      context.beginPath();
      drawRing(context, unwrapped, shift);
      context.fill();
    });
  };

  geojson.features?.forEach((feature) => {
    const geometry = feature?.geometry;
    if (!geometry) {
      return;
    }

    if (geometry.type === "Polygon") {
      fillOuterRing(geometry.coordinates[0]);
    } else if (geometry.type === "MultiPolygon") {
      geometry.coordinates.forEach((polygon) => fillOuterRing(polygon[0]));
    }
  });

  return {
    data: context.getImageData(0, 0, MASK_WIDTH, MASK_HEIGHT).data,
    width: MASK_WIDTH,
    height: MASK_HEIGHT
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

let landMaskPromise;
const loadLandMask = () => {
  if (!landMaskPromise) {
    landMaskPromise = fetch("/data/ne_110m_land.geojson")
      .then((response) => (response.ok ? response.json() : { features: [] }))
      .then(createLandMask)
      .catch(() => null);
  }
  return landMaskPromise;
};

const renderMarkers = (ctx, center, radius, yaw, pitch, dpr, markers) => {
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);

  markers.forEach((marker) => {
    const markerVector = geoToVector(marker.lat, marker.lon);
    let rotated = rotateY(markerVector, cosYaw, sinYaw);
    rotated = rotateX(rotated, cosPitch, sinPitch);
    if (rotated[2] <= 0) {
      return;
    }

    const x = center + rotated[0] * radius;
    const y = center - rotated[1] * radius;
    const weight = Number.isFinite(marker.count) ? marker.count : 1;
    const dot = marker.isHome
      ? Math.max(2.8, radius * 0.022)
      : Math.max(1.4, radius * (0.012 + Math.min(weight, 12) * 0.0016));

    if (marker.isHome) {
      ctx.beginPath();
      ctx.arc(x, y, dot * 1.8, 0, TAU);
      ctx.strokeStyle = `${HOME_MARKER_COLOR}b8`;
      ctx.lineWidth = Math.max(1, dpr * 0.9);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(x, y, dot, 0, TAU);
    ctx.fillStyle = marker.isHome ? HOME_MARKER_COLOR : VISITOR_MARKER_COLOR;
    ctx.fill();
  });
};

export const setupInteractiveGlobe = (markers = []) => {
  const globe = document.querySelector("#hero-globe");
  if (!globe) {
    return;
  }
  const safeMarkers = markers.filter(
    (marker) => Number.isFinite(marker?.lat) && Number.isFinite(marker?.lon),
  );
  const renderableMarkers = [...safeMarkers, { ...HOME_MARKER, isHome: true }];

  const ctx = globe.getContext("2d", { alpha: true });
  if (!ctx) {
    return;
  }

  let yaw = -0.4;
  let pitch = 0.05;
  let velocity = 0.005;
  let isAnimating = true;
  let pointerId = null;
  let previousX = 0;
  let previousY = 0;
  let dpr = Math.max(1, window.devicePixelRatio || 1);
  let sphere = buildSphereSamples(globe.clientWidth || 248);
  let landMask = null;

  const updateSize = () => {
    dpr = Math.max(1, window.devicePixelRatio || 1);
    const cssSize = Math.max(140, Math.round(globe.clientWidth || 248));
    const pixelSize = Math.round(cssSize * dpr);
    globe.width = pixelSize;
    globe.height = pixelSize;
    sphere = buildSphereSamples(pixelSize);
  };

  const draw = () => {
    const styles = getComputedStyle(document.documentElement);
    const line = styles.getPropertyValue("--line").trim();
    const text = styles.getPropertyValue("--text").trim();
    const { size, center, radius, samples } = sphere;

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
      const output = ctx.createImageData(size, size);

      samples.forEach(({ x, y, vector }) => {
        let rotated = rotateX(vector, cosPitch, sinPitch);
        rotated = rotateY(rotated, cosYaw, sinYaw);

        const lon = Math.atan2(-rotated[2], rotated[0]);
        const lat = Math.asin(rotated[1]);
        const u = ((lon + Math.PI) / TAU) * (landMask.width - 1);
        const v = ((Math.PI / 2 - lat) / Math.PI) * (landMask.height - 1);

        const maskIndex = ((Math.floor(v) * landMask.width) + Math.floor(u)) * 4;
        const isLand = landMask.data[maskIndex] > 120;
        const pixelIndex = (y * size + x) * 4;

        output.data[pixelIndex] = isLand ? 220 : 25;
        output.data[pixelIndex + 1] = isLand ? 220 : 25;
        output.data[pixelIndex + 2] = isLand ? 220 : 25;
        output.data[pixelIndex + 3] = isLand ? 214 : 170;
      });

      ctx.putImageData(output, 0, 0);
      renderMarkers(ctx, center, radius, yaw, pitch, dpr, renderableMarkers);
    }

    ctx.beginPath();
    ctx.arc(center, center, radius * 0.99, 0, TAU);
    ctx.strokeStyle = `${text}55`;
    ctx.lineWidth = Math.max(1, dpr);
    ctx.stroke();
  };

  const onFrame = () => {
    yaw += velocity;
    velocity *= 0.986;
    if (Math.abs(velocity) < 0.00035) {
      velocity = 0.00035;
    }
    draw();
    window.requestAnimationFrame(onFrame);
  };

  const onPointerDown = (event) => {
    event.preventDefault();
    pointerId = event.pointerId;
    previousX = event.clientX;
    previousY = event.clientY;
    velocity = 0;
    document.body.classList.add("is-globe-dragging");
    globe.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event) => {
    if (event.pointerId !== pointerId) {
      return;
    }
    event.preventDefault();

    const deltaX = event.clientX - previousX;
    const deltaY = event.clientY - previousY;
    previousX = event.clientX;
    previousY = event.clientY;

    const dragScale = event.pointerType === "touch" ? 0.016 : 0.012;
    const pitchScale = event.pointerType === "touch" ? 0.011 : 0.008;

    yaw += deltaX * dragScale;
    pitch = clamp(pitch + deltaY * pitchScale, -1.3, 1.3);
    velocity = deltaX * 0.00075;

    if (!isAnimating) {
      draw();
    }
  };

  const onPointerUp = (event) => {
    if (event.pointerId !== pointerId) {
      return;
    }
    pointerId = null;
    document.body.classList.remove("is-globe-dragging");
    globe.releasePointerCapture(event.pointerId);
  };

  const start = () => {
    updateSize();
    draw();

    isAnimating = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isAnimating) {
      window.requestAnimationFrame(onFrame);
    }
  };

  loadLandMask().then((mask) => {
    landMask = mask;
    start();
  });

  window.addEventListener("resize", updateSize);
  globe.addEventListener("pointerdown", onPointerDown);
  globe.addEventListener("pointermove", onPointerMove);
  globe.addEventListener("pointerup", onPointerUp);
  globe.addEventListener("pointercancel", onPointerUp);
  globe.addEventListener("dragstart", (event) => event.preventDefault());
};
