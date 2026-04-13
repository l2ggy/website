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


const formatNumber = (value) => new Intl.NumberFormat("en-US").format(value);
const formatPercent = (value) => `${value.toFixed(2)}%`;

const setStatLines = (card, summary, detail) => {
  const summaryLine = card.querySelector('[data-stat="summary"]');
  const detailLine = card.querySelector('[data-stat="detail"]');
  if (summaryLine) summaryLine.textContent = summary;
  if (detailLine) detailLine.textContent = detail;
};

const loadLeetCodeStats = async (card, username) => {
  const query = `query userProfile($username: String!) {
    matchedUser(username: $username) {
      submitStatsGlobal { acSubmissionNum { difficulty count } }
    }
    userContestRanking(username: $username) {
      rating
      topPercentage
    }
  }`;

  const response = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { username } }),
  });

  if (!response.ok) throw new Error("LeetCode request failed");

  const payload = await response.json();
  const counts = payload?.data?.matchedUser?.submitStatsGlobal?.acSubmissionNum || [];
  const contest = payload?.data?.userContestRanking;

  const solvedByDifficulty = Object.fromEntries(counts.map(({ difficulty, count }) => [difficulty, count]));
  const solvedAll = solvedByDifficulty.All ?? 0;
  const solvedEasy = solvedByDifficulty.Easy ?? 0;
  const solvedMedium = solvedByDifficulty.Medium ?? 0;
  const solvedHard = solvedByDifficulty.Hard ?? 0;

  const rating = contest?.rating ? Math.round(contest.rating) : null;
  const topPercentage = contest?.topPercentage;

  setStatLines(
    card,
    `${formatNumber(solvedAll)} solved (${formatNumber(solvedEasy)} easy · ${formatNumber(solvedMedium)} medium · ${formatNumber(solvedHard)} hard)`,
    rating && typeof topPercentage === "number"
      ? `Contest rating: ${formatNumber(rating)} · top ${formatPercent(topPercentage)}`
      : "Contest rating unavailable"
  );
};

const pickBestWpm = (records) => {
  if (!Array.isArray(records) || records.length === 0) return null;
  return records.reduce((best, current) => Math.max(best, current?.wpm || 0), 0);
};

const loadMonkeytypeStats = async (card, username) => {
  const response = await fetch(`https://api.monkeytype.com/users/${encodeURIComponent(username)}/profile`);
  if (!response.ok) throw new Error("Monkeytype request failed");

  const payload = await response.json();
  const data = payload?.data;
  if (!data) throw new Error("Missing Monkeytype data");

  const completedTests = data.typingStats?.completedTests || 0;
  const totalTypingHours = (data.typingStats?.timeTyping || 0) / 3600;
  const best60 = pickBestWpm(data.personalBests?.time?.["60"]);
  const rank = data.allTimeLbs?.time?.["60"]?.english?.rank;
  const count = data.allTimeLbs?.time?.["60"]?.english?.count;
  const topPercentage = rank && count ? (rank / count) * 100 : null;

  setStatLines(
    card,
    `${formatNumber(completedTests)} tests completed · ${totalTypingHours.toFixed(1)}h total typing`,
    best60 && topPercentage
      ? `PB (60s): ${best60.toFixed(2)} WPM · top ${formatPercent(topPercentage)}`
      : "PB (60s): unavailable"
  );
};

const loadStats = async () => {
  const cards = Array.from(document.querySelectorAll("[data-stat-source]"));

  await Promise.all(
    cards.map(async (card) => {
      const source = card.dataset.statSource;
      const username = card.dataset.username;

      try {
        if (source === "leetcode") {
          await loadLeetCodeStats(card, username);
        } else if (source === "monkeytype") {
          await loadMonkeytypeStats(card, username);
        }
      } catch {
        setStatLines(card, "Unable to load stats right now", "Please try again later");
      }
    })
  );
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

renderGitHubHeatmap();
loadStats();
