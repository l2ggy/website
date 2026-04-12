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
  <article class="project">
    <h3>${title}</h3>
    <p>${summary}</p>
    <p class="project-tools">${tools}</p>
  </article>
`;

const renderers = {
  entry: renderEntry,
  project: renderProject,
};

const loadEntries = async (element) => {
  const source = element.dataset.source;
  const kind = element.dataset.kind || "entry";
  const render = renderers[kind] || renderEntry;
  if (!source) return;

  const response = await fetch(source);
  const items = await response.json();
  element.innerHTML = items.map(render).join("");
};

document.querySelectorAll(".entries").forEach((element) => {
  loadEntries(element).catch(() => {
    element.innerHTML = "<p>Unable to load entries.</p>";
  });
});
