const TWO_PI = Math.PI * 2;

const rotatePoint = (x, y, z, rotX, rotY) => {
  const cosX = Math.cos(rotX);
  const sinX = Math.sin(rotX);
  const cosY = Math.cos(rotY);
  const sinY = Math.sin(rotY);

  const y1 = y * cosX - z * sinX;
  const z1 = y * sinX + z * cosX;
  const x2 = x * cosY + z1 * sinY;
  const z2 = -x * sinY + z1 * cosY;

  return [x2, y1, z2];
};

const projectPoint = (x, y, z, radius) => {
  const depth = 2.65;
  const scale = depth / (depth - z);
  return [x * radius * scale, y * radius * scale, z];
};

const drawPath = (ctx, points, color, alpha, lineWidth) => {
  if (points.length < 2) {
    return;
  }

  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
};

export const initGlobe = () => {
  const canvas = document.querySelector("#hero-globe");
  if (!canvas) {
    return;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  let rotationY = 0.58;
  let rotationX = -0.14;
  let velocityY = 0.002;
  let velocityX = 0;
  let dragging = false;
  let pointerId = null;
  let pointerX = 0;
  let pointerY = 0;
  let radius = 60;
  let centerX = 0;
  let centerY = 0;
  let rafId = 0;

  const color = (token) => getComputedStyle(document.documentElement).getPropertyValue(token).trim();

  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(bounds.width * dpr);
    canvas.height = Math.round(bounds.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    centerX = bounds.width / 2;
    centerY = bounds.height / 2;
    radius = Math.min(bounds.width, bounds.height) * 0.42;
  };

  const lineSamples = 76;

  const drawParallel = (lat) => {
    const points = [];
    for (let i = 0; i <= lineSamples; i += 1) {
      const lon = -Math.PI + (i / lineSamples) * TWO_PI;
      const clat = Math.cos(lat);
      const x = Math.cos(lon) * clat;
      const y = Math.sin(lat);
      const z = Math.sin(lon) * clat;
      const rotated = rotatePoint(x, y, z, rotationX, rotationY);
      if (rotated[2] > -0.15) {
        const projected = projectPoint(rotated[0], rotated[1], rotated[2], radius);
        points.push([centerX + projected[0], centerY + projected[1]]);
      } else if (points.length > 1) {
        drawPath(ctx, points, color("--line"), 0.62, 1);
        points.length = 0;
      }
    }

    drawPath(ctx, points, color("--line"), 0.62, 1);
  };

  const drawMeridian = (lon) => {
    const points = [];
    for (let i = 0; i <= lineSamples; i += 1) {
      const lat = -Math.PI / 2 + (i / lineSamples) * Math.PI;
      const x = Math.cos(lon) * Math.cos(lat);
      const y = Math.sin(lat);
      const z = Math.sin(lon) * Math.cos(lat);
      const rotated = rotatePoint(x, y, z, rotationX, rotationY);
      if (rotated[2] > -0.15) {
        const projected = projectPoint(rotated[0], rotated[1], rotated[2], radius);
        points.push([centerX + projected[0], centerY + projected[1]]);
      } else if (points.length > 1) {
        drawPath(ctx, points, color("--line"), 0.6, 1);
        points.length = 0;
      }
    }

    drawPath(ctx, points, color("--line"), 0.6, 1);
  };

  const frame = () => {
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    ctx.save();
    ctx.translate(centerX, centerY);
    const halo = ctx.createRadialGradient(0, 0, radius * 0.25, 0, 0, radius * 1.1);
    halo.addColorStop(0, "rgba(127, 127, 127, 0.14)");
    halo.addColorStop(1, "rgba(127, 127, 127, 0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.1, 0, TWO_PI);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = color("--text");
    ctx.globalAlpha = 0.88;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, TWO_PI);
    ctx.stroke();

    for (let lat = -45; lat <= 45; lat += 15) {
      drawParallel((lat * Math.PI) / 180);
    }

    for (let lon = 0; lon < 180; lon += 20) {
      drawMeridian((lon * Math.PI) / 180);
    }

    ctx.globalAlpha = 1;

    if (!dragging) {
      rotationY += velocityY;
      rotationX += velocityX;
      velocityY *= 0.994;
      velocityX *= 0.994;
      if (Math.abs(velocityY) < 0.0014) {
        velocityY = 0.0014;
      }
    }

    rafId = window.requestAnimationFrame(frame);
  };

  const onPointerDown = (event) => {
    dragging = true;
    pointerId = event.pointerId;
    pointerX = event.clientX;
    pointerY = event.clientY;
    canvas.setPointerCapture(pointerId);
    velocityY = 0;
    velocityX = 0;
  };

  const onPointerMove = (event) => {
    if (!dragging || event.pointerId !== pointerId) {
      return;
    }

    const deltaX = event.clientX - pointerX;
    const deltaY = event.clientY - pointerY;
    pointerX = event.clientX;
    pointerY = event.clientY;

    rotationY += deltaX * 0.012;
    rotationX += deltaY * 0.008;
    rotationX = Math.max(-1.05, Math.min(1.05, rotationX));

    velocityY = deltaX * 0.0007;
    velocityX = deltaY * 0.00045;
  };

  const onPointerUp = (event) => {
    if (event.pointerId !== pointerId) {
      return;
    }

    dragging = false;
    canvas.releasePointerCapture(pointerId);
    pointerId = null;
  };

  resize();
  frame();

  window.addEventListener("resize", resize);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      window.cancelAnimationFrame(rafId);
      return;
    }

    frame();
  });
};
