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

const renderMonkeytypeStats = (container, stats) => {
  container.innerHTML = stats
    .map(({ label, value }) => `<span class="hero-stat-chip">${label}: ${value}</span>`)
    .join("");
};

const loadMonkeytypeStats = async () => {
  const section = document.querySelector(".hero-monkeytype");
  const statsContainer = document.querySelector("#monkeytype-stats");
  const user = section?.dataset.monkeytypeUser?.trim();

  if (!section || !statsContainer || !user) {
    return;
  }

  const response = await fetch(`https://api.monkeytype.com/users/${encodeURIComponent(user)}/profile?isUid=false`);
  if (!response.ok) {
    throw new Error("Unable to load Monkeytype profile");
  }

  const payload = await response.json();
  const profile = payload?.data;
  const best60s = (profile?.personalBests?.time?.["60"] || []).reduce(
    (best, entry) => (!best || entry.wpm > best.wpm ? entry : best),
    null,
  );
  const typedHours = profile?.typingStats?.timeTyping
    ? `${(profile.typingStats.timeTyping / 3600).toFixed(1)}h`
    : "—";

  renderMonkeytypeStats(statsContainer, [
    { label: "Best 60s WPM", value: best60s ? best60s.wpm.toFixed(1) : "—" },
    { label: "Best 60s Acc", value: best60s ? `${best60s.acc.toFixed(1)}%` : "—" },
    { label: "Tests Completed", value: profile?.typingStats?.completedTests ?? "—" },
    { label: "Time Typed", value: typedHours },
  ]);
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
loadMonkeytypeStats().catch(() => {
  const statsContainer = document.querySelector("#monkeytype-stats");
  if (statsContainer) {
    statsContainer.innerHTML = "<p>Unable to load Monkeytype stats.</p>";
  }
});
