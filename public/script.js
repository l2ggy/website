const renderEntry = ({ icon, title, subtitle, dates }) => `
  <article class="entry">
    <div class="entry-icon" aria-hidden="true">${icon || "Icon"}</div>
    <div class="entry-main">
      <div class="entry-head">
        <h3>${title}</h3>
        <p class="entry-dates">${dates || ""}</p>
      </div>
      <p>${subtitle}</p>
    </div>
  </article>
`;

const renderProject = ({ title, summary, tools }) => `
  <article class="entry project-entry">
    <div class="entry-main">
      <h3>${title}</h3>
      <p>${summary}</p>
      <p class="project-tools">${tools}</p>
    </div>
  </article>
`;

const renderByKind = {
  entry: renderEntry,
  project: renderProject,
};

const formatStat = (value, digits = 1) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(digits) : "—";
};

const renderMonkeytypeStats = ({ username, duration, best, completedTests, timeTypingMinutes }) => `
  <article class="entry">
    <div class="entry-icon" aria-hidden="true">MT</div>
    <div class="entry-main">
      <div class="entry-head">
        <h3>${username}</h3>
        <p class="entry-dates">best ${duration}s</p>
      </div>
      <p>${formatStat(best?.wpm)} WPM · ${formatStat(best?.acc, 0)}% accuracy · ${formatStat(best?.raw)} raw</p>
      <p>${formatStat(completedTests, 0)} tests completed · ${formatStat(timeTypingMinutes, 0)} minutes typed</p>
    </div>
  </article>
`;

const selectBestForDuration = (personalBests, duration) => {
  const key = String(duration);
  const tests = personalBests?.time?.[key];
  return Array.isArray(tests) && tests.length > 0 ? tests[0] : null;
};

const loadMonkeytypeStats = async (element) => {
  const username = element.dataset.monkeytypeUser?.trim();
  const duration = Number(element.dataset.monkeytypeDuration || "60");

  if (!username || !Number.isFinite(duration)) {
    return;
  }

  const response = await fetch(`https://api.monkeytype.com/users/${encodeURIComponent(username)}/profile`);
  if (!response.ok) {
    throw new Error("Unable to load Monkeytype profile");
  }

  const payload = await response.json();
  const profile = payload?.data;
  const best = selectBestForDuration(profile?.personalBests, duration);
  const completedTests = profile?.typingStats?.completedTests;
  const timeTypingMinutes = Number(profile?.typingStats?.timeTyping) / 60;

  element.innerHTML = renderMonkeytypeStats({
    username: profile?.name || username,
    duration,
    best,
    completedTests,
    timeTypingMinutes,
  });
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

const monkeytypeStatsElement = document.querySelector(".monkeytype-stats");
if (monkeytypeStatsElement) {
  loadMonkeytypeStats(monkeytypeStatsElement).catch(() => {
    monkeytypeStatsElement.innerHTML = "<p>Unable to load Monkeytype stats.</p>";
  });
}

renderGitHubHeatmap();
