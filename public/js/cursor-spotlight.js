const ACTIVE_SECTION_CLASS = "has-cursor-spotlight";
const ACTIVE_BODY_CLASS = "cursor-spotlight-active";
const STATIC_BODY_CLASS = "cursor-spotlight-static";

export const setupCursorSpotlight = () => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.body.classList.add(STATIC_BODY_CLASS);
    return;
  }

  const sections = Array.from(document.querySelectorAll(`.${ACTIVE_SECTION_CLASS}`));
  if (!sections.length) {
    return;
  }

  const overlay = document.createElement("div");
  overlay.className = "cursor-spotlight-overlay";
  overlay.setAttribute("aria-hidden", "true");
  document.body.appendChild(overlay);

  let targetX = window.innerWidth * 0.5;
  let targetY = window.innerHeight * 0.25;
  let currentX = targetX;
  let currentY = targetY;
  let rafId = 0;
  let lastTs = 0;
  let isActive = false;

  const tick = (timestamp) => {
    if (!lastTs) {
      lastTs = timestamp;
    }

    const delta = Math.min(timestamp - lastTs, 34);
    lastTs = timestamp;
    const ease = 1 - Math.pow(0.001, delta / 220);

    currentX += (targetX - currentX) * ease;
    currentY += (targetY - currentY) * ease;

    const settled = Math.abs(targetX - currentX) < 0.35 && Math.abs(targetY - currentY) < 0.35;
    overlay.style.setProperty("--cursor-x", `${currentX.toFixed(2)}px`);
    overlay.style.setProperty("--cursor-y", `${currentY.toFixed(2)}px`);

    if (!isActive && settled) {
      rafId = 0;
      return;
    }

    rafId = requestAnimationFrame(tick);
  };

  const ensureTicking = () => {
    if (!rafId) {
      lastTs = 0;
      rafId = requestAnimationFrame(tick);
    }
  };

  const setActive = (active) => {
    if (isActive === active) {
      return;
    }

    isActive = active;
    document.body.classList.toggle(ACTIVE_BODY_CLASS, active);
    ensureTicking();
  };

  document.addEventListener("pointermove", (event) => {
    targetX = event.clientX;
    targetY = event.clientY;

    const activeSection = event.target instanceof Element && event.target.closest(`.${ACTIVE_SECTION_CLASS}`);
    setActive(Boolean(activeSection));
    ensureTicking();
  });

  document.addEventListener("pointerleave", () => {
    setActive(false);
  });
};
