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
  const chartColor = "1E3765";

  if (!section || !heatmapImage || !user) {
    return;
  }

  heatmapImage.src = `https://ghchart.rshah.org/${chartColor}/${encodeURIComponent(user)}`;
  heatmapImage.alt = `${user}'s GitHub contribution heatmap`;
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

const shouldDisableSectionPoints = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
  window.matchMedia("(pointer: coarse)").matches ||
  navigator.maxTouchPoints > 0;

const backgroundPointRatios = [
  [0.08, 0.18],
  [0.24, 0.12],
  [0.42, 0.22],
  [0.62, 0.14],
  [0.81, 0.2],
  [0.14, 0.45],
  [0.33, 0.52],
  [0.56, 0.44],
  [0.75, 0.5],
  [0.19, 0.78],
  [0.46, 0.74],
  [0.72, 0.82],
];

const initSectionPointEffects = () => {
  if (shouldDisableSectionPoints()) return;

  document.querySelectorAll(".section").forEach((section) => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("section-points");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("preserveAspectRatio", "none");
    section.prepend(svg);

    const lines = Array.from({ length: 3 }, () => {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.classList.add("section-line");
      line.style.opacity = "0";
      svg.append(line);
      return line;
    });

    const circles = backgroundPointRatios.map(([x, y]) => {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.classList.add("section-point");
      circle.setAttribute("cx", `${x * 100}`);
      circle.setAttribute("cy", `${y * 100}`);
      circle.setAttribute("r", "0.8");
      svg.append(circle);
      return { x, y, node: circle };
    });

    let frameId = 0;
    let pointerX = 0;
    let pointerY = 0;

    const clearHighlight = () => {
      circles.forEach(({ node }) => {
        node.classList.remove("is-active");
        node.setAttribute("r", "0.8");
      });
      lines.forEach((line) => {
        line.style.opacity = "0";
      });
    };

    const renderFrame = () => {
      frameId = 0;
      const nearest = [...circles]
        .sort((a, b) => (a.x - pointerX) ** 2 + (a.y - pointerY) ** 2 - ((b.x - pointerX) ** 2 + (b.y - pointerY) ** 2))
        .slice(0, lines.length);

      clearHighlight();
      nearest.forEach((point, index) => {
        point.node.classList.add("is-active");
        point.node.setAttribute("r", "1.05");

        const line = lines[index];
        line.setAttribute("x1", `${point.x * 100}`);
        line.setAttribute("y1", `${point.y * 100}`);
        line.setAttribute("x2", `${pointerX * 100}`);
        line.setAttribute("y2", `${pointerY * 100}`);
        line.style.opacity = "1";
      });
    };

    section.addEventListener("pointermove", (event) => {
      const bounds = section.getBoundingClientRect();
      pointerX = (event.clientX - bounds.left) / bounds.width;
      pointerY = (event.clientY - bounds.top) / bounds.height;
      if (!frameId) frameId = requestAnimationFrame(renderFrame);
    });

    section.addEventListener("pointerleave", () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
        frameId = 0;
      }
      clearHighlight();
    });
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
initSectionPointEffects();
