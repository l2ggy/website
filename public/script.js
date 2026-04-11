(() => {
  const canvas = document.getElementById('smoke-bg');
  if (!(canvas instanceof HTMLCanvasElement)) {
    return;
  }

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    return;
  }

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const smokeLayers = [
    { speed: 0.018, radius: 0.28, alpha: 0.05, offset: 0.0 },
    { speed: 0.013, radius: 0.23, alpha: 0.04, offset: 1.8 },
    { speed: 0.009, radius: 0.2, alpha: 0.03, offset: 3.6 },
  ];

  let width = 0;
  let height = 0;
  let renderWidth = 0;
  let renderHeight = 0;
  let rafId = 0;
  let startTime = 0;

  const clampResolution = () => {
    width = window.innerWidth;
    height = window.innerHeight;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    renderWidth = Math.max(220, Math.floor(width * 0.38));
    renderHeight = Math.max(220, Math.floor(height * 0.38));
  };

  const drawSmoke = (timeSeconds) => {
    ctx.save();
    ctx.fillStyle = '#101010';
    ctx.fillRect(0, 0, width, height);

    ctx.scale(width / renderWidth, height / renderHeight);
    ctx.filter = 'blur(18px)';

    for (const layer of smokeLayers) {
      const x = renderWidth * (0.5 + Math.sin(timeSeconds * layer.speed + layer.offset) * 0.18);
      const y = renderHeight * (0.5 + Math.cos(timeSeconds * layer.speed * 1.12 + layer.offset) * 0.18);
      const r = Math.min(renderWidth, renderHeight) * layer.radius;

      const gradient = ctx.createRadialGradient(x, y, r * 0.12, x, y, r);
      gradient.addColorStop(0, `rgba(220, 220, 220, ${layer.alpha})`);
      gradient.addColorStop(1, 'rgba(220, 220, 220, 0)');

      ctx.fillStyle = gradient;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    ctx.restore();
  };

  const tick = (timestamp) => {
    if (!startTime) {
      startTime = timestamp;
    }

    drawSmoke((timestamp - startTime) * 0.001);
    rafId = window.requestAnimationFrame(tick);
  };

  const render = () => {
    window.cancelAnimationFrame(rafId);
    startTime = 0;
    drawSmoke(0);

    if (!motionQuery.matches) {
      rafId = window.requestAnimationFrame(tick);
    }
  };

  clampResolution();
  render();

  window.addEventListener('resize', () => {
    clampResolution();
    render();
  });

  motionQuery.addEventListener('change', render);
})();
