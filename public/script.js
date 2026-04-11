const canvas = document.querySelector(".dot-matrix-bg");
const context = canvas?.getContext("2d");

if (canvas && context) {
  const pointer = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 };
  const smoothPointer = { ...pointer };
  const dot = {
    spacing: 22,
    baseSize: 1.2,
    rippleAmplitude: 0.5,
    densityAmplitude: 0.2,
    maxPointerInfluence: 0.22,
    speed: 0.00045
  };

  const resize = () => {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.floor(window.innerWidth * pixelRatio);
    const height = Math.floor(window.innerHeight * pixelRatio);
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  };

  const setPointer = (x, y) => {
    pointer.x = x;
    pointer.y = y;
  };

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener(
    "pointermove",
    (event) => setPointer(event.clientX, event.clientY),
    { passive: true }
  );
  window.addEventListener(
    "pointerleave",
    () => setPointer(window.innerWidth * 0.5, window.innerHeight * 0.5),
    { passive: true }
  );

  const draw = (now) => {
    smoothPointer.x += (pointer.x - smoothPointer.x) * 0.06;
    smoothPointer.y += (pointer.y - smoothPointer.y) * 0.06;

    const width = window.innerWidth;
    const height = window.innerHeight;
    context.clearRect(0, 0, width, height);

    for (let y = 0; y <= height + dot.spacing; y += dot.spacing) {
      for (let x = 0; x <= width + dot.spacing; x += dot.spacing) {
        const travel = (x + y) * 0.018;
        const ripple = Math.sin(travel - now * dot.speed) * dot.rippleAmplitude;
        const density = Math.cos(y * 0.03 + now * dot.speed * 0.85) * dot.densityAmplitude;

        const dx = x - smoothPointer.x;
        const dy = y - smoothPointer.y;
        const distance = Math.hypot(dx, dy);
        const pointerField = Math.max(0, 1 - distance / 240) * dot.maxPointerInfluence;

        const radius = Math.max(0.65, dot.baseSize + ripple + pointerField * 0.65);
        const alpha = Math.min(0.34, Math.max(0.12, 0.2 + density + pointerField));
        const gray = Math.round(150 + pointerField * 30);

        context.fillStyle = `rgba(${gray}, ${gray}, ${gray}, ${alpha})`;
        context.beginPath();
        context.arc(x + ripple * 0.6, y, radius, 0, Math.PI * 2);
        context.fill();
      }
    }

    requestAnimationFrame(draw);
  };

  resize();
  requestAnimationFrame(draw);
}
