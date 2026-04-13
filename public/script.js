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

const renderMonkeytypeEntry = (duration, stats) => {
  if (!stats) return "";

  return renderEntry({
    icon: `${duration}s`,
    title: `${stats.wpm} WPM`,
    subtitle: `Raw ${stats.raw} · ${stats.acc}% accuracy`,
  });
};

const renderMonkeytypeStats = async () => {
  const section = document.querySelector("#typing-stats");
  const statsContainer = document.querySelector("#monkeytype-stats");
  const status = document.querySelector("#monkeytype-status");
  const username = section?.dataset.monkeytypeUser?.trim();

  if (!section || !statsContainer || !status || !username) {
    return;
  }

  const response = await fetch(`/api/monkeytype/${encodeURIComponent(username)}`);
  const payload = await response.json();

  if (!response.ok || !payload?.bests) {
    status.textContent = payload?.error || "Unable to load Monkeytype stats.";
    return;
  }

  const durations = ["15", "30", "60", "120"];
  const cards = durations.map((duration) => renderMonkeytypeEntry(duration, payload.bests[duration])).filter(Boolean);

  status.textContent = cards.length
    ? `Best time-mode scores for ${payload.username}.`
    : `No public time-mode scores were found for ${payload.username}.`;

  statsContainer.innerHTML = cards.join("");
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

document.querySelectorAll(".entries[data-source]").forEach((element) => {
  loadEntries(element).catch(() => {
    element.innerHTML = "<p>Unable to load entries.</p>";
  });
});

renderGitHubHeatmap();
renderMonkeytypeStats().catch(() => {
  const status = document.querySelector("#monkeytype-status");
  if (status) {
    status.textContent = "Unable to load Monkeytype stats.";
  }
});
