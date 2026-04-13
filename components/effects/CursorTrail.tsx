import { useEffect, useRef } from "react";

type Particle = {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  size: number;
  opacity: number;
};

const MAX_PARTICLES = 160;
const ZONE_SELECTOR = "[data-cursor-trail-zone], .hero, .intro, #hero, #intro";

function isTrailZone(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(ZONE_SELECTOR));
}

export default function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motionQuery.matches;
    let hidden = document.visibilityState !== "visible";

    const particles: Particle[] = Array.from({ length: MAX_PARTICLES }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      ttl: 0,
      size: 0,
      opacity: 0,
    }));

    let poolCursor = 0;
    let inZone = false;
    let pointerX = 0;
    let pointerY = 0;
    let lastX = 0;
    let lastY = 0;
    let lastMove = performance.now();
    let pointerSpeed = 0;
    let emitCarry = 0;
    let rafId = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawn = () => {
      const particle = particles[poolCursor];
      poolCursor = (poolCursor + 1) % MAX_PARTICLES;

      const speedRatio = Math.min(pointerSpeed / 1.3, 1);
      const baseSize = reducedMotion ? 1 : 2;
      const baseOpacity = reducedMotion ? 0.12 : 0.2;
      const jitter = (Math.random() - 0.5) * 8;

      particle.active = true;
      particle.x = pointerX + jitter;
      particle.y = pointerY + jitter;
      particle.vx = (Math.random() - 0.5) * (0.2 + speedRatio * 0.6);
      particle.vy = (Math.random() - 0.5) * (0.2 + speedRatio * 0.6);
      particle.life = 0;
      particle.ttl = reducedMotion ? 280 : 520;
      particle.size = baseSize + speedRatio * 5;
      particle.opacity = baseOpacity + speedRatio * 0.55;
    };

    const onPointerMove = (event: PointerEvent) => {
      const now = performance.now();
      const dt = Math.max(now - lastMove, 16);
      pointerX = event.clientX;
      pointerY = event.clientY;
      const dx = pointerX - lastX;
      const dy = pointerY - lastY;
      pointerSpeed = Math.hypot(dx, dy) / dt;
      lastX = pointerX;
      lastY = pointerY;
      lastMove = now;
      inZone = isTrailZone(event.target);
    };

    const onPointerLeave = () => {
      inZone = false;
    };

    const onVisibilityChange = () => {
      hidden = document.visibilityState !== "visible";
      if (hidden) {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    const onMotionChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
    };

    const tick = () => {
      rafId = requestAnimationFrame(tick);
      if (hidden) return;

      context.clearRect(0, 0, window.innerWidth, window.innerHeight);

      if (inZone) {
        const emissionsPerFrame = reducedMotion
          ? Math.min(pointerSpeed * 2, 0.25)
          : Math.min(pointerSpeed * 22, 3.5);
        emitCarry += emissionsPerFrame;
        while (emitCarry >= 1) {
          spawn();
          emitCarry -= 1;
        }
      } else {
        emitCarry = 0;
      }

      for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index];
        if (!particle.active) continue;

        particle.life += 16;
        if (particle.life >= particle.ttl) {
          particle.active = false;
          continue;
        }

        particle.x += particle.vx;
        particle.y += particle.vy;

        const fade = 1 - particle.life / particle.ttl;
        context.globalAlpha = particle.opacity * fade;
        context.fillStyle = "#7dd3fc";
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size * fade, 0, Math.PI * 2);
        context.fill();
      }

      context.globalAlpha = 1;
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    motionQuery.addEventListener("change", onMotionChange);
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      motionQuery.removeEventListener("change", onMotionChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-20"
    />
  );
}
