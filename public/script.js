const renderTimelineEntry = ({ icon, title, subtitle, dates }) => `
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

const renderProjectEntry = ({ name, summary, tools }) => `
  <article class="project-entry">
    <h3>${name}</h3>
    <p>${summary}</p>
    <p class="project-tools">${tools}</p>
  </article>
`;

const renderByKind = (kind, item) => (kind === "project" ? renderProjectEntry(item) : renderTimelineEntry(item));

const loadEntries = async (element) => {
  const source = element.dataset.source;
  const kind = element.dataset.kind || "timeline";
  if (!source) return;

  const response = await fetch(source);
  const items = await response.json();
  element.innerHTML = items.map((item) => renderByKind(kind, item)).join("");
};

document.querySelectorAll(".entries").forEach((element) => {
  loadEntries(element).catch(() => {
    element.innerHTML = "<p>Unable to load entries.</p>";
  });
});
