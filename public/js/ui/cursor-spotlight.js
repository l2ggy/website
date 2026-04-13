const SPOTLIGHT_CLASS = "has-cursor-spotlight";
const ACTIVE_CLASS = "is-cursor-spotlight-active";
const FPS_LIMIT = 48;
const FRAME_INTERVAL = 1000 / FPS_LIMIT;
const LERP_AMOUNT = 0.15;

export const setupCursorSpotlight = () => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const targets = document.querySelectorAll(`.${SPOTLIGHT_CLASS}`);

  if (prefersReducedMotion.matches || !targets.length) {
    return;
  }

  const overlay = document.createElement("div");
  overlay.className = "cursor-spotlight-overlay";
  document.body.append(overlay);

  const state = {
    pointerX: window.innerWidth * 0.5,
    pointerY: window.innerHeight * 0.5,
    currentX: window.innerWidth * 0.5,
    currentY: window.innerHeight * 0.5,
    active: false,
    rafId: 0,
    lastFrameTime: 0
  };

  const updateOverlay = () => {
    overlay.style.setProperty("--spotlight-x", `${state.currentX}px`);
    overlay.style.setProperty("--spotlight-y", `${state.currentY}px`);
  };

  const tick = (time) => {
    state.rafId = window.requestAnimationFrame(tick);
    if (time - state.lastFrameTime < FRAME_INTERVAL) {
      return;
    }
    state.lastFrameTime = time;
    state.currentX += (state.pointerX - state.currentX) * LERP_AMOUNT;
    state.currentY += (state.pointerY - state.currentY) * LERP_AMOUNT;
    updateOverlay();
  };

  const setActive = (isActive) => {
    if (state.active === isActive) {
      return;
    }
    state.active = isActive;
    document.body.classList.toggle(ACTIVE_CLASS, isActive);
  };

  const handlePointerMove = (event) => {
    state.pointerX = event.clientX;
    state.pointerY = event.clientY;
    setActive(Boolean(event.target.closest(`.${SPOTLIGHT_CLASS}`)));
  };

  const handlePointerLeave = () => setActive(false);

  updateOverlay();
  state.rafId = window.requestAnimationFrame(tick);

  window.addEventListener("pointermove", handlePointerMove, { passive: true });
  document.addEventListener("pointerleave", handlePointerLeave, { passive: true });
};
