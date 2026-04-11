const canvas = document.querySelector('.smoke-bg');
const ctx = canvas?.getContext('2d', { alpha: false });
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!canvas || !ctx) {
  throw new Error('Smoke background could not be initialized.');
}

const texture = document.createElement('canvas');
const tctx = texture.getContext('2d');
if (!tctx) {
  throw new Error('Smoke texture could not be initialized.');
}

let width = 0;
let height = 0;
let dpr = 1;
let baseTextureReady = false;

const layerConfig = [
  { opacity: 0.14, speedX: 0.22, speedY: 0.06, scale: 1.05 },
  { opacity: 0.1, speedX: -0.14, speedY: 0.1, scale: 1.18 },
  { opacity: 0.07, speedX: 0.12, speedY: -0.08, scale: 1.34 },
];

const resize = () => {
  dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  width = Math.max(1, Math.floor(window.innerWidth));
  height = Math.max(1, Math.floor(window.innerHeight));

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);

  const textureScale = 0.35;
  texture.width = Math.max(96, Math.floor(width * textureScale));
  texture.height = Math.max(96, Math.floor(height * textureScale));

  baseTextureReady = false;
};

const createSmokeTexture = () => {
  const w = texture.width;
  const h = texture.height;

  tctx.setTransform(1, 0, 0, 1, 0, 0);
  tctx.clearRect(0, 0, w, h);

  const base = tctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, '#17191b');
  base.addColorStop(1, '#101214');
  tctx.fillStyle = base;
  tctx.fillRect(0, 0, w, h);

  tctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 8; i += 1) {
    const radius = (Math.min(w, h) * (0.3 + i * 0.08)) / 2;
    const x = (w * ((i * 0.17 + 0.2) % 1));
    const y = (h * ((i * 0.29 + 0.35) % 1));
    const blob = tctx.createRadialGradient(x, y, 0, x, y, radius);
    blob.addColorStop(0, `rgba(255,255,255,${0.07 - i * 0.006})`);
    blob.addColorStop(1, 'rgba(255,255,255,0)');
    tctx.fillStyle = blob;
    tctx.beginPath();
    tctx.arc(x, y, radius, 0, Math.PI * 2);
    tctx.fill();
  }

  tctx.globalCompositeOperation = 'source-over';
  baseTextureReady = true;
};

const drawStaticFrame = () => {
  if (!baseTextureReady) createSmokeTexture();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.drawImage(texture, 0, 0, texture.width, texture.height, 0, 0, width, height);
};

const drawAnimated = (timeMs) => {
  if (!baseTextureReady) createSmokeTexture();

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#111315';
  ctx.fillRect(0, 0, width, height);

  const t = timeMs * 0.00005;
  for (const layer of layerConfig) {
    const scaledW = width * layer.scale;
    const scaledH = height * layer.scale;
    const offsetX = (Math.sin(t * layer.speedX) * 0.08 + 0.1) * width;
    const offsetY = (Math.cos(t * layer.speedY) * 0.08 + 0.1) * height;

    ctx.globalAlpha = layer.opacity;
    ctx.drawImage(
      texture,
      0,
      0,
      texture.width,
      texture.height,
      -offsetX,
      -offsetY,
      scaledW,
      scaledH,
    );
  }

  ctx.globalAlpha = 1;
};

let previousFrame = 0;
const targetFrameMs = 1000 / 30;

const tick = (timeMs) => {
  if (timeMs - previousFrame >= targetFrameMs) {
    drawAnimated(timeMs);
    previousFrame = timeMs;
  }
  window.requestAnimationFrame(tick);
};

resize();
window.addEventListener('resize', resize, { passive: true });

if (reducedMotion) {
  drawStaticFrame();
} else {
  window.requestAnimationFrame(tick);
}
