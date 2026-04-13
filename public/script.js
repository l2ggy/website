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

const customCursorConfig = {
  disabled: false,
};

window.setCustomCursorDisabled = (disabled) => {
  customCursorConfig.disabled = Boolean(disabled);
  window.__DISABLE_CUSTOM_CURSOR__ = customCursorConfig.disabled;
};

const setupCustomCursor = () => {
  const prefersCoarsePointer = window.matchMedia("(hover: none), (pointer: coarse)");
  if (window.__DISABLE_CUSTOM_CURSOR__ || customCursorConfig.disabled || prefersCoarsePointer.matches) {
    return;
  }

  const cursor = document.createElement("div");
  cursor.className = "custom-cursor";
  cursor.setAttribute("aria-hidden", "true");
  document.body.appendChild(cursor);
  document.body.classList.add("custom-cursor-enabled");

  const interactiveSelector =
    'a, button, input, textarea, select, label, summary, [contenteditable="true"], [role="button"], [role="link"]';
  const state = { x: -200, y: -200, targetX: -200, targetY: -200, raf: 0 };

  const draw = () => {
    state.x += (state.targetX - state.x) * 0.18;
    state.y += (state.targetY - state.y) * 0.18;
    cursor.style.transform = `translate3d(${state.x}px, ${state.y}px, 0)`;
    if (Math.abs(state.targetX - state.x) + Math.abs(state.targetY - state.y) > 0.12) {
      state.raf = window.requestAnimationFrame(draw);
      return;
    }
    state.raf = 0;
  };

  const requestDraw = () => {
    if (!state.raf) {
      state.raf = window.requestAnimationFrame(draw);
    }
  };

  document.addEventListener("pointermove", (event) => {
    state.targetX = event.clientX;
    state.targetY = event.clientY;

    const target = event.target instanceof Element ? event.target : null;
    const isInteractive = Boolean(target?.closest(interactiveSelector));
    const variant = target?.closest("[data-cursor-variant]")?.dataset.cursorVariant || "default";

    cursor.dataset.variant = variant;
    cursor.classList.toggle("is-visible", !isInteractive);
    requestDraw();
  });

  document.addEventListener("pointerleave", () => {
    cursor.classList.remove("is-visible");
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

setupCustomCursor();

document.querySelectorAll(".entries").forEach((element) => {
  loadEntries(element).catch(() => {
    element.innerHTML = "<p>Unable to load entries.</p>";
  });
});

loadStats().catch(setStatsFallback);
renderGitHubHeatmap();
