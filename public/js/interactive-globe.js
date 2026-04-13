const TAU = Math.PI * 2;
const MASK_WIDTH = 1024;
const MASK_HEIGHT = 512;

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

const toMapX = (lon, shiftDeg = 0) => ((lon + 180 + shiftDeg) / 360) * MASK_WIDTH;
const toMapY = (lat) => ((90 - lat) / 180) * MASK_HEIGHT;

const unwrapRing = (ring) => {
  if (!ring.length) {
    return [];
  }

  const points = [];
  let unwrappedLon = ring[0][0];
  points.push([unwrappedLon, ring[0][1]]);

  for (let i = 1; i < ring.length; i += 1) {
    const lon = ring[i][0];
    const lat = ring[i][1];
    let delta = lon - ring[i - 1][0];

    while (delta > 180) {
      delta -= 360;
    }
    while (delta < -180) {
      delta += 360;
    }

    unwrappedLon += delta;
    points.push([unwrappedLon, lat]);
  }

  return points;
};

const traceRing = (ctx, ring, shiftDeg = 0) => {
  if (!ring.length) {
    return;
  }

  ctx.moveTo(toMapX(ring[0][0], shiftDeg), toMapY(ring[0][1]));
  for (let i = 1; i < ring.length; i += 1) {
    ctx.lineTo(toMapX(ring[i][0], shiftDeg), toMapY(ring[i][1]));
  }
  ctx.closePath();
};

const createLandMask = (geojson) => {
  const canvas = document.createElement("canvas");
  canvas.width = MASK_WIDTH;
  canvas.height = MASK_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }

  ctx.clearRect(0, 0, MASK_WIDTH, MASK_HEIGHT);
  ctx.fillStyle = "#ffffff";

  geojson.features.forEach((feature) => {
    const { geometry } = feature;
    const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

    polygons.forEach((polygon) => {
      ctx.beginPath();
      polygon.forEach((rawRing) => {
        const ring = unwrapRing(rawRing);
        traceRing(ctx, ring, 0);
        traceRing(ctx, ring, -360);
        traceRing(ctx, ring, 360);
      });
      ctx.fill("evenodd");
    });
  });

  return ctx.getImageData(0, 0, MASK_WIDTH, MASK_HEIGHT).data;
};

const loadLandMask = async () => {
  const response = await fetch("/data/ne_110m_land.geojson", { cache: "force-cache" });
  if (!response.ok) {
    throw new Error("Failed to load land geometry");
  }
  const geojson = await response.json();
  return createLandMask(geojson);
};

export const setupInteractiveGlobe = () => {
  const globe = document.querySelector("#hero-globe");
  if (!globe) {
    return;
  }

  const ctx = globe.getContext("2d");
  if (!ctx) {
    return;
  }

  let yaw = 0.35;
  let pitch = -0.28;
  let velocity = 0.006;
  let dragId = null;
  let dragX = 0;
  let dragY = 0;
  let rafId = 0;
  let size = 188;
  let radius = 82;
  let center = 94;
  let landMaskData = null;

  const updateSize = () => {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    size = globe.clientWidth || 188;
    radius = size * 0.44;
    center = size * 0.5;
    globe.width = Math.round(size * dpr);
    globe.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const draw = () => {
    const styles = getComputedStyle(document.documentElement);
    const text = styles.getPropertyValue("--text").trim();
    const line = styles.getPropertyValue("--line").trim();

    ctx.clearRect(0, 0, size, size);
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, TAU);
    ctx.fillStyle = `${line}70`;
    ctx.fill();

    if (landMaskData) {
      const image = ctx.createImageData(size, size);
      const landRgb = [
        Number.parseInt(text.slice(1, 3), 16),
        Number.parseInt(text.slice(3, 5), 16),
        Number.parseInt(text.slice(5, 7), 16)
      ];

      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          const nx = (x + 0.5 - center) / radius;
          const ny = (y + 0.5 - center) / radius;
          const d2 = nx * nx + ny * ny;
          if (d2 > 1) {
            continue;
          }

          const nz = Math.sqrt(1 - d2);
          let world = rotateX([nx, ny, nz], -pitch);
          world = rotateY(world, -yaw);

          const lon = (Math.atan2(world[2], world[0]) * 180) / Math.PI;
          const lat = (Math.asin(world[1]) * 180) / Math.PI;
          const mapX = Math.min(MASK_WIDTH - 1, Math.max(0, Math.floor(((lon + 180) / 360) * MASK_WIDTH)));
          const mapY = Math.min(MASK_HEIGHT - 1, Math.max(0, Math.floor(((90 - lat) / 180) * MASK_HEIGHT)));
          const mapIndex = (mapY * MASK_WIDTH + mapX) * 4;

          if (landMaskData[mapIndex + 3] < 10) {
            continue;
          }

          const pixelIndex = (y * size + x) * 4;
          image.data[pixelIndex] = landRgb[0];
          image.data[pixelIndex + 1] = landRgb[1];
          image.data[pixelIndex + 2] = landRgb[2];
          image.data[pixelIndex + 3] = 215;
        }
      }

      ctx.putImageData(image, 0, 0);
    }

    ctx.beginPath();
    ctx.arc(center, center, radius, 0, TAU);
    ctx.strokeStyle = `${text}66`;
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  const tick = () => {
    yaw += velocity;
    velocity *= 0.985;
    if (Math.abs(velocity) < 0.0004) {
      velocity = 0.0004;
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
    yaw += deltaX * 0.015;
    pitch = Math.max(-1.15, Math.min(1.15, pitch - deltaY * 0.009));
    velocity = deltaX * 0.0008;
  };

  const onPointerUp = (event) => {
    if (dragId !== event.pointerId) {
      return;
    }
    dragId = null;
    globe.releasePointerCapture(event.pointerId);
  };

  updateSize();
  draw();

  loadLandMask()
    .then((maskData) => {
      landMaskData = maskData;
      draw();
    })
    .catch(() => {
      landMaskData = null;
    });

  rafId = window.requestAnimationFrame(tick);
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (media.matches) {
    window.cancelAnimationFrame(rafId);
    rafId = 0;
  }

  window.addEventListener("resize", updateSize);
  globe.addEventListener("pointerdown", onPointerDown);
  globe.addEventListener("pointermove", onPointerMove);
  globe.addEventListener("pointerup", onPointerUp);
  globe.addEventListener("pointercancel", onPointerUp);
};
