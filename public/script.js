const blobs = [...document.querySelectorAll('.mesh__blob')];
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function setParallax(progressX, progressY) {
  if (!blobs.length) return;

  blobs.forEach((blob, index) => {
    const depth = (index + 1) / blobs.length;
    const range = 12 * depth;
    const tx = clamp(progressX * range, -12, 12).toFixed(2);
    const ty = clamp(progressY * range, -12, 12).toFixed(2);
    blob.style.setProperty('--tx', `${tx}px`);
    blob.style.setProperty('--ty', `${ty}px`);
  });
}

function setupPointerParallax() {
  const onMove = (event) => {
    const x = event.clientX / window.innerWidth - 0.5;
    const y = event.clientY / window.innerHeight - 0.5;
    setParallax(x * 2, y * 2);
  };

  window.addEventListener('pointermove', onMove, { passive: true });
}

function setupScrollParallax() {
  const onScroll = () => {
    const doc = document.documentElement;
    const scrollRoom = Math.max(doc.scrollHeight - window.innerHeight, 1);
    const progress = clamp(window.scrollY / scrollRoom, 0, 1) - 0.5;
    setParallax(0, progress * 2);
  };

  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

function initParallax() {
  if (prefersReducedMotion.matches) {
    setParallax(0, 0);
    return;
  }

  if (window.matchMedia('(pointer: fine)').matches && !window.matchMedia('(hover: none)').matches) {
    setupPointerParallax();
    return;
  }

  setupScrollParallax();
}

initParallax();
