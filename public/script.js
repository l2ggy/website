const dataSources = [
  { url: "education.json", listId: "education-list" },
  { url: "experience.json", listId: "experience-list" },
];

const renderEntry = ({ icon, name, detail, timeframe }) => {
  const li = document.createElement("li");
  li.className = "entry";

  const iconEl = document.createElement("div");
  iconEl.className = "entry-icon";
  iconEl.textContent = icon || "•";

  const textWrap = document.createElement("div");

  const title = document.createElement("p");
  title.className = "entry-title";
  title.textContent = name;

  const sub = document.createElement("p");
  sub.className = "entry-subtext";
  sub.textContent = [detail, timeframe].filter(Boolean).join(" · ");

  textWrap.append(title, sub);
  li.append(iconEl, textWrap);
  return li;
};

const loadList = async ({ url, listId }) => {
  const list = document.getElementById(listId);
  if (!list) return;

  try {
    const response = await fetch(url);
    const items = await response.json();
    items.forEach((item) => list.append(renderEntry(item)));
  } catch {
    list.innerHTML = "<li class='entry-subtext'>Content will be added here.</li>";
  }
};

dataSources.forEach(loadList);
