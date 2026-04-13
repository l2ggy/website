const SELECTOR = ".has-cursor-spotlight";
const MAX_FPS = 45;
const FRAME_INTERVAL = 1000 / MAX_FPS;
const LERP = 0.14;

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

export const setupCursorSpotlight = () => {
  if (prefersReducedMotion.matches) {
    return;
  }

  const spotlight = document.createElement("div");
  spotlight.className = "cursor-spotlight";
  spotlight.setAttribute("aria-hidden", "true");
  document.body.appendChild(spotlight);

  const state = {
    isActive: false,
    rafId: 0,
    lastFrameAt: 0,
    currentX: window.innerWidth / 2,
    currentY: window.innerHeight / 2,
    targetX: window.innerWidth / 2,
    targetY: window.innerHeight / 2
  };

  const setActive = (isActive) => {
    if (state.isActive === isActive) {
      return;
    }

    state.isActive = isActive;
    spotlight.classList.toggle("is-active", isActive);
  };

  const animate = (timestamp) => {
    state.rafId = 0;

    if (timestamp - state.lastFrameAt < FRAME_INTERVAL) {
      requestTick();
      return;
    }

    state.lastFrameAt = timestamp;
    state.currentX += (state.targetX - state.currentX) * LERP;
    state.currentY += (state.targetY - state.currentY) * LERP;

    spotlight.style.setProperty("--cursor-spotlight-x", `${state.currentX}px`);
    spotlight.style.setProperty("--cursor-spotlight-y", `${state.currentY}px`);

    if (Math.abs(state.targetX - state.currentX) > 0.2 || Math.abs(state.targetY - state.currentY) > 0.2) {
      requestTick();
    }
  };

  const requestTick = () => {
    if (!state.rafId) {
      state.rafId = window.requestAnimationFrame(animate);
    }
  };

  document.addEventListener("pointermove", (event) => {
    const target = event.target;
    const inSpotlightSection = target instanceof Element && Boolean(target.closest(SELECTOR));

    setActive(inSpotlightSection);

    if (!inSpotlightSection) {
      return;
    }

    state.targetX = event.clientX;
    state.targetY = event.clientY;
    requestTick();
  }, { passive: true });

  document.addEventListener("pointerleave", () => {
    setActive(false);
  });

  prefersReducedMotion.addEventListener("change", (event) => {
    if (event.matches) {
      spotlight.remove();
      if (state.rafId) {
        window.cancelAnimationFrame(state.rafId);
      }
    }
  });
};
