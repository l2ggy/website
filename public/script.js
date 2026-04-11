(() => {
  const canvas = document.getElementById('topo-background');
  if (!canvas) return;

  const context = canvas.getContext('2d');
  if (!context) return;

  const config = {
    spacing: 16,
    lineWidth: 1,
    amplitude: 20,
    noiseAmplitude: 5,
    frequency: 0.008,
    driftSpeed: 0.00012,
    pointerRadius: 220,
    pointerStrength: 0.08,
  };

  const pointer = {
    x: 0,
    y: 0,
    active: false,
    dirty: false,
  };

  let width = 0;
  let height = 0;
  let rafId = 0;

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function updatePointer(event) {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
    pointer.dirty = true;
  }

  function draw(time) {
    context.clearRect(0, 0, width, height);
    context.strokeStyle = getComputedStyle(document.documentElement)
      .getPropertyValue('--bg-stroke')
      .trim();
    context.lineWidth = config.lineWidth;

    const t = time * config.driftSpeed;
    const lineCount = Math.ceil(height / config.spacing) + 3;

    for (let lineIndex = -1; lineIndex < lineCount; lineIndex += 1) {
      const baseY = lineIndex * config.spacing;
      context.beginPath();

      for (let x = 0; x <= width + 20; x += 20) {
        const wave = Math.sin((x * config.frequency) + (lineIndex * 0.3) + t) * config.amplitude;
        const noise = Math.sin((x * 0.021) + (lineIndex * 0.65) + (t * 0.75)) * config.noiseAmplitude;

        let y = baseY + wave + noise;

        if (pointer.active) {
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const distance = Math.hypot(dx, dy);

          if (distance < config.pointerRadius) {
            const influence = (1 - (distance / config.pointerRadius)) * config.pointerStrength;
            y -= dy * influence;
          }
        }

        if (x === 0) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      }

      context.stroke();
    }

    pointer.dirty = false;
    rafId = window.requestAnimationFrame(draw);
  }

  function onPointerMove(event) {
    if (pointer.dirty) return;
    window.requestAnimationFrame(() => updatePointer(event));
  }

  function onPointerLeave() {
    pointer.active = false;
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerleave', onPointerLeave);
  rafId = window.requestAnimationFrame(draw);

  window.addEventListener('beforeunload', () => {
    window.cancelAnimationFrame(rafId);
  });
})();
