const SPOTLIGHT_CLASS = "has-cursor-spotlight";
const FRAME_INTERVAL_MS = 1000 / 60;
const EASING = 0.14;

const isReducedMotionPreferred = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const isWithinSpotlightSection = (target) => {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(target.closest(`.${SPOTLIGHT_CLASS}`));
};

export const setupCursorSpotlight = () => {
  if (isReducedMotionPreferred()) {
    return;
  }

  const spotlight = document.createElement("div");
  spotlight.className = "cursor-spotlight";
  spotlight.setAttribute("aria-hidden", "true");
  document.body.append(spotlight);

  let pointerInside = false;
  let targetX = window.innerWidth * 0.5;
  let targetY = window.innerHeight * 0.38;
  let currentX = targetX;
  let currentY = targetY;
  let rafId = 0;
  let lastFrameTime = 0;

  const render = (timestamp) => {
    if (!pointerInside) {
      rafId = 0;
      return;
    }

    if (timestamp - lastFrameTime < FRAME_INTERVAL_MS) {
      rafId = requestAnimationFrame(render);
      return;
    }

    lastFrameTime = timestamp;
    currentX += (targetX - currentX) * EASING;
    currentY += (targetY - currentY) * EASING;
    spotlight.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;

    rafId = requestAnimationFrame(render);
  };

  const handlePointerMove = (event) => {
    if (!isWithinSpotlightSection(event.target)) {
      pointerInside = false;
      spotlight.classList.remove("is-active");
      return;
    }

    targetX = event.clientX;
    targetY = event.clientY;

    if (!pointerInside) {
      pointerInside = true;
      currentX = targetX;
      currentY = targetY;
      spotlight.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
      spotlight.classList.add("is-active");
    }

    if (!rafId) {
      rafId = requestAnimationFrame(render);
    }
  };

  const handlePointerLeaveWindow = () => {
    pointerInside = false;
    spotlight.classList.remove("is-active");
  };

  window.addEventListener("pointermove", handlePointerMove, { passive: true });
  document.addEventListener("pointerleave", handlePointerLeaveWindow, { passive: true });
};
