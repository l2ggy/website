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


const blobPresets = [
  {
    radius: "52% 48% 62% 38% / 43% 61% 39% 57%",
    path: "polygon(20% 8%, 80% 12%, 94% 48%, 78% 90%, 24% 88%, 8% 52%)",
    hue: "0deg",
  },
  {
    radius: "62% 38% 44% 56% / 58% 45% 55% 42%",
    path: "polygon(26% 10%, 76% 6%, 92% 38%, 88% 78%, 48% 94%, 14% 74%, 8% 34%)",
    hue: "10deg",
  },
  {
    radius: "42% 58% 55% 45% / 35% 55% 45% 65%",
    path: "polygon(16% 22%, 52% 4%, 86% 18%, 96% 56%, 72% 90%, 34% 94%, 6% 62%)",
    hue: "-9deg",
  },
  {
    radius: "58% 42% 40% 60% / 52% 38% 62% 48%",
    path: "polygon(12% 20%, 42% 6%, 84% 12%, 94% 44%, 84% 84%, 44% 96%, 10% 66%)",
    hue: "16deg",
  },
];

const applyBlobPreset = (blob, preset) => {
  blob.style.setProperty("--blob-radius", preset.radius);
  blob.style.setProperty("--blob-path", preset.path);
  blob.style.setProperty("--blob-hue", preset.hue);
};

const initBlobMorph = () => {
  const blob = document.querySelector("#hero-blob");
  if (!blob) return;

  let blobIndex = Math.floor(Math.random() * blobPresets.length);
  applyBlobPreset(blob, blobPresets[blobIndex]);

  blob.addEventListener("click", () => {
    const randomStep = Math.floor(Math.random() * (blobPresets.length - 1)) + 1;
    blobIndex = (blobIndex + randomStep) % blobPresets.length;
    applyBlobPreset(blob, blobPresets[blobIndex]);
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

initBlobMorph();
