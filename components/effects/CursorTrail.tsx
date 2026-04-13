import { useEffect, useRef } from "react";

type Particle = {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  alpha: number;
};

const HERO_ZONE_SELECTOR = "[data-cursor-trail-zone], .hero, .intro";
const TARGET_FPS = 60;
const FRAME_MS = 1000 / TARGET_FPS;
const BASE_EMIT_RATE = 70;
const REDUCED_EMIT_RATE = 8;
const MAX_SPEED = 1400;
const NORMAL_POOL_SIZE = 160;
const REDUCED_POOL_SIZE = 24;

export default function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) {
      return;
    }

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let prefersReducedMotion = reducedMotionQuery.matches;

    const particles: Particle[] = Array.from(
      { length: prefersReducedMotion ? REDUCED_POOL_SIZE : NORMAL_POOL_SIZE },
      () => ({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 0,
        size: 0,
        alpha: 0,
      }),
    );

    const pointer = {
      active: false,
      insideZone: false,
      x: 0,
      y: 0,
      lastX: 0,
      lastY: 0,
      speed: 0,
      lastSampleTs: performance.now(),
      emitAccumulator: 0,
    };

    let rafId = 0;
    let lastFrameTs = performance.now();
    let isTabVisible = document.visibilityState === "visible";

    const updateCanvasSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const findInactiveParticle = () => {
      for (let i = 0; i < particles.length; i += 1) {
        if (!particles[i].active) {
          return particles[i];
        }
      }
      return null;
    };

    const emitParticle = (x: number, y: number, speedNorm: number) => {
      const particle = findInactiveParticle();
      if (!particle) {
        return;
      }

      const angle = Math.random() * Math.PI * 2;
      const spread = 10 + speedNorm * 50;
      const lifetime = 0.24 + speedNorm * 0.3;

      particle.active = true;
      particle.x = x;
      particle.y = y;
      particle.vx = Math.cos(angle) * spread;
      particle.vy = Math.sin(angle) * spread;
      particle.life = lifetime;
      particle.maxLife = lifetime;
      particle.size = 1.5 + speedNorm * 5;
      particle.alpha = prefersReducedMotion ? 0.18 : 0.42 + speedNorm * 0.45;
    };

    const isInsideTrailZone = (target: EventTarget | null, clientX: number, clientY: number) => {
      if (target instanceof Element) {
        return Boolean(target.closest(HERO_ZONE_SELECTOR));
      }
      const hovered = document.elementFromPoint(clientX, clientY);
      return Boolean(hovered?.closest(HERO_ZONE_SELECTOR));
    };

    const onPointerMove = (event: PointerEvent) => {
      const now = performance.now();
      const dt = Math.max((now - pointer.lastSampleTs) / 1000, 0.0001);
      const dx = event.clientX - pointer.lastX;
      const dy = event.clientY - pointer.lastY;
      const speed = Math.sqrt(dx * dx + dy * dy) / dt;

      pointer.insideZone = isInsideTrailZone(event.target, event.clientX, event.clientY);
      pointer.active = pointer.insideZone;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.speed = Math.min(speed, MAX_SPEED);
      pointer.lastX = event.clientX;
      pointer.lastY = event.clientY;
      pointer.lastSampleTs = now;
    };

    const onPointerLeave = () => {
      pointer.active = false;
      pointer.insideZone = false;
      pointer.speed = 0;
      pointer.emitAccumulator = 0;
    };

    const onVisibilityChange = () => {
      isTabVisible = document.visibilityState === "visible";
      if (!isTabVisible) {
        pointer.emitAccumulator = 0;
      }
    };

    const onReducedMotionChange = (event: MediaQueryListEvent) => {
      prefersReducedMotion = event.matches;
    };

    const tick = (now: number) => {
      rafId = window.requestAnimationFrame(tick);
      const elapsed = now - lastFrameTs;
      if (elapsed < FRAME_MS) {
        return;
      }

      const dt = elapsed / 1000;
      lastFrameTs = now;

      context.clearRect(0, 0, canvas.width, canvas.height);

      if (isTabVisible && pointer.active) {
        const speedNorm = Math.min(pointer.speed / MAX_SPEED, 1);
        const emitRate = (prefersReducedMotion ? REDUCED_EMIT_RATE : BASE_EMIT_RATE) * (0.1 + speedNorm * 1.4);
        pointer.emitAccumulator += emitRate * dt;

        while (pointer.emitAccumulator >= 1) {
          emitParticle(pointer.x, pointer.y, speedNorm);
          pointer.emitAccumulator -= 1;
        }
      }

      for (let i = 0; i < particles.length; i += 1) {
        const particle = particles[i];
        if (!particle.active) {
          continue;
        }

        particle.life -= dt;
        if (particle.life <= 0) {
          particle.active = false;
          continue;
        }

        const lifeRatio = particle.life / particle.maxLife;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vx *= 0.965;
        particle.vy *= 0.965;

        context.globalAlpha = particle.alpha * lifeRatio;
        context.fillStyle = "#7dd3fc";
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size * lifeRatio, 0, Math.PI * 2);
        context.fill();
      }

      context.globalAlpha = 1;
    };

    updateCanvasSize();

    window.addEventListener("resize", updateCanvasSize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("visibilitychange", onVisibilityChange);
    reducedMotionQuery.addEventListener("change", onReducedMotionChange);

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updateCanvasSize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      reducedMotionQuery.removeEventListener("change", onReducedMotionChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-10"
    />
  );
}
