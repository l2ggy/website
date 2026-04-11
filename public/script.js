const root = document.documentElement;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const setOffsets = (x, y) => {
  root.style.setProperty('--mesh-x', `${x.toFixed(2)}px`);
  root.style.setProperty('--mesh-y', `${y.toFixed(2)}px`);
};

if (prefersReducedMotion) {
  setOffsets(0, 0);
} else {
  const pointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
  const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value));

  if (pointerQuery.matches) {
    const range = 18;
    window.addEventListener(
      'pointermove',
      (event) => {
        const x = ((event.clientX / window.innerWidth) * 2 - 1) * range;
        const y = ((event.clientY / window.innerHeight) * 2 - 1) * range;
        setOffsets(clamp(x, range), clamp(y, range));
      },
      { passive: true }
    );
  } else {
    const range = 10;
    const handleScroll = () => {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.min(1, window.scrollY / maxScroll);
      const y = (progress * 2 - 1) * range;
      setOffsets(0, clamp(y, range));
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
  }
}
