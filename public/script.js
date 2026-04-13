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

const monkeytypeDurations = [15, 30, 60, 120];

const getBestWpm = (entries = []) =>
  entries.reduce((best, entry) => Math.max(best, Number(entry?.wpm) || 0), 0);

const formatDurationLabel = (seconds) => `${seconds}s best`;

const renderMonkeytypeStats = async () => {
  const section = document.querySelector("#typing");
  const statsContainer = document.querySelector("#typing-stats");
  const user = section?.dataset.monkeytypeUser?.trim();
  if (!section || !statsContainer || !user) return;

  try {
    const response = await fetch(`https://api.monkeytype.com/users/${encodeURIComponent(user)}/profile`);
    if (!response.ok) throw new Error("Request failed");

    const payload = await response.json();
    const profile = payload?.data;
    if (!profile) throw new Error("Profile missing");

    const bests = profile.personalBests?.time || {};
    const rows = monkeytypeDurations
      .map((duration) => {
        const wpm = getBestWpm(bests[duration]);
        return `<li><span>${formatDurationLabel(duration)}</span><strong>${wpm ? `${wpm.toFixed(1)} WPM` : "—"}</strong></li>`;
      })
      .join("");

    const completedTests = profile.typingStats?.completedTests || 0;
    statsContainer.innerHTML = `
      <ul class="typing-stats-list">${rows}</ul>
      <p class="typing-meta">${completedTests.toLocaleString()} tests completed</p>
    `;
  } catch {
    statsContainer.innerHTML = "<p class=\"typing-status\">Unable to load Monkeytype stats.</p>";
  }
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

renderGitHubHeatmap();
renderMonkeytypeStats();
