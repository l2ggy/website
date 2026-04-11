const root = document.documentElement;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const touchInput = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
const MAX_SHIFT = 10;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const setShift = (x, y) => {
  root.style.setProperty('--mesh-x', `${clamp(x, -MAX_SHIFT, MAX_SHIFT)}px`);
  root.style.setProperty('--mesh-y', `${clamp(y, -MAX_SHIFT, MAX_SHIFT)}px`);
};

if (!reducedMotion.matches) {
  if (touchInput) {
    const onScroll = () => {
      const offset = (window.scrollY || 0) * 0.04;
      setShift(offset * 0.2, -offset);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  } else {
    window.addEventListener('pointermove', (event) => {
      const x = (event.clientX / window.innerWidth - 0.5) * MAX_SHIFT * 2;
      const y = (event.clientY / window.innerHeight - 0.5) * MAX_SHIFT * 2;
      setShift(x, y);
    });

    window.addEventListener('pointerleave', () => setShift(0, 0));
  }
}
