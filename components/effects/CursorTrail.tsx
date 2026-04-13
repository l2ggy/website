import { useEffect, useRef } from "react";

type CursorTrailProps = {
  zoneSelectors?: string[];
  className?: string;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  opacity: number;
  active: boolean;
};

const MAX_PARTICLES = 120;
const BASE_LIFE_MS = 460;
const EMISSION_BASE = 20;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const CursorTrail = ({ zoneSelectors = [".hero", ".intro", "#hero", "#intro"], className }: CursorTrailProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const particles: Particle[] = Array.from({ length: MAX_PARTICLES }, () => ({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 0,
      life: 0,
      maxLife: BASE_LIFE_MS,
      opacity: 0,
      active: false,
    }));

    let nextPoolIndex = 0;
    let rafId = 0;
    let lastFrame = performance.now();
    let emissionCarry = 0;
    let hidden = document.hidden;
    let reducedMotion = reducedMotionQuery.matches;

    const pointer = {
      x: 0,
      y: 0,
      px: 0,
      py: 0,
      speed: 0,
      hasPointer: false,
      withinZone: false,
      lastMoveAt: 0,
    };

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = "100vw";
      canvas.style.height = "100vh";
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const inAllowedZone = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return false;
      return zoneSelectors.some((selector) => target.closest(selector));
    };

    const spawnParticle = (x: number, y: number, intensity: number) => {
      const particle = particles[nextPoolIndex];
      nextPoolIndex = (nextPoolIndex + 1) % particles.length;

      const angle = Math.random() * Math.PI * 2;
      const velocity = 0.08 + intensity * 0.18;
      particle.x = x;
      particle.y = y;
      particle.vx = Math.cos(angle) * velocity;
      particle.vy = Math.sin(angle) * velocity;
      particle.size = 1 + intensity * 5;
      particle.maxLife = BASE_LIFE_MS + intensity * 240;
      particle.life = particle.maxLife;
      particle.opacity = 0.12 + intensity * 0.38;
      particle.active = true;
    };

    const onPointerMove = (event: PointerEvent) => {
      const now = performance.now();
      const isInZone = inAllowedZone(event.target);
      pointer.withinZone = isInZone;

      if (!isInZone) {
        pointer.hasPointer = false;
        return;
      }

      if (!pointer.hasPointer) {
        pointer.px = event.clientX;
        pointer.py = event.clientY;
      }

      const dt = Math.max(now - pointer.lastMoveAt, 8);
      const dx = event.clientX - pointer.px;
      const dy = event.clientY - pointer.py;
      const speed = Math.hypot(dx, dy) / dt;

      pointer.speed = speed;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.px = event.clientX;
      pointer.py = event.clientY;
      pointer.lastMoveAt = now;
      pointer.hasPointer = true;
    };

    const onPointerLeave = () => {
      pointer.hasPointer = false;
      pointer.withinZone = false;
    };

    const onVisibilityChange = () => {
      hidden = document.hidden;
      if (!hidden) lastFrame = performance.now();
    };

    const onMotionChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
    };

    const draw = (now: number) => {
      const delta = clamp(now - lastFrame, 0, 40);
      lastFrame = now;

      context.clearRect(0, 0, window.innerWidth, window.innerHeight);

      if (!hidden && pointer.hasPointer && pointer.withinZone) {
        const normalizedSpeed = clamp(pointer.speed / 1.8, 0, 1);
        const motionScale = reducedMotion ? 0.08 : 1;
        const emissionRate = EMISSION_BASE * (0.2 + normalizedSpeed * 1.5) * motionScale;
        emissionCarry += (emissionRate * delta) / 1000;

        while (emissionCarry >= 1) {
          spawnParticle(pointer.x, pointer.y, normalizedSpeed * motionScale);
          emissionCarry -= 1;
        }
      }

      for (let i = 0; i < particles.length; i += 1) {
        const particle = particles[i];
        if (!particle.active) continue;

        particle.life -= delta;
        if (particle.life <= 0) {
          particle.active = false;
          continue;
        }

        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;
        particle.vx *= 0.985;
        particle.vy *= 0.985;

        const lifeRatio = particle.life / particle.maxLife;
        const alpha = particle.opacity * lifeRatio;
        context.beginPath();
        context.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
        context.arc(particle.x, particle.y, particle.size * (0.6 + lifeRatio * 0.8), 0, Math.PI * 2);
        context.fill();
      }

      rafId = window.requestAnimationFrame(draw);
    };

    resizeCanvas();
    rafId = window.requestAnimationFrame(draw);

    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("visibilitychange", onVisibilityChange);
    reducedMotionQuery.addEventListener("change", onMotionChange);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      reducedMotionQuery.removeEventListener("change", onMotionChange);
    };
  }, [zoneSelectors]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 2,
      }}
    />
  );
};

export default CursorTrail;
