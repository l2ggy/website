const TAU = Math.PI * 2;
const MASK_WIDTH = 360;
const MASK_HEIGHT = 180;

const normalizeLongitude = (lon) => {
  const wrapped = ((lon + 180) % 360 + 360) % 360;
  return wrapped - 180;
};

const rotateY = ([x, y, z], angle) => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [x * cos + z * sin, y, -x * sin + z * cos];
};

const rotateX = ([x, y, z], angle) => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [x, y * cos - z * sin, y * sin + z * cos];
};

const pointInRing = (lon, lat, ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
};

const extractPolygons = (geojson) => {
  if (!geojson || !Array.isArray(geojson.features)) {
    return [];
  }

  return geojson.features.flatMap((feature) => {
    const geometry = feature?.geometry;
    if (!geometry) {
      return [];
    }

    if (geometry.type === "Polygon") {
      return [geometry.coordinates];
    }

    if (geometry.type === "MultiPolygon") {
      return geometry.coordinates;
    }

    return [];
  }).map((polygon) => ({
    outer: polygon[0].map(([lon, lat]) => [normalizeLongitude(lon), lat]),
    holes: polygon.slice(1).map((ring) => ring.map(([lon, lat]) => [normalizeLongitude(lon), lat]))
  }));
};

const pointInPolygon = (lon, lat, polygon) => {
  if (!pointInRing(lon, lat, polygon.outer)) {
    return false;
  }
  return !polygon.holes.some((hole) => pointInRing(lon, lat, hole));
};

const buildLandMask = (polygons) => {
  const mask = new Uint8Array(MASK_WIDTH * MASK_HEIGHT);

  for (let y = 0; y < MASK_HEIGHT; y += 1) {
    const lat = 90 - ((y + 0.5) / MASK_HEIGHT) * 180;
    for (let x = 0; x < MASK_WIDTH; x += 1) {
      const lon = ((x + 0.5) / MASK_WIDTH) * 360 - 180;
      const isLand = polygons.some((polygon) => pointInPolygon(lon, lat, polygon));
      mask[y * MASK_WIDTH + x] = isLand ? 1 : 0;
    }
  }

  return mask;
};

let landMaskPromise;
const loadLandMask = () => {
  if (landMaskPromise) {
    return landMaskPromise;
  }

  landMaskPromise = fetch("/data/ne_110m_land.geojson")
    .then((response) => (response.ok ? response.json() : { features: [] }))
    .then((geojson) => buildLandMask(extractPolygons(geojson)))
    .catch(() => new Uint8Array(MASK_WIDTH * MASK_HEIGHT));

  return landMaskPromise;
};

const colorFromHex = (hex) => {
  const value = hex.trim().replace("#", "");
  if (value.length !== 6) {
    return { r: 127, g: 127, b: 127 };
  }

  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16)
  };
};

const shade = (color, factor) => ({
  r: Math.round(color.r * factor),
  g: Math.round(color.g * factor),
  b: Math.round(color.b * factor)
});

export const setupInteractiveGlobe = () => {
  const globe = document.querySelector("#hero-globe");
  if (!globe) {
    return;
  }

  const ctx = globe.getContext("2d", { alpha: true });
  if (!ctx) {
    return;
  }

  let yaw = -1.42;
  let pitch = 0.08;
  let velocity = 0.006;
  let dragId = null;
  let dragX = 0;
  let dragY = 0;
  let landMask = new Uint8Array(MASK_WIDTH * MASK_HEIGHT);
  let buffer = null;
  let bufferData = null;
  let cssSize = 188;

  const updateSize = () => {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    cssSize = Math.round(globe.clientWidth || 188);
    globe.width = Math.round(cssSize * dpr);
    globe.height = Math.round(cssSize * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buffer = ctx.createImageData(cssSize, cssSize);
    bufferData = buffer.data;
  };

  const draw = () => {
    if (!buffer || !bufferData) {
      return;
    }

    const styles = getComputedStyle(document.documentElement);
    const textColor = colorFromHex(styles.getPropertyValue("--text"));
    const lineColor = colorFromHex(styles.getPropertyValue("--line"));
    const oceanBase = shade(lineColor, 1.12);
    const landBase = shade(textColor, 0.95);

    bufferData.fill(0);

    const center = cssSize * 0.5;
    const radius = cssSize * 0.44;
    const light = [-0.35, -0.15, 0.92];

    for (let py = 0; py < cssSize; py += 1) {
      for (let px = 0; px < cssSize; px += 1) {
        const nx = (px + 0.5 - center) / radius;
        const ny = (py + 0.5 - center) / radius;
        const distanceSquared = nx * nx + ny * ny;
        if (distanceSquared > 1) {
          continue;
        }

        const nz = Math.sqrt(1 - distanceSquared);
        let globePoint = [nx, ny, nz];
        globePoint = rotateX(globePoint, -pitch);
        globePoint = rotateY(globePoint, -yaw);

        const lat = (Math.asin(globePoint[1]) * 180) / Math.PI;
        const lon = (Math.atan2(globePoint[2], globePoint[0]) * 180) / Math.PI;
        const maskX = Math.max(0, Math.min(MASK_WIDTH - 1, Math.floor(((lon + 180) / 360) * MASK_WIDTH)));
        const maskY = Math.max(0, Math.min(MASK_HEIGHT - 1, Math.floor(((90 - lat) / 180) * MASK_HEIGHT)));
        const isLand = landMask[maskY * MASK_WIDTH + maskX] === 1;

        const lightStrength = Math.max(0.58, Math.min(1.12, nx * light[0] + ny * light[1] + nz * light[2] + 0.16));
        const base = isLand ? landBase : oceanBase;

        const index = (py * cssSize + px) * 4;
        bufferData[index] = Math.min(255, Math.round(base.r * lightStrength));
        bufferData[index + 1] = Math.min(255, Math.round(base.g * lightStrength));
        bufferData[index + 2] = Math.min(255, Math.round(base.b * lightStrength));
        bufferData[index + 3] = 255;
      }
    }

    ctx.clearRect(0, 0, cssSize, cssSize);
    ctx.putImageData(buffer, 0, 0);

    ctx.beginPath();
    ctx.arc(center, center, radius, 0, TAU);
    ctx.strokeStyle = `${styles.getPropertyValue("--line").trim()}cc`;
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  const tick = () => {
    yaw += velocity;
    velocity *= 0.986;
    if (Math.abs(velocity) < 0.0003) {
      velocity = 0.0003;
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

    yaw += deltaX * 0.01;
    pitch = Math.max(-1.25, Math.min(1.25, pitch - deltaY * 0.008));
    velocity = deltaX * 0.0007;
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
  const start = () => {
    updateSize();
    draw();
    if (!media.matches) {
      window.requestAnimationFrame(tick);
    }
  };

  loadLandMask().then((mask) => {
    landMask = mask;
    start();
  });

  window.addEventListener("resize", () => {
    updateSize();
    draw();
  });
  globe.addEventListener("pointerdown", onPointerDown);
  globe.addEventListener("pointermove", onPointerMove);
  globe.addEventListener("pointerup", onPointerUp);
  globe.addEventListener("pointercancel", onPointerUp);
};
