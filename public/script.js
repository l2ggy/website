(() => {
  const canvas = document.querySelector('.topo-bg');
  if (!canvas) return;

  const context = canvas.getContext('2d', { alpha: false });
  if (!context) return;

  const settings = {
    spacing: 22,
    amplitude: 18,
    wavelength: 0.0038,
    driftSpeed: 0.00014,
    distortionRadius: 140,
    distortionStrength: 8,
    background: '#0b0d12',
    stroke: 'rgba(205, 211, 224, 0.18)',
    lineWidth: 1,
  };

  let width = 0;
  let height = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let pointer = { x: 0, y: 0, active: false };
  let pointerTarget = { x: 0, y: 0, active: false };
  let lastPointerSample = 0;

  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const onPointerMove = (event) => {
    const now = performance.now();
    if (now - lastPointerSample < 32) return;
    lastPointerSample = now;
    pointerTarget.x = event.clientX;
    pointerTarget.y = event.clientY;
    pointerTarget.active = true;
  };

  const onPointerLeave = () => {
    pointerTarget.active = false;
  };

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerleave', onPointerLeave);

  resize();

  const updatePointer = () => {
    pointer.active = pointer.active || pointerTarget.active;
    pointer.x += (pointerTarget.x - pointer.x) * 0.06;
    pointer.y += (pointerTarget.y - pointer.y) * 0.06;

    if (!pointerTarget.active) {
      pointer.active = Math.hypot(pointerTarget.x - pointer.x, pointerTarget.y - pointer.y) > 0.5;
    }
  };

  const draw = (time) => {
    const t = time * settings.driftSpeed;
    updatePointer();

    context.fillStyle = settings.background;
    context.fillRect(0, 0, width, height);

    context.strokeStyle = settings.stroke;
    context.lineWidth = settings.lineWidth;

    const totalLines = Math.ceil(height / settings.spacing) + 6;

    for (let line = -3; line < totalLines; line += 1) {
      const yBase = line * settings.spacing;
      context.beginPath();

      for (let x = -40; x <= width + 40; x += 12) {
        let y = yBase;
        y += Math.sin((x + line * 18) * settings.wavelength + t + line * 0.33) * settings.amplitude;

        if (pointer.active) {
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const distance = Math.hypot(dx, dy);
          if (distance < settings.distortionRadius && distance > 0) {
            const force = (1 - distance / settings.distortionRadius) * settings.distortionStrength;
            y += (dy / distance) * force;
          }
        }

        if (x === -40) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      }

      context.stroke();
    }

    requestAnimationFrame(draw);
  };

  requestAnimationFrame(draw);
})();
