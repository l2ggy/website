const TAU = Math.PI * 2;
const TEXTURE_WIDTH = 1024;
const TEXTURE_HEIGHT = 512;

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

const parseHexColor = (value) => {
  if (!value || value[0] !== "#") {
    return [215, 215, 215];
  }

  const hex = value.slice(1);
  if (hex.length === 3) {
    return hex.split("").map((chunk) => Number.parseInt(chunk + chunk, 16));
  }

  if (hex.length >= 6) {
    return [
      Number.parseInt(hex.slice(0, 2), 16),
      Number.parseInt(hex.slice(2, 4), 16),
      Number.parseInt(hex.slice(4, 6), 16)
    ];
  }

  return [215, 215, 215];
};

const drawFeatureRing = (ctx, ring) => {
  ring.forEach(([lon, lat], index) => {
    const x = ((lon + 180) / 360) * TEXTURE_WIDTH;
    const y = ((90 - lat) / 180) * TEXTURE_HEIGHT;
    if (index === 0) {
      ctx.moveTo(x, y);
      return;
    }
    ctx.lineTo(x, y);
  });
};

const createLandTexture = (geojson) => {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = TEXTURE_WIDTH;
  textureCanvas.height = TEXTURE_HEIGHT;
  const textureContext = textureCanvas.getContext("2d", { willReadFrequently: true });

  if (!textureContext) {
    return null;
  }

  textureContext.clearRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
  textureContext.fillStyle = "#000";

  geojson.features.forEach((feature) => {
    const { type, coordinates } = feature.geometry;
    textureContext.beginPath();

    if (type === "Polygon") {
      coordinates.forEach((ring) => drawFeatureRing(textureContext, ring));
    } else if (type === "MultiPolygon") {
      coordinates.forEach((polygon) => {
        polygon.forEach((ring) => drawFeatureRing(textureContext, ring));
      });
    }

    textureContext.fill("evenodd");
  });

  return textureContext.getImageData(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT).data;
};

const loadLandTexture = async () => {
  const response = await fetch("/land-110m.geojson");
  if (!response.ok) {
    throw new Error("Unable to load land data.");
  }

  const geojson = await response.json();
  return createLandTexture(geojson);
};

export const setupInteractiveGlobe = () => {
  const globe = document.querySelector("#hero-globe");
  if (!globe) {
    return;
  }

  const ctx = globe.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return;
  }

  let yaw = 0.3;
  let pitch = -0.22;
  let velocity = 0.0055;
  let dragId = null;
  let dragX = 0;
  let dragY = 0;
  let rafId = 0;
  let allowMotion = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let landTexture = null;
  let frame = null;
  let frameSize = 0;

  const updateSize = () => {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const size = globe.clientWidth || 188;
    globe.width = Math.round(size * dpr);
    globe.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (frameSize !== Math.round(size)) {
      frameSize = Math.round(size);
      frame = ctx.createImageData(frameSize, frameSize);
    }
  };

  const draw = () => {
    const size = globe.clientWidth || 188;
    const radius = size * 0.44;
    const center = size * 0.5;
    const styles = getComputedStyle(document.documentElement);
    const [r, g, b] = parseHexColor(styles.getPropertyValue("--text").trim());
    const line = styles.getPropertyValue("--line").trim();

    ctx.clearRect(0, 0, size, size);
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, TAU);
    ctx.fillStyle = `${line}66`;
    ctx.fill();

    if (!landTexture || !frame) {
      return;
    }

    frame.data.fill(0);

    const min = Math.floor(center - radius);
    const max = Math.ceil(center + radius);

    for (let y = min; y <= max; y += 1) {
      const ny = (y - center) / radius;
      const rowOffset = y * frameSize;

      for (let x = min; x <= max; x += 1) {
        const nx = (x - center) / radius;
        const rr = nx * nx + ny * ny;
        if (rr > 1) {
          continue;
        }

        const nz = Math.sqrt(1 - rr);
        let world = rotateX([nx, ny, nz], -pitch);
        world = rotateY(world, -yaw);

        const lon = Math.atan2(world[2], world[0]);
        const lat = Math.asin(world[1]);
        const tx = Math.floor(((lon + Math.PI) / TAU) * (TEXTURE_WIDTH - 1));
        const ty = Math.floor(((Math.PI / 2 - lat) / Math.PI) * (TEXTURE_HEIGHT - 1));
        const textureIndex = (ty * TEXTURE_WIDTH + tx) * 4;

        if (landTexture[textureIndex + 3] < 20) {
          continue;
        }

        const shade = 0.72 + 0.28 * nz;
        const index = (rowOffset + x) * 4;
        frame.data[index] = Math.round(r * shade);
        frame.data[index + 1] = Math.round(g * shade);
        frame.data[index + 2] = Math.round(b * shade);
        frame.data[index + 3] = 225;
      }
    }

    ctx.putImageData(frame, 0, 0);

    ctx.beginPath();
    ctx.arc(center, center, radius, 0, TAU);
    ctx.strokeStyle = `${line}dd`;
    ctx.stroke();
  };

  const tick = () => {
    yaw += velocity;
    velocity *= 0.985;
    if (Math.abs(velocity) < 0.0003) {
      velocity = 0.0003;
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
    yaw += deltaX * 0.014;
    pitch = Math.max(-1.15, Math.min(1.15, pitch - deltaY * 0.008));
    velocity = deltaX * 0.00075;

    if (!allowMotion) {
      draw();
    }
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

  loadLandTexture()
    .then((texture) => {
      landTexture = texture;
      draw();
      if (allowMotion && !rafId) {
        rafId = window.requestAnimationFrame(tick);
      }
    })
    .catch(() => {
      landTexture = null;
      draw();
    });

  if (allowMotion) {
    rafId = window.requestAnimationFrame(tick);
  }

  window.addEventListener("resize", () => {
    updateSize();
    draw();
  });
  globe.addEventListener("pointerdown", onPointerDown);
  globe.addEventListener("pointermove", onPointerMove);
  globe.addEventListener("pointerup", onPointerUp);
  globe.addEventListener("pointercancel", onPointerUp);
};
