const renderIdentity = ({ icon, logo, title, subtitle, dates }) => {
  const visual = logo
    ? `<img src="${logo}" alt="" class="entry-logo" loading="lazy" />`
    : `<span>${icon || "Logo"}</span>`;

  return `
    <article class="entry">
      <div class="entry-icon" aria-hidden="true">${visual}</div>
      <div class="entry-main">
        <div class="entry-head">
          <h3>${title}</h3>
          <p class="entry-dates">${dates || ""}</p>
        </div>
        <p>${subtitle}</p>
      </div>
    </article>
  `;
};

const renderProject = ({ title, summary, tools }) => `
  <article class="project-entry">
    <h3>${title}</h3>
    <p>${summary}</p>
    <p class="project-tools">${tools}</p>
  </article>
`;

const renderers = {
  identity: renderIdentity,
  project: renderProject,
};

const loadEntries = async (element) => {
  const source = element.dataset.source;
  if (!source) return;

  const response = await fetch(source);
  const items = await response.json();
  const type = element.dataset.type || "identity";
  const render = renderers[type] || renderIdentity;

  element.innerHTML = items.map(render).join("");
};

document.querySelectorAll(".entries").forEach((element) => {
  loadEntries(element).catch(() => {
    element.innerHTML = "<p>Unable to load entries.</p>";
  });
});
