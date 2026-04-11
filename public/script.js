(() => {
  const canvas = document.querySelector('[data-dot-matrix-bg]');
  if (!canvas) return;

  const context = canvas.getContext('2d', { alpha: false });
  if (!context) return;

  const pointer = { x: 0.5, y: 0.5, active: false };
  const spacing = 24;

  let width = 0;
  let height = 0;
  let cols = 0;
  let rows = 0;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const onPointerMove = (event) => {
    pointer.x = event.clientX / width;
    pointer.y = event.clientY / height;
    pointer.active = true;
  };

  const onPointerLeave = () => {
    pointer.active = false;
  };

  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;

    const scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * scale);
    canvas.height = Math.floor(height * scale);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    context.setTransform(scale, 0, 0, scale, 0, 0);
    cols = Math.ceil(width / spacing) + 2;
    rows = Math.ceil(height / spacing) + 2;
  };

  const draw = (timeMs) => {
    const t = timeMs * 0.00035;

    context.fillStyle = '#08090b';
    context.fillRect(0, 0, width, height);

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const x = col * spacing;
        const y = row * spacing;

        const ripple = Math.sin(col * 0.45 + t) * Math.cos(row * 0.4 - t * 0.85);
        const drift = Math.sin((col + row) * 0.3 + t * 1.2);

        let cursorLift = 0;
        if (pointer.active) {
          const dx = pointer.x * width - x;
          const dy = pointer.y * height - y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          cursorLift = Math.exp(-distance / 210) * 0.2;
        }

        const density = clamp(0.34 + ripple * 0.12 + drift * 0.08 + cursorLift, 0.2, 0.56);
        const radius = 1.1 + density * 0.9;
        const channel = Math.round(145 + density * 70);

        context.fillStyle = `rgba(${channel}, ${channel}, ${channel}, ${density})`;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
      }
    }

    requestAnimationFrame(draw);
  };

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerleave', onPointerLeave);

  resize();
  requestAnimationFrame(draw);
})();
