(() => {
  const canvas = document.createElement('canvas');
  canvas.className = 'topo-bg';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = { x: -1, y: -1 };
  let pointerDirty = false;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let lineCount = 0;
  let rafId = 0;
  const lineColor = getComputedStyle(document.documentElement).getPropertyValue('--line').trim() || 'rgba(176, 184, 197, 0.28)';

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lineCount = Math.max(18, Math.round(height / 32));
    draw(performance.now() * 0.001);
  };

  const updatePointer = (event) => {
    if (pointerDirty) return;
    pointerDirty = true;
    requestAnimationFrame(() => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointerDirty = false;
    });
  };

  const clearPointer = () => {
    pointer.x = -1;
    pointer.y = -1;
  };

  const draw = (time) => {
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;

    const stepY = height / lineCount;
    const wave = 8;
    const cursorRadius = Math.min(width, height) * 0.2;

    for (let line = 0; line < lineCount; line += 1) {
      const baseY = stepY * line;
      const seed = line * 0.55;

      ctx.beginPath();
      for (let x = 0; x <= width; x += 12) {
        const drift = Math.sin(x * 0.008 + time * 0.22 + seed) * wave;
        const cross = Math.sin(x * 0.004 - time * 0.14 + seed * 2) * (wave * 0.4);
        let y = baseY + drift + cross;

        if (pointer.x >= 0 && pointer.y >= 0) {
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const dist = Math.hypot(dx, dy);
          if (dist < cursorRadius) {
            const influence = 1 - dist / cursorRadius;
            y += (dy / cursorRadius) * 6 * influence;
          }
        }

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  };

  const tick = () => {
    draw(performance.now() * 0.001);
    rafId = requestAnimationFrame(tick);
  };

  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', updatePointer, { passive: true });
  window.addEventListener('touchmove', (event) => {
    const touch = event.touches[0];
    if (touch) updatePointer(touch);
  }, { passive: true });
  window.addEventListener('mouseleave', clearPointer);

  resize();
  if (!mediaQuery.matches) rafId = requestAnimationFrame(tick);
  mediaQuery.addEventListener('change', (event) => {
    if (event.matches) {
      cancelAnimationFrame(rafId);
      draw(performance.now() * 0.001);
      return;
    }
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
  });
})();
