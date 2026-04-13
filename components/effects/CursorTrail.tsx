import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  size: number;
  alpha: number;
  active: boolean;
};

type CursorTrailProps = {
  zoneSelectors?: string[];
  maxParticles?: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const queryZones = (selectors: string[]) =>
  selectors
    .map((selector) => document.querySelector(selector))
    .filter((el): el is Element => Boolean(el));

export default function CursorTrail({
  zoneSelectors = [".hero", "#intro", ".intro", "[data-intro-zone]"],
  maxParticles = 140,
}: CursorTrailProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let zones = queryZones(zoneSelectors);
    let dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    let pointerActive = false;
    let visible = !document.hidden;
    let lastX = 0;
    let lastY = 0;
    let lastMoveTime = 0;
    let emitRemainder = 0;
    let rafId = 0;
    let lastFrame = performance.now();

    const pool: Particle[] = Array.from({ length: maxParticles }, () => ({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      ttl: 0,
      size: 0,
      alpha: 0,
      active: false,
    }));

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    const updateBounds = () => {
      zones = queryZones(zoneSelectors);
      dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const isInZone = (x: number, y: number) =>
      zones.some((zone) => {
        const rect = zone.getBoundingClientRect();
        return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
      });

    const emit = (x: number, y: number, speed: number) => {
      const speedNorm = clamp(speed / 1200, 0, 1);
      const count = reducedMotion.matches ? 0.2 : 1 + speedNorm * 4;
      emitRemainder += count;
      const emissionCount = Math.floor(emitRemainder);
      emitRemainder -= emissionCount;

      let spawned = 0;
      for (let i = 0; i < pool.length && spawned < emissionCount; i += 1) {
        const particle = pool[i];
        if (particle.active) continue;
        const angle = Math.random() * Math.PI * 2;
        const spread = reducedMotion.matches ? 6 : 14;
        const velocity = reducedMotion.matches ? 8 : 14 + speedNorm * 40;

        particle.active = true;
        particle.x = x + (Math.random() - 0.5) * spread;
        particle.y = y + (Math.random() - 0.5) * spread;
        particle.vx = Math.cos(angle) * velocity * 0.15;
        particle.vy = Math.sin(angle) * velocity * 0.15;
        particle.ttl = reducedMotion.matches ? 0.2 : 0.35 + speedNorm * 0.35;
        particle.life = particle.ttl;
        particle.size = reducedMotion.matches ? 1.2 : 1.6 + speedNorm * 2.8;
        particle.alpha = reducedMotion.matches ? 0.22 : 0.3 + speedNorm * 0.45;
        spawned += 1;
      }
    };

    const step = (now: number) => {
      const dt = clamp((now - lastFrame) / 1000, 0, 0.05);
      lastFrame = now;
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (let i = 0; i < pool.length; i += 1) {
        const particle = pool[i];
        if (!particle.active) continue;

        particle.life -= dt;
        if (particle.life <= 0) {
          particle.active = false;
          continue;
        }

        const progress = particle.life / particle.ttl;
        particle.vx *= 0.96;
        particle.vy *= 0.96;
        particle.x += particle.vx;
        particle.y += particle.vy;

        context.beginPath();
        context.fillStyle = `rgba(120, 180, 255, ${particle.alpha * progress})`;
        context.arc(particle.x, particle.y, particle.size * progress, 0, Math.PI * 2);
        context.fill();
      }

      rafId = requestAnimationFrame(step);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!visible) return;

      const { clientX: x, clientY: y, timeStamp } = event;
      const dt = Math.max(8, timeStamp - lastMoveTime);
      const dx = x - lastX;
      const dy = y - lastY;
      const speed = Math.sqrt(dx * dx + dy * dy) / (dt / 1000);

      lastX = x;
      lastY = y;
      lastMoveTime = timeStamp;
      pointerActive = isInZone(x, y);

      if (pointerActive) emit(x, y, speed);
    };

    const onVisibilityChange = () => {
      visible = !document.hidden;
    };

    updateBounds();
    window.addEventListener("resize", updateBounds, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    rafId = requestAnimationFrame(step);

    return () => {
      window.removeEventListener("resize", updateBounds);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      cancelAnimationFrame(rafId);
    };
  }, [zoneSelectors, maxParticles]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 5,
      }}
    />
  );
}
