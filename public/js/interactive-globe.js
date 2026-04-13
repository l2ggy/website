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

const ringBounds = (ring) => {
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  ring.forEach(([lon, lat]) => {
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  });

  return { minLon, maxLon, minLat, maxLat };
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

  return geojson.features
    .flatMap((feature) => {
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
    })
    .map((polygon) => {
      const outer = polygon[0]?.map(([lon, lat]) => [normalizeLongitude(lon), lat]);
      if (!outer || outer.length < 3) {
        return null;
      }

      return {
        outer,
        holes: polygon.slice(1).map((ring) => ring.map(([lon, lat]) => [normalizeLongitude(lon), lat])),
        bounds: ringBounds(outer)
      };
    })
    .filter(Boolean);
};

const pointInPolygon = (lon, lat, polygon) => {
  const { minLon, maxLon, minLat, maxLat } = polygon.bounds;
  if (lon < minLon || lon > maxLon || lat < minLat || lat > maxLat) {
    return false;
  }

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
      const lon = -180 + ((x + 0.5) / MASK_WIDTH) * 360;
      const isLand = polygons.some((polygon) => pointInPolygon(lon, lat, polygon));
      mask[y * MASK_WIDTH + x] = isLand ? 1 : 0;
    }
  }

  return mask;
};

const parseHexColor = (value) => {
  const hex = value.trim();
  if (!hex.startsWith("#")) {
    return [140, 140, 140];
  }

  if (hex.length === 4) {
    return hex
      .slice(1)
      .split("")
      .map((part) => Number.parseInt(part + part, 16));
  }

  if (hex.length >= 7) {
    return [
      Number.parseInt(hex.slice(1, 3), 16),
      Number.parseInt(hex.slice(3, 5), 16),
      Number.parseInt(hex.slice(5, 7), 16)
    ];
  }

  return [140, 140, 140];
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

export const setupInteractiveGlobe = () => {
  const globe = document.querySelector("#hero-globe");
  if (!globe) {
    return;
  }

  const ctx = globe.getContext("2d", { alpha: true });
  if (!ctx) {
    return;
  }

  let yaw = 0;
  let pitch = 0.35;
  let velocity = 0.004;
  let dragId = null;
  let dragX = 0;
  let dragY = 0;
  let frameId = 0;
  let landMask = new Uint8Array(MASK_WIDTH * MASK_HEIGHT);
  let drawState = null;

  const ensureDrawState = (size) => {
    if (drawState?.size === size) {
      return drawState;
    }

    drawState = {
      size,
      imageData: ctx.createImageData(size, size)
    };

    return drawState;
  };

  const updateSize = () => {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const size = globe.clientWidth || 184;
    globe.width = Math.round(size * dpr);
    globe.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawState = null;
  };

  const draw = () => {
    const styles = getComputedStyle(document.documentElement);
    const textRgb = parseHexColor(styles.getPropertyValue("--text"));
    const lineRgb = parseHexColor(styles.getPropertyValue("--line"));
    const size = globe.clientWidth || 184;
    const radius = size * 0.46;
    const center = size * 0.5;
    const { imageData } = ensureDrawState(size);
    const pixels = imageData.data;

    const sinYaw = Math.sin(-yaw);
    const cosYaw = Math.cos(-yaw);
    const sinPitch = Math.sin(-pitch);
    const cosPitch = Math.cos(-pitch);

    for (let y = 0; y < size; y += 1) {
      const ny = (center - y) / radius;
      for (let x = 0; x < size; x += 1) {
        const nx = (x - center) / radius;
        const r2 = nx * nx + ny * ny;
        const offset = (y * size + x) * 4;

        if (r2 > 1) {
          pixels[offset + 3] = 0;
          continue;
        }

        const nz = Math.sqrt(1 - r2);

        const rx = nx;
        const ry = ny * cosPitch - nz * sinPitch;
        const rz = ny * sinPitch + nz * cosPitch;

        const gx = rx * cosYaw + rz * sinYaw;
        const gy = ry;
        const gz = -rx * sinYaw + rz * cosYaw;

        const lat = Math.asin(gy);
        const lon = Math.atan2(gz, gx);
        const u = Math.floor(((lon / TAU + 0.5) % 1) * MASK_WIDTH);
        const v = Math.floor((0.5 - lat / Math.PI) * MASK_HEIGHT);
        const land = landMask[Math.min(MASK_HEIGHT - 1, Math.max(0, v)) * MASK_WIDTH + Math.min(MASK_WIDTH - 1, Math.max(0, u))] === 1;

        const light = 0.74 + nz * 0.26;
        const base = land ? textRgb : lineRgb;

        pixels[offset] = Math.round(base[0] * light);
        pixels[offset + 1] = Math.round(base[1] * light);
        pixels[offset + 2] = Math.round(base[2] * light);
        pixels[offset + 3] = 226;
      }
    }

    ctx.clearRect(0, 0, size, size);
    ctx.putImageData(imageData, 0, 0);

    ctx.beginPath();
    ctx.arc(center, center, radius, 0, TAU);
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(${textRgb[0]}, ${textRgb[1]}, ${textRgb[2]}, 0.22)`;
    ctx.stroke();
  };

  const tick = () => {
    yaw += velocity;
    velocity *= 0.986;
    if (Math.abs(velocity) < 0.00035) {
      velocity = 0.00035;
    }
    draw();
    frameId = window.requestAnimationFrame(tick);
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
    pitch = Math.max(-1.15, Math.min(1.15, pitch - deltaY * 0.01));
    velocity = deltaX * 0.0005;
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
      frameId = window.requestAnimationFrame(tick);
    }
  });

  window.addEventListener("resize", () => {
    updateSize();
    draw();
  });
  globe.addEventListener("pointerdown", onPointerDown);
  globe.addEventListener("pointermove", onPointerMove);
  globe.addEventListener("pointerup", onPointerUp);
  globe.addEventListener("pointercancel", onPointerUp);

  if (media.matches && frameId) {
    window.cancelAnimationFrame(frameId);
  }
};
