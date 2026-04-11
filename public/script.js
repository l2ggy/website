const particleGroups = {
  near: {
    size: [5, 10],
    drift: [12, 20],
    duration: [14, 24],
    alpha: [0.14, 0.24],
  },
  far: {
    size: [2, 6],
    drift: [8, 14],
    duration: [20, 32],
    alpha: [0.08, 0.16],
  },
};

const randomBetween = (min, max) => Math.random() * (max - min) + min;

document.querySelectorAll('.particle-layer').forEach((layer) => {
  const group = layer.classList.contains('particle-layer--near') ? 'near' : 'far';
  const config = particleGroups[group];
  const count = Number(layer.dataset.particles || 0);

  for (let i = 0; i < count; i += 1) {
    const particle = document.createElement('span');
    particle.className = 'particle';
    particle.style.setProperty('--x', `${randomBetween(4, 96).toFixed(2)}%`);
    particle.style.setProperty('--y', `${randomBetween(6, 94).toFixed(2)}%`);
    particle.style.setProperty('--size', `${randomBetween(...config.size).toFixed(2)}px`);
    particle.style.setProperty('--drift', `${randomBetween(...config.drift).toFixed(2)}px`);
    particle.style.setProperty('--duration', `${randomBetween(...config.duration).toFixed(2)}s`);
    particle.style.setProperty('--delay', `${randomBetween(-18, -1).toFixed(2)}s`);
    particle.style.setProperty('--alpha', randomBetween(...config.alpha).toFixed(3));
    layer.appendChild(particle);
  }
});
