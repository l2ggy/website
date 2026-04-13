const TAU = Math.PI * 2;
const LAND_DATA_PATH = "/data/ne_110m_land.geojson";

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

const toCartesian = (lon, lat) => {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  const cosLat = Math.cos(latRad);
  return [
    cosLat * Math.cos(lonRad),
    Math.sin(latRad),
    cosLat * Math.sin(lonRad)
  ];
};

const project = ([x, y], radius, center) => ({
  x: center + x * radius,
  y: center + y * radius
});

const lerpToHorizon = (a, b) => {
  const t = a[2] / (a[2] - b[2]);
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    0
  ];
};

const flattenRings = (geojson) => {
  const rings = [];

  geojson.features.forEach((feature) => {
    const { type, coordinates } = feature.geometry;
    const polygons = type === "Polygon" ? [coordinates] : coordinates;

    polygons.forEach((polygon) => {
      polygon.forEach((ring) => {
        rings.push(ring.map(([lon, lat]) => toCartesian(lon, lat)));
      });
    });
  });

  return rings;
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

  let yaw = 0.3;
  let pitch = -0.22;
  let velocity = 0.005;
  let dragId = null;
  let dragX = 0;
  let dragY = 0;
  let rafId = 0;
  let landRings = [];

  const updateSize = () => {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const size = globe.clientWidth || 188;
    globe.width = Math.round(size * dpr);
    globe.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const drawVisibleRing = (ring, radius, center) => {
    let hasPath = false;
    let segmentOpen = false;

    for (let index = 0; index < ring.length; index += 1) {
      const next = (index + 1) % ring.length;
      let currentPoint = rotateY(ring[index], yaw);
      currentPoint = rotateX(currentPoint, pitch);
      let nextPoint = rotateY(ring[next], yaw);
      nextPoint = rotateX(nextPoint, pitch);

      const currentVisible = currentPoint[2] >= 0;
      const nextVisible = nextPoint[2] >= 0;

      if (currentVisible && !segmentOpen) {
        const start = project(currentPoint, radius, center);
        ctx.moveTo(start.x, start.y);
        segmentOpen = true;
        hasPath = true;
      }

      if (currentVisible && nextVisible) {
        const projected = project(nextPoint, radius, center);
        ctx.lineTo(projected.x, projected.y);
        continue;
      }

      if (currentVisible !== nextVisible) {
        const horizonPoint = lerpToHorizon(currentPoint, nextPoint);
        const projectedHorizon = project(horizonPoint, radius, center);
        ctx.lineTo(projectedHorizon.x, projectedHorizon.y);
        if (segmentOpen) {
          ctx.closePath();
          segmentOpen = false;
        }
      }
    }

    if (segmentOpen) {
      ctx.closePath();
    }

    return hasPath;
  };

  const draw = () => {
    const styles = getComputedStyle(document.documentElement);
    const text = styles.getPropertyValue("--text").trim();
    const line = styles.getPropertyValue("--line").trim();
    const size = globe.clientWidth || 188;
    const radius = size * 0.44;
    const center = size * 0.5;

    ctx.clearRect(0, 0, size, size);

    ctx.beginPath();
    ctx.arc(center, center, radius, 0, TAU);
    ctx.fillStyle = `${line}80`;
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, TAU);
    ctx.clip();

    ctx.beginPath();
    landRings.forEach((ring) => {
      drawVisibleRing(ring, radius, center);
    });
    ctx.fillStyle = `${text}d4`;
    ctx.fill("evenodd");

    ctx.restore();

    ctx.beginPath();
    ctx.arc(center, center, radius, 0, TAU);
    ctx.strokeStyle = `${text}50`;
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  const tick = () => {
    yaw += velocity;
    velocity *= 0.986;
    if (Math.abs(velocity) < 0.00035) {
      velocity = velocity < 0 ? -0.00035 : 0.00035;
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

    yaw += deltaX * 0.013;
    pitch = Math.max(-1.2, Math.min(1.2, pitch - deltaY * 0.008));
    velocity = deltaX * 0.0008;
  };

  const onPointerUp = (event) => {
    if (dragId !== event.pointerId) {
      return;
    }
    dragId = null;
    globe.releasePointerCapture(event.pointerId);
  };

  const start = () => {
    updateSize();
    draw();

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!media.matches) {
      rafId = window.requestAnimationFrame(tick);
    }

    window.addEventListener("resize", updateSize);
    globe.addEventListener("pointerdown", onPointerDown);
    globe.addEventListener("pointermove", onPointerMove);
    globe.addEventListener("pointerup", onPointerUp);
    globe.addEventListener("pointercancel", onPointerUp);
  };

  fetch(LAND_DATA_PATH)
    .then((response) => response.json())
    .then((geojson) => {
      landRings = flattenRings(geojson);
      start();
    })
    .catch(start);
};
