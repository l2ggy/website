(() => {
  const canvas = document.getElementById('smoke-layer');
  if (!(canvas instanceof HTMLCanvasElement)) return;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    noiseSeed: Math.random() * Math.PI * 2,
    particles: [],
    frameId: 0
  };

  const offscreen = document.createElement('canvas');

  const particleCount = 10;

  function makeParticle(index) {
    return {
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00015,
      vy: (Math.random() - 0.5) * 0.00015,
      radius: 0.12 + ((index % 4) * 0.02 + Math.random() * 0.05),
      opacity: 0.02 + Math.random() * 0.03
    };
  }

  function resize() {
    state.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    state.width = Math.max(320, Math.floor(window.innerWidth * 0.34));
    state.height = Math.max(220, Math.floor(window.innerHeight * 0.34));

    canvas.width = Math.floor(window.innerWidth * state.dpr);
    offscreen.width = state.width;
    offscreen.height = state.height;
    canvas.height = Math.floor(window.innerHeight * state.dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  }

  function drawStaticBase() {
    const gradient = ctx.createLinearGradient(0, 0, 0, window.innerHeight);
    gradient.addColorStop(0, '#1c1c1c');
    gradient.addColorStop(1, '#141414');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  }

  function drawFrame(time) {
    drawStaticBase();

    const octx = offscreen.getContext('2d');
    if (!octx) return;

    octx.fillStyle = '#181818';
    octx.fillRect(0, 0, state.width, state.height);

    for (const particle of state.particles) {
      const px = particle.x * state.width;
      const py = particle.y * state.height;
      const radius = particle.radius * Math.min(state.width, state.height);

      const puff = octx.createRadialGradient(px, py, radius * 0.18, px, py, radius);
      puff.addColorStop(0, `rgba(230,230,230,${particle.opacity})`);
      puff.addColorStop(1, 'rgba(220,220,220,0)');
      octx.fillStyle = puff;
      octx.beginPath();
      octx.arc(px, py, radius, 0, Math.PI * 2);
      octx.fill();
    }

    const grain = octx.createLinearGradient(0, 0, state.width, state.height);
    const drift = Math.sin(time * 0.00008 + state.noiseSeed) * 0.025;
    grain.addColorStop(0, `rgba(255,255,255,${0.012 + drift})`);
    grain.addColorStop(1, 'rgba(0,0,0,0.03)');
    octx.fillStyle = grain;
    octx.fillRect(0, 0, state.width, state.height);

    ctx.save();
    ctx.filter = 'blur(22px)';
    ctx.globalAlpha = 0.82;
    ctx.drawImage(offscreen, 0, 0, window.innerWidth, window.innerHeight);
    ctx.restore();
  }

  function step(time) {
    drawFrame(time);

    for (const particle of state.particles) {
      particle.x += particle.vx;
      particle.y += particle.vy;

      if (particle.x < -0.2 || particle.x > 1.2) particle.vx *= -1;
      if (particle.y < -0.2 || particle.y > 1.2) particle.vy *= -1;
    }

    state.frameId = requestAnimationFrame(step);
  }

  function initParticles() {
    state.particles = Array.from({ length: particleCount }, (_, index) => makeParticle(index));
  }

  function applyMotionPreference() {
    resize();
    initParticles();

    if (state.frameId) cancelAnimationFrame(state.frameId);

    if (prefersReducedMotion.matches) {
      drawFrame(0);
      return;
    }

    state.frameId = requestAnimationFrame(step);
  }

  window.addEventListener('resize', resize, { passive: true });
  prefersReducedMotion.addEventListener('change', () => {
    applyMotionPreference();
  });

  applyMotionPreference();
})();
