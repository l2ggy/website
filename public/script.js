const renderEntry = ({ icon, title, subtitle, dates }) => `
  <article class="entry">
    <div class="entry-icon" aria-hidden="true">${icon || "Logo"}</div>
    <div class="entry-body">
      <div class="entry-row">
        <h3>${title}</h3>
        <p class="entry-dates">${dates || ""}</p>
      </div>
      <p>${subtitle}</p>
    </div>
  </article>
`;

const loadEntries = async (element) => {
  const source = element.dataset.source;
  if (!source) return;

  const response = await fetch(source);
  const items = await response.json();
  element.innerHTML = items.map(renderEntry).join("");
};

document.querySelectorAll(".entries").forEach((element) => {
  loadEntries(element).catch(() => {
    element.innerHTML = "<p>Unable to load entries.</p>";
  });
});
