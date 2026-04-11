(() => {
  const root = document.documentElement;

  let rafId = 0;
  let lastX = window.innerWidth / 2;
  let lastY = window.innerHeight / 2;
  let boost = 0;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const paint = () => {
    rafId = 0;
    const x = (lastX / window.innerWidth) * 100;
    const y = (lastY / window.innerHeight) * 100;

    root.style.setProperty('--mx', `${x.toFixed(2)}%`);
    root.style.setProperty('--my', `${y.toFixed(2)}%`);
    root.style.setProperty('--density-boost', boost.toFixed(3));
  };

  const queuePaint = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(paint);
  };

  const onPointerMove = (event) => {
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;

    const velocity = Math.hypot(dx, dy);
    boost = clamp(boost * 0.78 + velocity / 220, 0, 0.35);
    queuePaint();
  };

  const onResize = () => {
    lastX = clamp(lastX, 0, window.innerWidth);
    lastY = clamp(lastY, 0, window.innerHeight);
    queuePaint();
  };

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('resize', onResize);
  queuePaint();

  setInterval(() => {
    boost = Math.max(0, boost * 0.8 - 0.01);
    queuePaint();
  }, 140);
})();
