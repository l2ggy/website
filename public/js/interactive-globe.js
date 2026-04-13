const TAU = Math.PI * 2;
const TEXTURE_WIDTH = 1024;
const TEXTURE_HEIGHT = 512;

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

const extractRings = (geojson) => {
  if (!geojson || !Array.isArray(geojson.features)) {
    return [];
  }

  const rings = [];
  geojson.features.forEach((feature) => {
    const geometry = feature?.geometry;
    if (!geometry) {
      return;
    }

    if (geometry.type === "Polygon") {
      geometry.coordinates.forEach((ring) => rings.push(ring));
      return;
    }

    if (geometry.type === "MultiPolygon") {
      geometry.coordinates.forEach((polygon) => {
        polygon.forEach((ring) => rings.push(ring));
      });
    }
  });

  return rings;
};

const projectTexturePoint = ([lon, lat], width, height) => {
  const x = ((normalizeLongitude(lon) + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return [x, y];
};

const colorParserContext = document.createElement("canvas").getContext("2d");
const toRgb = (color, fallback) => {
  if (!colorParserContext) {
    return fallback;
  }
  colorParserContext.fillStyle = color;
  const normalized = colorParserContext.fillStyle;
  const values = normalized.match(/\d+/g);
  if (!values || values.length < 3) {
    return fallback;
  }
  return [Number(values[0]), Number(values[1]), Number(values[2])];
};

const createLandTexture = (rings) => {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = TEXTURE_WIDTH;
  textureCanvas.height = TEXTURE_HEIGHT;
  const textureCtx = textureCanvas.getContext("2d");

  if (!textureCtx) {
    return { width: TEXTURE_WIDTH, height: TEXTURE_HEIGHT, alpha: new Uint8ClampedArray(0) };
  }

  textureCtx.clearRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
  textureCtx.fillStyle = "#ffffff";

  rings.forEach((ring) => {
    if (!Array.isArray(ring) || ring.length < 3) {
      return;
    }

    textureCtx.beginPath();
    ring.forEach((coordinate, index) => {
      const [x, y] = projectTexturePoint(coordinate, TEXTURE_WIDTH, TEXTURE_HEIGHT);
      if (index === 0) {
        textureCtx.moveTo(x, y);
        return;
      }
      textureCtx.lineTo(x, y);
    });
    textureCtx.closePath();
    textureCtx.fill("evenodd");
  });

  const { data } = textureCtx.getImageData(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
  const alpha = new Uint8ClampedArray(TEXTURE_WIDTH * TEXTURE_HEIGHT);
  for (let i = 0; i < alpha.length; i += 1) {
    alpha[i] = data[i * 4 + 3];
  }

  return {
    width: TEXTURE_WIDTH,
    height: TEXTURE_HEIGHT,
    alpha
  };
};

let landTexturePromise;
const loadLandTexture = () => {
  if (landTexturePromise) {
    return landTexturePromise;
  }

  landTexturePromise = fetch("/data/ne_110m_land.geojson")
    .then((response) => (response.ok ? response.json() : { features: [] }))
    .then((geojson) => createLandTexture(extractRings(geojson)))
    .catch(() => ({ width: TEXTURE_WIDTH, height: TEXTURE_HEIGHT, alpha: new Uint8ClampedArray(0) }));

  return landTexturePromise;
};

const sampleLand = (texture, lon, lat) => {
  if (!texture.alpha.length) {
    return 0;
  }

  const u = ((normalizeLongitude(lon) + 180) / 360) * (texture.width - 1);
  const v = ((90 - lat) / 180) * (texture.height - 1);
  const x = Math.max(0, Math.min(texture.width - 1, Math.round(u)));
  const y = Math.max(0, Math.min(texture.height - 1, Math.round(v)));
  return texture.alpha[y * texture.width + x] / 255;
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

  let yaw = -Math.PI / 2;
  let pitch = 0;
  let velocity = 0.005;
  let dragId = null;
  let dragX = 0;
  let dragY = 0;
  let texture = { width: TEXTURE_WIDTH, height: TEXTURE_HEIGHT, alpha: new Uint8ClampedArray(0) };
  let imageBuffer = null;
  let imageData = null;

  const updateSize = () => {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const size = Math.round(globe.clientWidth || 188);
    globe.width = Math.round(size * dpr);
    globe.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    imageData = ctx.createImageData(size, size);
    imageBuffer = imageData.data;
  };

  const draw = () => {
    if (!imageData || !imageBuffer) {
      return;
    }

    const styles = getComputedStyle(document.documentElement);
    const text = styles.getPropertyValue("--text").trim();
    const line = styles.getPropertyValue("--line").trim();
    const [landR, landG, landB] = toRgb(text, [215, 215, 215]);
    const [oceanR, oceanG, oceanB] = toRgb(line, [42, 42, 42]);

    const size = imageData.width;
    const center = size * 0.5;
    const radius = size * 0.44;

    imageBuffer.fill(0);

    for (let py = 0; py < size; py += 1) {
      const dy = (py + 0.5 - center) / radius;
      const dySq = dy * dy;
      if (dySq > 1) {
        continue;
      }

      for (let px = 0; px < size; px += 1) {
        const dx = (px + 0.5 - center) / radius;
        const distSq = dx * dx + dySq;
        if (distSq > 1) {
          continue;
        }

        const dz = Math.sqrt(1 - distSq);
        let world = rotateX([dx, dy, dz], -pitch);
        world = rotateY(world, -yaw);

        const lon = (Math.atan2(world[2], world[0]) * 180) / Math.PI;
        const lat = (Math.asin(world[1]) * 180) / Math.PI;
        const land = sampleLand(texture, lon, lat);

        const shade = 0.58 + dz * 0.42;
        const baseR = land > 0.5 ? landR : oceanR;
        const baseG = land > 0.5 ? landG : oceanG;
        const baseB = land > 0.5 ? landB : oceanB;

        const index = (py * size + px) * 4;
        imageBuffer[index] = Math.round(baseR * shade);
        imageBuffer[index + 1] = Math.round(baseG * shade);
        imageBuffer[index + 2] = Math.round(baseB * shade);
        imageBuffer[index + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    ctx.beginPath();
    ctx.arc(center, center, radius + 0.2, 0, TAU);
    ctx.strokeStyle = `${text}4d`;
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
    yaw += deltaX * 0.012;
    pitch = Math.max(-1.25, Math.min(1.25, pitch - deltaY * 0.01));
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

  loadLandTexture().then((loadedTexture) => {
    texture = loadedTexture;
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
