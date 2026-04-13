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

const setStatMarkup = (selector, markup) => {
  const element = document.querySelector(selector);
  if (element) {
    element.innerHTML = markup;
  }
};

const normalPdf = (x) => Math.exp(-(x * x) / 2) / Math.sqrt(2 * Math.PI);

const inverseStandardNormal = (p) => {
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const low = 0.02425;
  const high = 1 - low;

  if (p <= 0 || p >= 1) {
    return null;
  }

  if (p < low) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }

  if (p > high) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }

  const q = p - 0.5;
  const r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
};

const renderPercentile = (selector, percentile) => {
  const element = document.querySelector(selector);
  if (!element) {
    return;
  }

  if (!percentile || percentile <= 0 || percentile > 100) {
    element.hidden = true;
    element.innerHTML = "";
    return;
  }

  const chartWidth = 228;
  const chartHeight = 72;
  const left = 6;
  const right = chartWidth - 6;
  const top = 4;
  const baseline = chartHeight - 7;
  const tailProbability = percentile / 100;
  const thresholdZ = inverseStandardNormal(1 - tailProbability);
  if (thresholdZ == null) {
    element.hidden = true;
    element.innerHTML = "";
    return;
  }

  const xMax = Math.max(3.5, thresholdZ + 0.6);
  const xMin = -xMax;
  const yMax = normalPdf(0);
  const mapX = (x) => left + ((x - xMin) / (xMax - xMin)) * (right - left);
  const mapY = (y) => baseline - (y / yMax) * (baseline - top);
  const pointCount = 140;
  const curvePoints = [];

  for (let i = 0; i <= pointCount; i += 1) {
    const x = xMin + (i / pointCount) * (xMax - xMin);
    curvePoints.push(`${mapX(x)},${mapY(normalPdf(x))}`);
  }

  const clampedThreshold = Math.max(xMin, Math.min(xMax, thresholdZ));
  const markerX = mapX(clampedThreshold);
  const markerY = mapY(normalPdf(clampedThreshold));

  const shadePoints = [`${mapX(clampedThreshold)},${baseline}`];
  for (let i = 0; i <= pointCount; i += 1) {
    const x = clampedThreshold + (i / pointCount) * (xMax - clampedThreshold);
    shadePoints.push(`${mapX(x)},${mapY(normalPdf(x))}`);
  }
  shadePoints.push(`${right},${baseline}`);

  element.hidden = false;
  element.innerHTML = `
    <svg viewBox="0 0 ${chartWidth} ${chartHeight}" role="img" aria-label="Standard normal curve with top ${formatNumber(percentile, 2)} percent tail highlighted">
      <line class="percentile-axis" x1="${left}" y1="${baseline}" x2="${right}" y2="${baseline}" />
      <polygon class="percentile-fill" points="${shadePoints.join(" ")}" />
      <polyline class="percentile-curve" points="${curvePoints.join(" ")}" />
      <line class="percentile-marker" x1="${markerX}" y1="${baseline}" x2="${markerX}" y2="${markerY}" />
      <circle class="percentile-dot" cx="${markerX}" cy="${markerY}" r="2" />
    </svg>
  `;
};

const renderStats = ({ leetcode, monkeytype }) => {
  const solved = leetcode?.solved;
  const contest = leetcode?.contest;
  const leaderboard = monkeytype?.leaderboard;
  setText(
    "#leetcode-solved",
    unavailableText
  );
  if (solved) {
    setStatMarkup(
      "#leetcode-solved",
      `<span class="stat-value">${formatNumber(solved.all)}</span> solved (<span class="stat-value">${formatNumber(solved.easy)}</span> easy · <span class="stat-value">${formatNumber(solved.medium)}</span> medium · <span class="stat-value">${formatNumber(solved.hard)}</span> hard)`
    );
  }
  setText(
    "#leetcode-contest",
    unavailableText
  );
  if (contest?.rating && contest?.topPercentage) {
    setStatMarkup(
      "#leetcode-contest",
      `Contest rating: <span class="stat-value">${formatNumber(Math.round(contest.rating))}</span> · top <span class="stat-value">${formatNumber(contest.topPercentage, 2)}%</span>`
    );
  }
  renderPercentile("#leetcode-percentile", contest?.topPercentage);

  if (!monkeytype) {
    setText("#monkeytype-summary", unavailableText);
    setText("#monkeytype-pb", unavailableText);
    renderPercentile("#monkeytype-percentile", null);
    return;
  }

  const typingHours = monkeytype.timeTypingSeconds / 3600;
  const topPercent = leaderboard?.rank && leaderboard?.count ? (leaderboard.rank / leaderboard.count) * 100 : null;

  setStatMarkup(
    "#monkeytype-summary",
    `<span class="stat-value">${formatNumber(monkeytype.completedTests)}</span> tests completed · <span class="stat-value">${formatNumber(typingHours, 1)}h</span> total typing`
  );
  setStatMarkup(
    "#monkeytype-pb",
    topPercent
      ? `PB (60s): <span class="stat-value">${formatNumber(monkeytype.pb60, 2)} WPM</span> · top <span class="stat-value">${formatNumber(topPercent, 2)}%</span>`
      : `PB (60s): <span class="stat-value">${formatNumber(monkeytype.pb60, 2)} WPM</span>`
  );
  renderPercentile("#monkeytype-percentile", topPercent);
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
  renderPercentile("#leetcode-percentile", null);
  renderPercentile("#monkeytype-percentile", null);
};

const systemThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const storedThemeKey = "portfolio-theme-override";
const themeToggle = document.querySelector("#theme-toggle");
let overrideTheme = localStorage.getItem(storedThemeKey);

const getSystemTheme = () => (systemThemeQuery.matches ? "dark" : "light");

const applyTheme = (theme) => {
  document.documentElement.dataset.theme = theme;
  if (themeToggle) {
    const isDark = theme === "dark";
    themeToggle.classList.toggle("is-dark", isDark);
    themeToggle.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} mode`);
  }
};

applyTheme(overrideTheme || getSystemTheme());

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.dataset.theme || getSystemTheme();
    overrideTheme = currentTheme === "dark" ? "light" : "dark";
    localStorage.setItem(storedThemeKey, overrideTheme);
    applyTheme(overrideTheme);

    if (!reducedMotionQuery.matches) {
      themeToggle.classList.remove("is-rippling");
      void themeToggle.offsetWidth;
      themeToggle.classList.add("is-rippling");
    }
  });

  themeToggle.addEventListener("animationend", (event) => {
    if (event.animationName === "theme-ripple") {
      themeToggle.classList.remove("is-rippling");
    }
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
