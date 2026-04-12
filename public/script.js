const createItem = (entry, titleKey, subtitleKey) => {
  const item = document.createElement("article");
  item.className = "list-item";

  const icon = document.createElement("div");
  icon.className = "icon-slot";
  icon.textContent = entry.logoText || "•";
  icon.setAttribute("aria-hidden", "true");

  const content = document.createElement("div");
  content.className = "item-content";

  const heading = document.createElement("h3");
  heading.textContent = entry[titleKey] || "";

  const meta = document.createElement("p");
  meta.className = "meta";
  meta.textContent = [entry[subtitleKey], entry.dates].filter(Boolean).join(" · ");

  const summary = document.createElement("p");
  summary.textContent = entry.summary || "";

  content.append(heading, meta, summary);
  item.append(icon, content);
  return item;
};

const loadList = async (url, targetId, titleKey, subtitleKey) => {
  const target = document.getElementById(targetId);
  if (!target) return;

  const response = await fetch(url);
  const entries = await response.json();

  for (const entry of entries) {
    target.append(createItem(entry, titleKey, subtitleKey));
  }
};

loadList("data/education.json", "education-list", "school", "degree");
loadList("data/experience.json", "experience-list", "company", "role");
