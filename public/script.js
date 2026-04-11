(() => {
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reducedMotion) {
    root.style.setProperty('--mesh-shift-x', '0px');
    root.style.setProperty('--mesh-shift-y', '0px');
    return;
  }

  const maxShift = 14;
  const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value));
  const prefersTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  const applyShift = (x, y) => {
    root.style.setProperty('--mesh-shift-x', `${clamp(x, maxShift)}px`);
    root.style.setProperty('--mesh-shift-y', `${clamp(y, maxShift)}px`);
  };

  if (!prefersTouch) {
    window.addEventListener('pointermove', (event) => {
      const xRatio = event.clientX / window.innerWidth - 0.5;
      const yRatio = event.clientY / window.innerHeight - 0.5;
      applyShift(xRatio * maxShift * 2, yRatio * maxShift * 2);
    });
    return;
  }

  const onScroll = () => {
    const maxScroll = Math.max(1, document.body.scrollHeight - window.innerHeight);
    const progress = Math.min(1, window.scrollY / maxScroll);
    applyShift(0, (progress - 0.5) * maxShift * 2);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
