const renderEntry = (item) => {
  const article = document.createElement("article");
  article.className = "entry";
  article.innerHTML = `
    <div class="entry-logo" aria-hidden="true">${item.logo || ""}</div>
    <div class="entry-body">
      <h3>${item.title || ""}</h3>
      <p>${item.subtitle || ""}</p>
      <p class="entry-meta">${item.meta || ""}</p>
    </div>
  `;
  return article;
};

const loadSection = async (url, targetId) => {
  const target = document.getElementById(targetId);
  if (!target) return;

  try {
    const response = await fetch(url);
    const data = await response.json();
    target.replaceChildren(...data.map(renderEntry));
  } catch {
    target.textContent = "Add entries in the matching data file.";
  }
};

loadSection("data/education.json", "education-list");
loadSection("data/experience.json", "experience-list");
