const TAU = Math.PI * 2;
const LAT_STEPS = [-60, -30, 0, 30, 60];
const LON_STEP = 20;
const LAND_STEP = 4;
const LAND_SHAPES = [
  { lat: 54, lon: -104, latRadius: 26, lonRadius: 38 }, // North America
  { lat: 16, lon: -90, latRadius: 11, lonRadius: 16 }, // Central America
  { lat: -16, lon: -61, latRadius: 27, lonRadius: 17 }, // South America
  { lat: 72, lon: -40, latRadius: 10, lonRadius: 13 }, // Greenland
  { lat: 7, lon: 21, latRadius: 31, lonRadius: 20 }, // Africa
  { lat: 48, lon: 14, latRadius: 17, lonRadius: 20 }, // Europe
  { lat: 47, lon: 90, latRadius: 29, lonRadius: 58 }, // Asia
  { lat: 20, lon: 78, latRadius: 13, lonRadius: 10 }, // India
  { lat: 62, lon: 100, latRadius: 10, lonRadius: 16 }, // Siberia north
  { lat: 19, lon: 46, latRadius: 9, lonRadius: 13 }, // Arabian peninsula
  { lat: -25, lon: 134, latRadius: 15, lonRadius: 19 }, // Australia
  { lat: -41, lon: 174, latRadius: 6, lonRadius: 7 }, // New Zealand
  { lat: -75, lon: 0, latRadius: 9, lonRadius: 180 } // Antarctica
];

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

const project = ([x, y, z], radius, centerX, centerY) => ({
  x: centerX + x * radius,
  y: centerY + y * radius,
  visible: z >= 0
});

const createPoint = (lat, lon) => {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  const cosLat = Math.cos(latRad);
  return [cosLat * Math.cos(lonRad), Math.sin(latRad), cosLat * Math.sin(lonRad)];
};

const distanceLongitude = (a, b) => {
  const delta = Math.abs(a - b) % 360;
  return delta > 180 ? 360 - delta : delta;
};

const isLand = (lat, lon) =>
  LAND_SHAPES.some((shape) => {
    const latDistance = Math.abs(lat - shape.lat) / shape.latRadius;
    const lonDistance = distanceLongitude(lon, shape.lon) / shape.lonRadius;
    return latDistance * latDistance + lonDistance * lonDistance <= 1;
  });

const buildLandPoints = () => {
  const points = [];
  for (let lat = -78; lat <= 82; lat += LAND_STEP) {
    for (let lon = -180; lon <= 180; lon += LAND_STEP) {
      if (!isLand(lat, lon)) {
        continue;
      }
      points.push(createPoint(lat, lon));
    }
  }
  return points;
};

const drawGridLine = (ctx, points, radius, centerX, centerY, front, back) => {
  let activeStyle = null;
  ctx.beginPath();
  points.forEach((point, index) => {
    const projected = project(point, radius, centerX, centerY);
    const nextStyle = projected.visible ? front : back;

    if (nextStyle !== activeStyle) {
      if (index !== 0) {
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.strokeStyle = nextStyle;
      activeStyle = nextStyle;
      ctx.moveTo(projected.x, projected.y);
      return;
    }

    ctx.lineTo(projected.x, projected.y);
  });
  ctx.stroke();
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
  const landPoints = buildLandPoints();

  const updateSize = () => {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const size = globe.clientWidth || 188;
    globe.width = Math.round(size * dpr);
    globe.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const draw = () => {
    const styles = getComputedStyle(document.documentElement);
    const text = styles.getPropertyValue("--text").trim();
    const muted = styles.getPropertyValue("--muted").trim();
    const line = styles.getPropertyValue("--line").trim();
    const size = globe.clientWidth || 188;
    const radius = size * 0.44;
    const center = size * 0.5;

    ctx.clearRect(0, 0, size, size);
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.arc(center, center, radius, 0, TAU);
    ctx.fillStyle = `${line}66`;
    ctx.fill();
    ctx.strokeStyle = `${line}cc`;
    ctx.stroke();

    const landDot = Math.max(0.95, size * 0.0074);
    landPoints.forEach((point) => {
      let transformed = rotateY(point, yaw);
      transformed = rotateX(transformed, pitch);
      const projected = project(transformed, radius, center, center);
      ctx.beginPath();
      ctx.arc(projected.x, projected.y, landDot, 0, TAU);
      ctx.fillStyle = projected.visible ? `${text}9c` : `${muted}2f`;
      ctx.fill();
    });

    LAT_STEPS.forEach((lat) => {
      const points = [];
      for (let lon = -180; lon <= 180; lon += LON_STEP) {
        let point = createPoint(lat, lon);
        point = rotateY(point, yaw);
        point = rotateX(point, pitch);
        points.push(point);
      }
      drawGridLine(ctx, points, radius, center, center, `${text}c2`, `${muted}4d`);
    });

    for (let lon = 0; lon < 180; lon += 30) {
      const points = [];
      for (let lat = -90; lat <= 90; lat += 6) {
        let point = createPoint(lat, lon);
        point = rotateY(point, yaw);
        point = rotateX(point, pitch);
        points.push(point);
      }
      drawGridLine(ctx, points, radius, center, center, `${text}aa`, `${muted}40`);
    }

    ctx.beginPath();
    ctx.arc(center, center, radius * 0.97, 0, TAU);
    ctx.strokeStyle = `${text}55`;
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
