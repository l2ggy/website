const TAU = Math.PI * 2;
const MASK_WIDTH = 720;
const MASK_HEIGHT = 360;
const LONGITUDE_SHIFTS = [-360, 0, 360];
const HOME_MARKER = { lat: 43.65, lon: -79.38 };
const HOME_MARKER_COLOR = "#1E3765";
const VISITOR_MARKER_COLOR = "#B5744A";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const normalizeLongitude = (lon) => {
  const wrapped = ((lon + 180) % 360 + 360) % 360;
  return wrapped === 0 && lon > 0 ? 180 : wrapped - 180;
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
    const delta = adjustedLon - previousLon;

    if (Math.abs(delta) === 360) {
      unwrapped.push([adjustedLon, lat]);
      continue;
    }

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

  const fillPolygon = (rings) => {
    if (!rings?.length) {
      return;
    }

    const preparedRings = rings
      .filter((ring) => ring?.length)
      .map((ring) => unwrapRing(ring.map(([lon, lat]) => [normalizeLongitude(lon), lat])));

    if (!preparedRings.length) {
      return;
    }

    context.beginPath();
    preparedRings.forEach((ring) => {
      LONGITUDE_SHIFTS.forEach((shift) => {
        drawRing(context, ring, shift);
      });
    });
    context.fill("evenodd");
  };

  geojson.features?.forEach((feature) => {
    const geometry = feature?.geometry;
    if (!geometry) {
      return;
    }

    if (geometry.type === "Polygon") {
      fillPolygon(geometry.coordinates);
    } else if (geometry.type === "MultiPolygon") {
      geometry.coordinates.forEach((polygon) => fillPolygon(polygon));
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
  const sampleCount = size * size;
  const sampleX = new Uint16Array(sampleCount);
  const sampleY = new Uint16Array(sampleCount);
  const sampleVX = new Float32Array(sampleCount);
  const sampleVY = new Float32Array(sampleCount);
  const sampleVZ = new Float32Array(sampleCount);
  let count = 0;

  for (let y = 0; y < size; y += 1) {
    const yN = (y + 0.5 - center) / radius;
    for (let x = 0; x < size; x += 1) {
      const xN = (x + 0.5 - center) / radius;
      const radialSq = xN * xN + yN * yN;
      if (radialSq > 1) {
        continue;
      }
      sampleX[count] = x;
      sampleY[count] = y;
      sampleVX[count] = xN;
      sampleVY[count] = -yN;
      sampleVZ[count] = Math.sqrt(1 - radialSq);
      count += 1;
    }
  }

  return { size, center, radius, count, sampleX, sampleY, sampleVX, sampleVY, sampleVZ };
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
    let rotated = rotateY(marker.vector, cosYaw, sinYaw);
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
    const outline = Math.max(0.75, dpr * 0.55);

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

    ctx.beginPath();
    ctx.arc(x, y, dot, 0, TAU);
    ctx.strokeStyle = marker.isHome ? "rgba(255, 255, 255, 0.78)" : "rgba(8, 12, 22, 0.38)";
    ctx.lineWidth = outline;
    ctx.stroke();
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
  const renderableMarkers = [...safeMarkers, { ...HOME_MARKER, isHome: true }].map((marker) => ({
    ...marker,
    vector: geoToVector(marker.lat, marker.lon),
  }));

  const ctx = globe.getContext("2d", { alpha: true });
  if (!ctx) {
    return;
  }

  let yaw = -0.4;
  let pitch = 0.05;
  let velocity = 0.005;
  let pointerId = null;
  let previousX = 0;
  let previousY = 0;
  let dpr = Math.max(1, window.devicePixelRatio || 1);
  let isAnimating = false;
  let sphere = buildSphereSamples(globe.clientWidth || 248);
  let landMask = null;
  let frameBuffer = null;
  let lineColor = "#d9dce1";
  let textColor = "#15191f";
  let isZoomed = false;
  let pointerStartX = 0;
  let pointerStartY = 0;
  let pointerMoved = false;

  const isCoarsePointer = () => window.matchMedia("(pointer: coarse)").matches;
  const getRenderDpr = () => {
    const nextDpr = Math.max(1, window.devicePixelRatio || 1);
    return Math.min(nextDpr, isCoarsePointer() ? 1.75 : 2.5);
  };

  const getZoomRenderScale = () => (isZoomed ? 1.8 : 1);

  const updateSize = () => {
    dpr = getRenderDpr();
    const cssSize = Math.max(140, Math.round(globe.clientWidth || 248));
    const pixelSize = Math.round(cssSize * dpr * getZoomRenderScale());
    globe.width = pixelSize;
    globe.height = pixelSize;
    sphere = buildSphereSamples(pixelSize);
    frameBuffer = ctx.createImageData(pixelSize, pixelSize);
  };

  const updateColors = () => {
    const styles = getComputedStyle(document.documentElement);
    lineColor = styles.getPropertyValue("--line").trim();
    textColor = styles.getPropertyValue("--text").trim();
  };

  const draw = () => {
    const { size, center, radius, count, sampleX, sampleY, sampleVX, sampleVY, sampleVZ } = sphere;

    ctx.clearRect(0, 0, size, size);
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, TAU);
    ctx.fillStyle = `${lineColor}78`;
    ctx.fill();

    if (landMask && frameBuffer) {
      const cosYaw = Math.cos(-yaw);
      const sinYaw = Math.sin(-yaw);
      const cosPitch = Math.cos(-pitch);
      const sinPitch = Math.sin(-pitch);
      const pixels = frameBuffer.data;

      for (let index = 0; index < count; index += 1) {
        const x = sampleX[index];
        const y = sampleY[index];
        const x1 = sampleVX[index];
        const y1 = sampleVY[index] * cosPitch - sampleVZ[index] * sinPitch;
        const z1 = sampleVY[index] * sinPitch + sampleVZ[index] * cosPitch;
        const x2 = x1 * cosYaw + z1 * sinYaw;
        const y2 = y1;
        const z2 = -x1 * sinYaw + z1 * cosYaw;
        const lon = Math.atan2(-z2, x2);
        const lat = Math.asin(y2);
        const u = ((lon + Math.PI) / TAU) * (landMask.width - 1);
        const v = ((Math.PI / 2 - lat) / Math.PI) * (landMask.height - 1);
        const maskIndex = ((Math.floor(v) * landMask.width) + Math.floor(u)) * 4;
        const isLand = landMask.data[maskIndex] > 120;
        const pixelIndex = (y * size + x) * 4;
        pixels[pixelIndex] = isLand ? 220 : 25;
        pixels[pixelIndex + 1] = isLand ? 220 : 25;
        pixels[pixelIndex + 2] = isLand ? 220 : 25;
        pixels[pixelIndex + 3] = isLand ? 214 : 170;
      }

      ctx.putImageData(frameBuffer, 0, 0);
      renderMarkers(ctx, center, radius, yaw, pitch, dpr, renderableMarkers);
    }

    ctx.beginPath();
    ctx.arc(center, center, radius * 0.99, 0, TAU);
    ctx.strokeStyle = `${textColor}55`;
    ctx.lineWidth = Math.max(1, dpr);
    ctx.stroke();
  };

  const onFrame = () => {
    if (document.hidden) {
      window.requestAnimationFrame(onFrame);
      return;
    }
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
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
    pointerMoved = false;
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
    if (!pointerMoved) {
      const movedX = event.clientX - pointerStartX;
      const movedY = event.clientY - pointerStartY;
      pointerMoved = (movedX * movedX) + (movedY * movedY) > 49;
    }
    previousX = event.clientX;
    previousY = event.clientY;
    const dragScale = event.pointerType === "touch" ? 1.45 : 1;
    const yawFactor = 0.012 * dragScale;
    const pitchFactor = 0.008 * dragScale;
    const velocityFactor = 0.00075 * dragScale;

    yaw += deltaX * yawFactor;
    pitch = clamp(pitch + deltaY * pitchFactor, -1.3, 1.3);
    velocity = deltaX * velocityFactor;
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
    if (!pointerMoved) {
      isZoomed = !isZoomed;
      globe.classList.toggle("is-zoomed", isZoomed);
      updateSize();
      draw();
    }
  };

  const start = () => {
    updateSize();
    updateColors();
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
  new MutationObserver(updateColors).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  globe.addEventListener("pointerdown", onPointerDown);
  globe.addEventListener("pointermove", onPointerMove);
  globe.addEventListener("pointerup", onPointerUp);
  globe.addEventListener("pointercancel", onPointerUp);
  globe.addEventListener("dragstart", (event) => event.preventDefault());
};
