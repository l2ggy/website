const TAU = Math.PI * 2;
const LAT_STEPS = [-60, -30, 0, 30, 60];
const LON_STEP = 20;
const LAND_STEP = 5;

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

const normalizeLon = (lon) => {
  let value = lon;
  while (value < -180) {
    value += 360;
  }
  while (value > 180) {
    value -= 360;
  }
  return value;
};

const insideEllipse = (lat, lon, centerLat, centerLon, latRadius, lonRadius) => {
  const latDistance = (lat - centerLat) / latRadius;
  const lonDistance = normalizeLon(lon - centerLon) / lonRadius;
  return latDistance * latDistance + lonDistance * lonDistance <= 1;
};

const isLand = (lat, lon) => {
  if (insideEllipse(lat, lon, 48, -102, 27, 40)) return true;
  if (insideEllipse(lat, lon, 16, -94, 13, 15)) return true;
  if (insideEllipse(lat, lon, -17, -59, 35, 20)) return true;
  if (insideEllipse(lat, lon, 6, 19, 35, 23)) return true;
  if (insideEllipse(lat, lon, 53, 25, 27, 80)) return true;
  if (insideEllipse(lat, lon, 23, 45, 18, 22)) return true;
  if (insideEllipse(lat, lon, -25, 134, 13, 20)) return true;
  if (insideEllipse(lat, lon, 74, -42, 12, 18)) return true;
  return insideEllipse(lat, lon, -42, 172, 8, 12);
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

    const landColorFront = `${text}80`;
    const landColorBack = `${muted}30`;
    for (let lat = -60; lat <= 80; lat += LAND_STEP) {
      for (let lon = -180; lon <= 180; lon += LAND_STEP) {
        if (!isLand(lat, lon)) {
          continue;
        }
        let point = createPoint(lat, lon);
        point = rotateY(point, yaw);
        point = rotateX(point, pitch);
        const projected = project(point, radius, center, center);
        ctx.beginPath();
        ctx.fillStyle = projected.visible ? landColorFront : landColorBack;
        ctx.arc(projected.x, projected.y, size * 0.0068, 0, TAU);
        ctx.fill();
      }
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
