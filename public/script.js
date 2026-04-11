(() => {
  const canvas = document.getElementById('topo-bg');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const rows = 48;
  const bands = 5;
  const speed = 0.00008;
  const waveLength = 0.0012;
  const amplitude = 28;
  const driftPush = 24;
  const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
  let rafId = 0;
  let width = 0;
  let height = 0;

  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * DPR);
    canvas.height = Math.floor(height * DPR);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  };

  const updatePointer = (event) => {
    pointer.tx = event.clientX / Math.max(width, 1);
    pointer.ty = event.clientY / Math.max(height, 1);
  };

  const throttleMs = 70;
  let allowAt = 0;
  window.addEventListener('pointermove', (event) => {
    const now = performance.now();
    if (now < allowAt) return;
    allowAt = now + throttleMs;
    updatePointer(event);
  });

  window.addEventListener('resize', resize);
  resize();

  const draw = (time) => {
    const t = time * speed;
    pointer.x += (pointer.tx - pointer.x) * 0.04;
    pointer.y += (pointer.ty - pointer.y) * 0.04;

    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 0.7;
    ctx.strokeStyle = 'rgba(204, 208, 214, 0.26)';

    const step = height / (rows - 1);
    const cursorInfluence = (pointer.x - 0.5) * driftPush;

    for (let row = 0; row < rows; row += 1) {
      const baseY = row * step;
      ctx.beginPath();

      for (let x = 0; x <= width; x += 6) {
        const xn = x * waveLength;
        let y = baseY;

        for (let band = 1; band <= bands; band += 1) {
          const bandScale = amplitude / (band * 4.2);
          y += Math.sin(xn * band + t * (1 + band * 0.18) + row * 0.32) * bandScale;
        }

        const drift = Math.sin(t * 2 + row * 0.25) * 5;
        const cursorOffset =
          Math.exp(-Math.pow(pointer.y - row / rows, 2) * 28) * cursorInfluence;

        y += drift + cursorOffset;

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
    }

    rafId = window.requestAnimationFrame(draw);
  };

  rafId = window.requestAnimationFrame(draw);

  window.addEventListener('beforeunload', () => {
    window.cancelAnimationFrame(rafId);
  });
})();
