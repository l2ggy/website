const PARTICLE_CONFIG = {
  far: { count: 16, sizeMin: 1, sizeMax: 3, durationMin: 26, durationMax: 34, opacityMin: 0.08, opacityMax: 0.16 },
  near: { count: 12, sizeMin: 2, sizeMax: 5, durationMin: 18, durationMax: 26, opacityMin: 0.12, opacityMax: 0.2 },
};

const randomRange = (min, max) => min + Math.random() * (max - min);

const createParticle = (settings) => {
  const particle = document.createElement('span');
  particle.className = 'particle';

  const size = randomRange(settings.sizeMin, settings.sizeMax);
  const duration = randomRange(settings.durationMin, settings.durationMax);

  particle.style.left = `${randomRange(0, 100)}%`;
  particle.style.top = `${randomRange(0, 100)}%`;
  particle.style.setProperty('--size', `${size.toFixed(2)}px`);
  particle.style.setProperty('--opacity', randomRange(settings.opacityMin, settings.opacityMax).toFixed(3));
  particle.style.setProperty('--duration', `${duration.toFixed(2)}s`);
  particle.style.setProperty('--delay', `${randomRange(-duration, 0).toFixed(2)}s`);

  return particle;
};

Object.entries(PARTICLE_CONFIG).forEach(([depth, settings]) => {
  const group = document.querySelector(`[data-depth="${depth}"]`);
  if (!group) return;

  const particles = Array.from({ length: settings.count }, () => createParticle(settings));
  group.append(...particles);
});
