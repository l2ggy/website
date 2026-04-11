(() => {
  const canvas = document.createElement('canvas');
  canvas.className = 'dot-matrix-bg';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const pointer = { x: 0.5, y: 0.5, active: false };
  const DOT_GAP = 22;
  const MIN_ALPHA = 0.05;
  const MAX_ALPHA = 0.2;

  let width = 0;
  let height = 0;
  let dpr = 1;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const onResize = () => {
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const setPointer = (x, y, active = true) => {
    pointer.x = clamp(x / Math.max(width, 1), 0, 1);
    pointer.y = clamp(y / Math.max(height, 1), 0, 1);
    pointer.active = active;
  };

  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('mousemove', (event) => setPointer(event.clientX, event.clientY), { passive: true });
  window.addEventListener('touchmove', (event) => {
    if (event.touches[0]) setPointer(event.touches[0].clientX, event.touches[0].clientY);
  }, { passive: true });
  window.addEventListener('mouseleave', () => {
    pointer.active = false;
  });

  onResize();

  const draw = (time) => {
    const t = time * 0.00035;
    ctx.clearRect(0, 0, width, height);

    for (let y = DOT_GAP * 0.5; y <= height + DOT_GAP; y += DOT_GAP) {
      for (let x = DOT_GAP * 0.5; x <= width + DOT_GAP; x += DOT_GAP) {
        const wave = Math.sin((x * 0.018) + t) * Math.cos((y * 0.014) - t * 1.1);
        const ripple = Math.sin((x + y) * 0.008 + t * 1.8);

        let density = 0.5 + wave * 0.2 + ripple * 0.1;
        if (pointer.active) {
          const dx = (x / Math.max(width, 1)) - pointer.x;
          const dy = (y / Math.max(height, 1)) - pointer.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          density += Math.max(0, 0.18 - dist * 0.5);
        }

        const alpha = clamp(MIN_ALPHA + density * 0.2, MIN_ALPHA, MAX_ALPHA);
        const radius = 0.95 + clamp(density, 0, 1) * 0.6;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(235, 235, 235, ${alpha.toFixed(3)})`;
        ctx.fill();
      }
    }

    requestAnimationFrame(draw);
  };

  requestAnimationFrame(draw);
})();
