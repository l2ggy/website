const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const initHeroGlobe = () => {
  const globe = document.querySelector("#hero-globe");
  if (!globe) {
    return;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    return;
  }

  let activePointerId = null;

  const updateRotation = (event) => {
    const rect = globe.getBoundingClientRect();
    const dx = (event.clientX - rect.left) / rect.width - 0.5;
    const dy = (event.clientY - rect.top) / rect.height - 0.5;
    const rotateX = clamp(-dy * 42, -26, 26);
    const rotateY = clamp(dx * 52, -34, 34);

    globe.style.setProperty("--globe-rotate-x", `${rotateX}deg`);
    globe.style.setProperty("--globe-rotate-y", `${rotateY}deg`);
  };

  const settle = () => {
    globe.style.setProperty("--globe-rotate-x", "-10deg");
    globe.style.setProperty("--globe-rotate-y", "18deg");
  };

  globe.addEventListener("pointerdown", (event) => {
    activePointerId = event.pointerId;
    globe.setPointerCapture(event.pointerId);
    updateRotation(event);
  });

  globe.addEventListener("pointermove", (event) => {
    if (activePointerId === null || event.pointerId === activePointerId) {
      updateRotation(event);
    }
  });

  globe.addEventListener("pointerup", (event) => {
    if (event.pointerId !== activePointerId) {
      return;
    }
    activePointerId = null;
    globe.releasePointerCapture(event.pointerId);
    settle();
  });

  globe.addEventListener("pointerleave", () => {
    if (activePointerId === null) {
      settle();
    }
  });
};
