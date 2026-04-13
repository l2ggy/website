const renderIcon = (icon, title) => {
  if (!icon) {
    return '<div class="entry-icon" aria-hidden="true">Icon</div>';
  }

  return `<img class="entry-icon entry-thumb" src="${icon}" alt="${title} logo" loading="lazy" />`;
};

const renderEntry = ({ icon, title, subtitle, dates }) => `
  <article class="entry">
    ${renderIcon(icon, title)}
    <div class="entry-main">
      <div class="entry-head">
        <h3>${title}</h3>
        <p class="entry-dates">${dates || ""}</p>
      </div>
      <p>${subtitle}</p>
    </div>
  </article>
`;

const renderProject = ({ title, summary, tools, link }) => `
  <article class="entry project-entry">
    <div class="entry-main">
      <h3>${link ? `<a class="project-title-link" href="${link}" target="_blank" rel="noreferrer">${title}</a>` : title}</h3>
      <p>${summary}</p>
      <p class="project-tools">${tools}</p>
    </div>
  </article>
`;

const renderByKind = {
  entry: renderEntry,
  project: renderProject,
};

const renderGitHubHeatmap = () => {
  const section = document.querySelector(".hero-heatmap-wrap");
  const heatmapImage = document.querySelector("#github-heatmap");
  const user = section?.dataset.githubUser?.trim();
  const chartColor = "303030";

  if (!section || !heatmapImage || !user) {
    return;
  }

  heatmapImage.src = `https://ghchart.rshah.org/${chartColor}/${encodeURIComponent(user)}`;
  heatmapImage.alt = `${user}'s GitHub contribution heatmap`;
};

const initHeroConstellation = () => {
  const hero = document.querySelector("#hero");
  const svg = document.querySelector("#hero-constellation");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouchLike =
    window.matchMedia("(hover: none)").matches ||
    window.matchMedia("(pointer: coarse)").matches ||
    navigator.maxTouchPoints > 0;

  if (!hero || !svg || reduceMotion || isTouchLike) {
    if (svg) {
      svg.remove();
    }
    return;
  }

  const pointCount = 12;
  const neighborCount = 3;
  const points = Array.from({ length: pointCount }, (_, index) => {
    const x = 0.1 + ((index * 0.37) % 0.8);
    const y = 0.14 + ((index * 0.61) % 0.72);
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("r", "2");
    circle.setAttribute("fill", "var(--muted)");
    circle.setAttribute("opacity", "0.28");
    svg.append(circle);
    return { x, y, circle };
  });

  const lineElements = Array.from({ length: neighborCount }, () => {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("stroke", "var(--text)");
    line.setAttribute("stroke-width", "1");
    line.setAttribute("opacity", "0");
    svg.append(line);
    return line;
  });

  let bounds = hero.getBoundingClientRect();
  let pointerX = 0;
  let pointerY = 0;
  let rafId = 0;
  let lastMoveAt = 0;

  const updateBounds = () => {
    bounds = hero.getBoundingClientRect();
    svg.setAttribute("viewBox", `0 0 ${Math.max(bounds.width, 1)} ${Math.max(bounds.height, 1)}`);
  };

  const renderFrame = () => {
    rafId = 0;

    const width = Math.max(bounds.width, 1);
    const height = Math.max(bounds.height, 1);
    const timeSinceMove = performance.now() - lastMoveAt;
    const fade = Math.max(0, 1 - timeSinceMove / 240);

    const ranked = points
      .map((point) => {
        const px = point.x * width;
        const py = point.y * height;
        const dx = pointerX - px;
        const dy = pointerY - py;
        return { point, px, py, distance: Math.hypot(dx, dy) };
      })
      .sort((a, b) => a.distance - b.distance);

    const active = ranked.slice(0, neighborCount);
    const activeSet = new Set(active.map((item) => item.point));

    points.forEach((point) => {
      const opacity = activeSet.has(point) ? 0.82 : 0.28;
      point.circle.setAttribute("cx", String(point.x * width));
      point.circle.setAttribute("cy", String(point.y * height));
      point.circle.setAttribute("opacity", String(opacity));
    });

    lineElements.forEach((line, index) => {
      const item = active[index];
      if (!item || fade <= 0) {
        line.setAttribute("opacity", "0");
        return;
      }
      const intensity = Math.max(0, 1 - item.distance / 220) * fade;
      line.setAttribute("x1", String(item.px));
      line.setAttribute("y1", String(item.py));
      line.setAttribute("x2", String(pointerX));
      line.setAttribute("y2", String(pointerY));
      line.setAttribute("opacity", String(intensity * 0.8));
    });

    if (fade > 0) {
      rafId = requestAnimationFrame(renderFrame);
    }
  };

  const queueFrame = () => {
    if (!rafId) {
      rafId = requestAnimationFrame(renderFrame);
    }
  };

  updateBounds();

  hero.addEventListener("pointermove", (event) => {
    pointerX = event.clientX - bounds.left;
    pointerY = event.clientY - bounds.top;
    lastMoveAt = performance.now();
    queueFrame();
  });

  hero.addEventListener("pointerleave", () => {
    lastMoveAt = performance.now() - 180;
    queueFrame();
  });

  window.addEventListener("resize", () => {
    updateBounds();
    queueFrame();
  });
};

const loadEntries = async (element) => {
  const source = element.dataset.source;
  const kind = element.dataset.kind || "entry";
  if (!source || !renderByKind[kind]) return;

  const response = await fetch(source);
  const items = await response.json();
  element.innerHTML = items.map(renderByKind[kind]).join("");
};

const formatNumber = (value, digits = 0) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
const unavailableText = "Unavailable right now.";
const monkeytypeProfileEndpoints = (username) => {
  const encoded = encodeURIComponent(username);
  return [
    `https://api.monkeytype.com/users/${encoded}/profile?isUid=false`,
    `https://api.monkeytype.com/users/${encoded}/profile`,
  ];
};
const setText = (selector, text) => {
  const element = document.querySelector(selector);
  if (element) {
    element.textContent = text;
  }
};

const renderStats = ({ leetcode, monkeytype }) => {
  const solved = leetcode?.solved;
  const contest = leetcode?.contest;
  const leaderboard = monkeytype?.leaderboard;
  setText(
    "#leetcode-solved",
    solved
      ? `${formatNumber(solved.all)} solved (${formatNumber(solved.easy)} easy · ${formatNumber(solved.medium)} medium · ${formatNumber(solved.hard)} hard)`
      : unavailableText
  );
  setText(
    "#leetcode-contest",
    contest?.rating && contest?.topPercentage
      ? `Contest rating: ${formatNumber(Math.round(contest.rating))} · top ${formatNumber(contest.topPercentage, 2)}%`
      : unavailableText
  );

  if (!monkeytype) {
    setText("#monkeytype-summary", unavailableText);
    setText("#monkeytype-pb", unavailableText);
    return;
  }

  const typingHours = monkeytype.timeTypingSeconds / 3600;
  const topPercent = leaderboard?.rank && leaderboard?.count ? (leaderboard.rank / leaderboard.count) * 100 : null;

  setText(
    "#monkeytype-summary",
    `${formatNumber(monkeytype.completedTests)} tests completed · ${formatNumber(typingHours, 1)}h total typing`
  );
  setText(
    "#monkeytype-pb",
    topPercent
      ? `PB (60s): ${formatNumber(monkeytype.pb60, 2)} WPM · top ${formatNumber(topPercent, 2)}%`
      : `PB (60s): ${formatNumber(monkeytype.pb60, 2)} WPM`
  );
};

const parseMonkeytypeProfile = (payload) => {
  const data = payload?.data || {};
  const typingStats = data.typingStats || {};
  const personalBest60 = data?.personalBests?.time?.["60"] || [];
  const leaderboard = data?.allTimeLbs?.time?.["60"]?.english || {};

  return {
    completedTests: typingStats.completedTests ?? typingStats.testsCompleted ?? 0,
    timeTypingSeconds: typingStats.timeTyping ?? 0,
    pb60: personalBest60.reduce((best, run) => Math.max(best, run?.wpm || 0), 0),
    leaderboard: {
      rank: leaderboard.rank || null,
      count: leaderboard.count || null,
    },
  };
};

const loadMonkeytypeDirect = async (username) => {
  for (const endpoint of monkeytypeProfileEndpoints(username)) {
    const response = await fetch(endpoint, { headers: { accept: "application/json" } });
    if (!response.ok) {
      continue;
    }

    const payload = await response.json();
    return parseMonkeytypeProfile(payload);
  }

  return null;
};

const loadStats = async () => {
  const section = document.querySelector("#stats");
  if (!section) return;

  const leetcode = section.dataset.leetcodeUser || "lagsterino";
  const monkeytype = section.dataset.monkeytypeUser || "laggy";
  const query = new URLSearchParams({ leetcode, monkeytype });

  const response = await fetch(`/api/stats?${query.toString()}`);
  if (!response.ok) {
    throw new Error("Unable to load stats");
  }

  const payload = await response.json();
  if (!payload.monkeytype) {
    payload.monkeytype = await loadMonkeytypeDirect(monkeytype).catch(() => null);
  }
  renderStats(payload);
};

const setStatsFallback = () => {
  ["#leetcode-solved", "#leetcode-contest", "#monkeytype-summary", "#monkeytype-pb"].forEach((selector) => {
    setText(selector, unavailableText);
  });
};

const systemThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
const storedThemeKey = "portfolio-theme-override";
const themeToggle = document.querySelector("#theme-toggle");
let overrideTheme = localStorage.getItem(storedThemeKey);

const getSystemTheme = () => (systemThemeQuery.matches ? "dark" : "light");

const applyTheme = (theme) => {
  document.documentElement.dataset.theme = theme;
  if (themeToggle) {
    themeToggle.textContent = theme === "dark" ? "Light mode" : "Dark mode";
    themeToggle.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} mode`);
  }
};

applyTheme(overrideTheme || getSystemTheme());

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.dataset.theme || getSystemTheme();
    overrideTheme = currentTheme === "dark" ? "light" : "dark";
    localStorage.setItem(storedThemeKey, overrideTheme);
    applyTheme(overrideTheme);
  });
}

systemThemeQuery.addEventListener("change", () => {
  const systemTheme = getSystemTheme();

  if (overrideTheme && overrideTheme !== systemTheme) {
    overrideTheme = null;
    localStorage.removeItem(storedThemeKey);
  }

  if (!overrideTheme) {
    applyTheme(systemTheme);
  }
});

document.querySelectorAll(".entries").forEach((element) => {
  loadEntries(element).catch(() => {
    element.innerHTML = "<p>Unable to load entries.</p>";
  });
});

loadStats().catch(setStatsFallback);
renderGitHubHeatmap();
initHeroConstellation();
