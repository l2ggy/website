const TAU = Math.PI * 2;
const CELL_STEP = 2;

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

const project = ([x, y, z], radius, centerX, centerY) => ({
  x: centerX + x * radius,
  y: centerY + y * radius,
  z
});

const createPoint = (lat, lon) => {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (normalizeLongitude(lon) * Math.PI) / 180;
  const cosLat = Math.cos(latRad);
  return [cosLat * Math.cos(lonRad), Math.sin(latRad), cosLat * Math.sin(lonRad)];
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

  const polygons = [];
  geojson.features.forEach((feature) => {
    const geometry = feature?.geometry;
    if (!geometry) {
      return;
    }

    if (geometry.type === "Polygon") {
      polygons.push(geometry.coordinates);
      return;
    }

    if (geometry.type === "MultiPolygon") {
      geometry.coordinates.forEach((polygon) => polygons.push(polygon));
    }
  });

  return polygons
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
  if (lat < minLat || lat > maxLat || lon < minLon || lon > maxLon) {
    return false;
  }

  if (!pointInRing(lon, lat, polygon.outer)) {
    return false;
  }

  return !polygon.holes.some((hole) => pointInRing(lon, lat, hole));
};

const buildLandCells = (polygons) => {
  const cells = [];

  for (let lat = -88; lat < 88; lat += CELL_STEP) {
    for (let lon = -180; lon < 180; lon += CELL_STEP) {
      const sampleLon = lon + CELL_STEP * 0.5;
      const sampleLat = lat + CELL_STEP * 0.5;
      const isLand = polygons.some((polygon) => pointInPolygon(sampleLon, sampleLat, polygon));

      if (!isLand) {
        continue;
      }

      cells.push([
        createPoint(lat, lon),
        createPoint(lat, lon + CELL_STEP),
        createPoint(lat + CELL_STEP, lon + CELL_STEP),
        createPoint(lat + CELL_STEP, lon)
      ]);
    }
  }

  return cells;
};

let landCellsPromise;
const loadLandCells = () => {
  if (landCellsPromise) {
    return landCellsPromise;
  }

  landCellsPromise = fetch("/data/ne_110m_land.geojson")
    .then((response) => (response.ok ? response.json() : { features: [] }))
    .then((geojson) => buildLandCells(extractPolygons(geojson)))
    .catch(() => []);

  return landCellsPromise;
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
  let pitch = -0.22;
  let velocity = 0.006;
  let dragId = null;
  let dragX = 0;
  let dragY = 0;
  let rafId = 0;
  let landCells = [];

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
    const line = styles.getPropertyValue("--line").trim();
    const size = globe.clientWidth || 188;
    const radius = size * 0.44;
    const center = size * 0.5;

    ctx.clearRect(0, 0, size, size);

    ctx.beginPath();
    ctx.arc(center, center, radius, 0, TAU);
    ctx.fillStyle = `${line}5a`;
    ctx.fill();
    ctx.strokeStyle = `${line}d0`;
    ctx.lineWidth = 1;
    ctx.stroke();

    landCells.forEach((cell) => {
      const projected = cell.map((point) => {
        let rotated = rotateY(point, yaw);
        rotated = rotateX(rotated, pitch);
        return project(rotated, radius, center, center);
      });

      const visibleCount = projected.filter((point) => point.z >= 0).length;
      if (visibleCount < 4) {
        return;
      }

      ctx.beginPath();
      ctx.moveTo(projected[0].x, projected[0].y);
      for (let i = 1; i < projected.length; i += 1) {
        ctx.lineTo(projected[i].x, projected[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = `${text}d4`;
      ctx.fill();
    });

    ctx.beginPath();
    ctx.arc(center, center, radius * 0.98, 0, TAU);
    ctx.strokeStyle = `${text}3d`;
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
      rafId = window.requestAnimationFrame(tick);
    }
  };

  loadLandCells().then((cells) => {
    landCells = cells;
    start();
  });

  window.addEventListener("resize", updateSize);
  globe.addEventListener("pointerdown", onPointerDown);
  globe.addEventListener("pointermove", onPointerMove);
  globe.addEventListener("pointerup", onPointerUp);
  globe.addEventListener("pointercancel", onPointerUp);
};
