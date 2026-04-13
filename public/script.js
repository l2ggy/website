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

const loadEntries = async (element) => {
  const source = element.dataset.source;
  const kind = element.dataset.kind || "entry";
  if (!source || !renderByKind[kind]) return;

  const response = await fetch(source);
  const items = await response.json();
  element.innerHTML = items.map(renderByKind[kind]).join("");
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

const leetCodeUser = "lagsterino";
const monkeytypeUser = "laggy";

const numberFormat = new Intl.NumberFormat("en-US");
const formatNumber = (value) => numberFormat.format(value);
const formatPercent = (value) => `${Number(value).toFixed(2)}%`;

const setStatLines = (id, lines) => {
  const root = document.querySelector(id);
  if (!root) return;
  const paragraphs = root.querySelectorAll("p");
  lines.forEach((line, index) => {
    if (paragraphs[index]) paragraphs[index].textContent = line;
  });
};

const loadLeetCodeStats = async () => {
  const query = `query userProfile($username: String!) {
    matchedUser(username: $username) {
      submitStatsGlobal {
        acSubmissionNum {
          difficulty
          count
        }
      }
    }
    userContestRanking(username: $username) {
      rating
      topPercentage
    }
  }`;

  const response = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { username: leetCodeUser } }),
  });

  const payload = await response.json();
  const solved = payload?.data?.matchedUser?.submitStatsGlobal?.acSubmissionNum || [];
  const contest = payload?.data?.userContestRanking;

  const solvedByDifficulty = Object.fromEntries(solved.map(({ difficulty, count }) => [difficulty, count]));
  const all = solvedByDifficulty.All || 0;
  const easy = solvedByDifficulty.Easy || 0;
  const medium = solvedByDifficulty.Medium || 0;
  const hard = solvedByDifficulty.Hard || 0;

  const contestRating = contest?.rating ? Math.round(contest.rating) : null;
  const topPercentage = contest?.topPercentage;
  const contestLine = contestRating && topPercentage !== null && topPercentage !== undefined
    ? `Contest rating: ${contestRating} · top ${formatPercent(topPercentage)}`
    : "Contest stats unavailable right now";

  setStatLines("#leetcode-stats", [
    `${formatNumber(all)} solved (${formatNumber(easy)} easy · ${formatNumber(medium)} medium · ${formatNumber(hard)} hard)`,
    contestLine,
  ]);
};

const loadMonkeytypeStats = async () => {
  const response = await fetch(`https://api.monkeytype.com/users/${encodeURIComponent(monkeytypeUser)}/profile`);
  const payload = await response.json();
  const data = payload?.data;

  const completedTests = data?.typingStats?.completedTests || 0;
  const timeTypingSeconds = data?.typingStats?.timeTyping || 0;
  const timeTypingHours = (timeTypingSeconds / 3600).toFixed(1);

  const best60 = data?.personalBests?.time?.["60"] || [];
  const best60Wpm = best60.reduce((max, run) => Math.max(max, run?.wpm || 0), 0);

  const leaderboard60 = data?.allTimeLbs?.time?.["60"]?.english;
  const rank = leaderboard60?.rank;
  const count = leaderboard60?.count;
  const percentile = rank && count ? (rank / count) * 100 : null;

  const leaderboardLine = percentile
    ? `PB (60s): ${best60Wpm.toFixed(2)} WPM · top ${formatPercent(percentile)}`
    : `PB (60s): ${best60Wpm.toFixed(2)} WPM`;

  setStatLines("#monkeytype-stats", [
    `${formatNumber(completedTests)} tests completed · ${timeTypingHours}h total typing`,
    leaderboardLine,
  ]);
};

const loadStats = async () => {
  await Promise.all([
    loadLeetCodeStats().catch(() => {
      setStatLines("#leetcode-stats", ["Unable to load solved stats.", "Unable to load contest stats."]);
    }),
    loadMonkeytypeStats().catch(() => {
      setStatLines("#monkeytype-stats", ["Unable to load typing stats.", "Unable to load leaderboard stats."]);
    }),
  ]);
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

renderGitHubHeatmap();
loadStats();
