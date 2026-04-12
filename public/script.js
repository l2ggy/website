const THEME_KEY = "theme-override";
const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

const getSystemTheme = () => (mediaQuery.matches ? "dark" : "light");

const applyTheme = (theme) => {
  document.documentElement.dataset.theme = theme;
};

const setToggleLabel = () => {
  const toggle = document.querySelector("#theme-toggle");
  if (!toggle) return;
  const isDark = document.documentElement.dataset.theme === "dark";
  toggle.textContent = isDark ? "Light" : "Dark";
};

const applySavedOrSystemTheme = () => {
  const override = localStorage.getItem(THEME_KEY);
  applyTheme(override || getSystemTheme());
  setToggleLabel();
};

const handleThemeToggle = () => {
  const current = document.documentElement.dataset.theme || getSystemTheme();
  const next = current === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
  setToggleLabel();
};

const handleSystemThemeChange = (event) => {
  const systemTheme = event.matches ? "dark" : "light";
  const override = localStorage.getItem(THEME_KEY);

  if (override && override !== systemTheme) {
    localStorage.removeItem(THEME_KEY);
  }

  applyTheme(systemTheme);
  setToggleLabel();
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

applySavedOrSystemTheme();
mediaQuery.addEventListener("change", handleSystemThemeChange);
document.querySelector("#theme-toggle")?.addEventListener("click", handleThemeToggle);

document.querySelectorAll(".entries").forEach((element) => {
  loadEntries(element).catch(() => {
    element.innerHTML = "<p>Unable to load entries.</p>";
  });
});
