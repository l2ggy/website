(() => {
  const canvas = document.getElementById('smoke-bg');

  if (!canvas) {
    return;
  }

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    return;
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const noiseCanvas = document.createElement('canvas');
  const noiseCtx = noiseCanvas.getContext('2d');

  if (!noiseCtx) {
    return;
  }

  const NOISE_SIZE = 128;
  noiseCanvas.width = NOISE_SIZE;
  noiseCanvas.height = NOISE_SIZE;

  const noiseImage = noiseCtx.createImageData(NOISE_SIZE, NOISE_SIZE);
  const pixels = noiseImage.data;

  for (let i = 0; i < pixels.length; i += 4) {
    const value = 92 + Math.random() * 46;
    pixels[i] = value;
    pixels[i + 1] = value;
    pixels[i + 2] = value;
    pixels[i + 3] = 255;
  }

  noiseCtx.putImageData(noiseImage, 0, 0);

  const layers = [
    { speedX: 0.0035, speedY: 0.0021, scale: 2.2, alpha: 0.14 },
    { speedX: -0.0026, speedY: 0.0032, scale: 2.9, alpha: 0.12 },
    { speedX: 0.0019, speedY: -0.0024, scale: 3.5, alpha: 0.1 },
  ];

  let width = 0;
  let height = 0;
  let rafId = 0;
  let lastFrame = 0;

  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    renderStatic(0);
  };

  const drawBase = () => {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#161616');
    gradient.addColorStop(1, '#0f0f0f');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  };

  const drawLayers = (timeMs) => {
    const time = timeMs * 0.001;

    layers.forEach((layer) => {
      const tile = NOISE_SIZE * layer.scale;
      const offsetX = ((time * layer.speedX * tile) % tile) - tile;
      const offsetY = ((time * layer.speedY * tile) % tile) - tile;
      const cols = Math.ceil(width / tile) + 3;
      const rows = Math.ceil(height / tile) + 3;

      ctx.globalAlpha = layer.alpha;
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const x = offsetX + col * tile;
          const y = offsetY + row * tile;
          ctx.drawImage(noiseCanvas, x, y, tile, tile);
        }
      }
    });

    ctx.globalAlpha = 1;
  };

  const drawVignette = () => {
    const vignette = ctx.createRadialGradient(
      width * 0.5,
      height * 0.45,
      Math.min(width, height) * 0.1,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.75,
    );

    vignette.addColorStop(0, 'rgba(18, 18, 18, 0)');
    vignette.addColorStop(1, 'rgba(8, 8, 8, 0.35)');

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  };

  const renderFrame = (timeMs) => {
    drawBase();
    drawLayers(timeMs);
    drawVignette();
  };

  const renderStatic = (timeMs) => {
    renderFrame(timeMs + 32000);
  };

  const tick = (timeMs) => {
    if (timeMs - lastFrame < 33) {
      rafId = window.requestAnimationFrame(tick);
      return;
    }

    lastFrame = timeMs;
    renderFrame(timeMs);
    rafId = window.requestAnimationFrame(tick);
  };

  const stop = () => {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
  };

  const start = () => {
    stop();

    if (reduceMotion.matches) {
      renderStatic(0);
      return;
    }

    rafId = window.requestAnimationFrame(tick);
  };

  reduceMotion.addEventListener('change', start);
  window.addEventListener('resize', resize);

  resize();
  start();
})();
