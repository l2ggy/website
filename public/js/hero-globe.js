const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const setGlobeRotation = (target, x, y, bounds) => {
  const normalizedX = (x - bounds.left) / bounds.width - 0.5;
  const normalizedY = (y - bounds.top) / bounds.height - 0.5;
  const tiltX = clamp(-normalizedY * 26, -22, 22);
  const tiltY = clamp(normalizedX * 34, -28, 28);

  target.style.setProperty("--globe-tilt-x", `${tiltX.toFixed(2)}deg`);
  target.style.setProperty("--globe-tilt-y", `${tiltY.toFixed(2)}deg`);
};

export const setupHeroGlobe = () => {
  const globe = document.querySelector(".hero-globe");
  if (!globe) {
    return;
  }

  const reset = () => {
    globe.style.removeProperty("--globe-tilt-x");
    globe.style.removeProperty("--globe-tilt-y");
    globe.classList.remove("is-active");
  };

  globe.addEventListener("pointermove", (event) => {
    const bounds = globe.getBoundingClientRect();
    setGlobeRotation(globe, event.clientX, event.clientY, bounds);
    globe.classList.add("is-active");
  });

  globe.addEventListener("pointerleave", reset);
  globe.addEventListener("pointerup", reset);
};
