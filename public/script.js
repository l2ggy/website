const themeQuery = window.matchMedia("(prefers-color-scheme: dark)");
const themeToggle = document.querySelector(".theme-toggle");
const overrideKey = "portfolio-theme-override";

const systemTheme = () => (themeQuery.matches ? "dark" : "light");

const applyTheme = (theme) => {
  document.documentElement.dataset.theme = theme;
};

const loadInitialTheme = () => {
  const saved = localStorage.getItem(overrideKey);
  const system = systemTheme();

  if (saved && saved !== system) {
    localStorage.removeItem(overrideKey);
    applyTheme(system);
    return;
  }

  applyTheme(saved || system);
};

const onThemeToggle = () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem(overrideKey, next);
  applyTheme(next);
};

const onSystemThemeChange = () => {
  const system = systemTheme();
  const saved = localStorage.getItem(overrideKey);

  if (!saved || saved !== system) {
    localStorage.removeItem(overrideKey);
    applyTheme(system);
    return;
  }

  applyTheme(saved);
};

const renderEntry = ({ icon, title, subtitle, dates }) => `
  <article class="entry">
    <div class="entry-icon" aria-hidden="true">${icon || "Logo"}</div>
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

const loadEntries = async (element) => {
  const source = element.dataset.source;
  const kind = element.dataset.kind || "entry";
  if (!source || !renderByKind[kind]) return;

  const response = await fetch(source);
  const items = await response.json();
  element.innerHTML = items.map(renderByKind[kind]).join("");
};

loadInitialTheme();
themeToggle?.addEventListener("click", onThemeToggle);
themeQuery.addEventListener("change", onSystemThemeChange);

document.querySelectorAll(".entries").forEach((element) => {
  loadEntries(element).catch(() => {
    element.innerHTML = "<p>Unable to load entries.</p>";
  });
});
