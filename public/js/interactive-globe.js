const TAU = Math.PI * 2;
const MASK_WIDTH = 720;
const MASK_HEIGHT = 360;

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
    let adjustedLon = lon;
    const previousLon = unwrapped[index - 1][0];

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
    const x = ((lon + shift + 180) / 360) * MASK_WIDTH;
    const y = ((90 - lat) / 180) * MASK_HEIGHT;

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

  context.clearRect(0, 0, MASK_WIDTH, MASK_HEIGHT);
  context.fillStyle = "#000";
  context.fillRect(0, 0, MASK_WIDTH, MASK_HEIGHT);
  context.fillStyle = "#fff";

  const drawPolygon = (rings) => {
    if (!rings.length) {
      return;
    }

    context.beginPath();
    rings.forEach((ring) => {
      const normalized = ring.map(([lon, lat]) => [normalizeLongitude(lon), lat]);
      const unwrapped = unwrapRing(normalized);
      drawRing(context, unwrapped, 0);
      drawRing(context, unwrapped, -360);
      drawRing(context, unwrapped, 360);
    });
    context.fill();
  };

  geojson.features?.forEach((feature) => {
    const geometry = feature?.geometry;
    if (!geometry) {
      return;
    }

    if (geometry.type === "Polygon") {
      drawPolygon(geometry.coordinates);
      return;
    }

    if (geometry.type === "MultiPolygon") {
      geometry.coordinates.forEach((polygon) => drawPolygon(polygon));
    }
  });

  const imageData = context.getImageData(0, 0, MASK_WIDTH, MASK_HEIGHT).data;
  return { imageData, width: MASK_WIDTH, height: MASK_HEIGHT };
};

const rotateY = ([x, y, z], cos, sin) => [x * cos + z * sin, y, -x * sin + z * cos];

const rotateX = ([x, y, z], cos, sin) => [x, y * cos - z * sin, y * sin + z * cos];

const buildSphereSamples = (size) => {
  const center = size * 0.5;
  const radius = size * 0.44;
  const samples = [];

  for (let y = 0; y < size; y += 1) {
    const yN = (center - (y + 0.5)) / radius;
    for (let x = 0; x < size; x += 1) {
      const xN = (x + 0.5 - center) / radius;
      const radialSq = xN * xN + yN * yN;
      if (radialSq > 1) {
        continue;
      }

      const zN = Math.sqrt(1 - radialSq);
      samples.push({
        x,
        y,
        vector: [xN, yN, zN]
      });
    }
  }

  return { radius, center, samples, size };
};

let landMaskPromise;
const loadLandMask = () => {
  if (landMaskPromise) {
    return landMaskPromise;
  }

  landMaskPromise = fetch("/data/ne_110m_land.geojson")
    .then((response) => (response.ok ? response.json() : { features: [] }))
    .then((geojson) => createLandMask(geojson))
    .catch(() => null);

  return landMaskPromise;
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

  let yaw = -0.4;
  let pitch = 0.05;
  let velocity = 0.005;
  let dragId = null;
  let dragX = 0;
  let dragY = 0;
  let rafId = 0;
  let landMask = null;
  let sphere = buildSphereSamples(globe.clientWidth || 188);
  const renderCanvas = document.createElement("canvas");
  const renderContext = renderCanvas.getContext("2d");
  if (!renderContext) {
    return;
  }

  const updateSize = () => {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const size = Math.max(120, Math.round(globe.clientWidth || 188));
    globe.width = Math.round(size * dpr);
    globe.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderCanvas.width = size;
    renderCanvas.height = size;
    sphere = buildSphereSamples(size);
  };

  const draw = () => {
    const styles = getComputedStyle(document.documentElement);
    const text = styles.getPropertyValue("--text").trim();
    const line = styles.getPropertyValue("--line").trim();
    const { center, radius, samples, size } = sphere;

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

      const output = renderContext?.createImageData(size, size);
      if (!output) {
        return;
      }
      const outputData = output.data;

      const ocean = [25, 25, 25, 170];
      const land = [220, 220, 220, 214];

      samples.forEach(({ x, y, vector }) => {
        let rotated = rotateX(vector, cosPitch, sinPitch);
        rotated = rotateY(rotated, cosYaw, sinYaw);

        const lon = Math.atan2(rotated[2], rotated[0]);
        const lat = Math.asin(rotated[1]);

        const u = ((lon + Math.PI) / TAU) * (landMask.width - 1);
        const v = ((Math.PI / 2 - lat) / Math.PI) * (landMask.height - 1);

        const maskIndex = ((Math.floor(v) * landMask.width) + Math.floor(u)) * 4;
        const isLand = landMask.imageData[maskIndex] > 120;
        const [r, g, b, a] = isLand ? land : ocean;

        const pixelIndex = (y * size + x) * 4;
        outputData[pixelIndex] = r;
        outputData[pixelIndex + 1] = g;
        outputData[pixelIndex + 2] = b;
        outputData[pixelIndex + 3] = a;
      });

      renderContext.putImageData(output, 0, 0);
      ctx.drawImage(renderCanvas, 0, 0, size, size);
    }

    ctx.beginPath();
    ctx.arc(center, center, radius * 0.99, 0, TAU);
    ctx.strokeStyle = `${text}55`;
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  const tick = () => {
    yaw += velocity;
    velocity *= 0.986;
    if (Math.abs(velocity) < 0.00035) {
      velocity = 0.00035;
    }
    draw();
    rafId = window.requestAnimationFrame(tick);
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
    pitch = Math.max(-1.3, Math.min(1.3, pitch - deltaY * 0.008));
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

  const media = window.matchMedia("(prefers-reduced-motion: reduce)");

  loadLandMask().then((mask) => {
    landMask = mask;
    updateSize();
    draw();

    if (!media.matches) {
      rafId = window.requestAnimationFrame(tick);
    }
  });

  window.addEventListener("resize", updateSize);
  globe.addEventListener("pointerdown", onPointerDown);
  globe.addEventListener("pointermove", onPointerMove);
  globe.addEventListener("pointerup", onPointerUp);
  globe.addEventListener("pointercancel", onPointerUp);
};
