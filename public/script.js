const themeToggle = document.querySelector("#theme-toggle");
const media = window.matchMedia("(prefers-color-scheme: dark)");

const setTheme = (theme) => {
  document.documentElement.dataset.theme = theme;
  if (themeToggle) {
    themeToggle.textContent = theme === "dark" ? "Light mode" : "Dark mode";
  }
};

const getSystemTheme = () => (media.matches ? "dark" : "light");

const applyTheme = () => {
  const stored = localStorage.getItem("theme-override");
  const system = getSystemTheme();
  setTheme(stored || system);
};

const onSystemThemeChange = () => {
  localStorage.removeItem("theme-override");
  setTheme(getSystemTheme());
};

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const current = document.documentElement.dataset.theme || getSystemTheme();
    const next = current === "dark" ? "light" : "dark";
    localStorage.setItem("theme-override", next);
    setTheme(next);
  });
}

media.addEventListener("change", onSystemThemeChange);
applyTheme();

const renderEntry = ({ icon, title, subtitle, dates }) => `
  <article class="entry">
    <div class="entry-icon" aria-hidden="true">${icon || "Icon"}</div>
    <div class="entry-main">
      <div class="entry-head">
        <h3>${title}</h3>
        <p class="entry-dates">${dates || "Date"}</p>
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

document.querySelectorAll(".entries").forEach((element) => {
  loadEntries(element).catch(() => {
    element.innerHTML = "<p>Unable to load placeholder entries.</p>";
  });
});
