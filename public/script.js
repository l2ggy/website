const renderEntry = ({ icon, title, subtitle, detail }) => `
  <article class="entry">
    <div class="entry-icon" aria-hidden="true">${icon || "Logo"}</div>
    <div>
      <h3>${title}</h3>
      <p>${subtitle}</p>
      <p>${detail}</p>
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
