const renderIcon = (icon, title) => {
  if (!icon) {
    return '<div class="entry-icon" aria-hidden="true">Icon</div>';
  }

  return `<img class="entry-icon entry-thumb" src="${icon}" alt="${title} logo" loading="lazy" />`;
};

const isFutureStartDate = (startDate) => {
  if (!startDate) {
    return false;
  }

  const parsed = new Date(startDate);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parsed > today;
};

const formatEntryDates = ({ dates, startDate }) => {
  if (!isFutureStartDate(startDate)) {
    return dates || "";
  }

  return dates ? `Incoming · ${dates}` : "Incoming";
};

export const renderEntry = ({ icon, title, subtitle, dates, startDate }) => `
  <article class="entry subsection-item">
    ${renderIcon(icon, title)}
    <div class="entry-main">
      <div class="entry-head">
        <h3>${title}</h3>
        <p class="entry-dates">${formatEntryDates({ dates, startDate })}</p>
      </div>
      <p>${subtitle}</p>
    </div>
  </article>
`;

export const renderProject = ({ title, summary, tools, link }) => `
  <article class="entry project-entry subsection-item">
    <div class="entry-main">
      <h3>${link ? `<a class="project-title-link" href="${link}" target="_blank" rel="noreferrer">${title}</a>` : title}</h3>
      <p>${summary}</p>
      <p class="project-tools">${tools}</p>
    </div>
  </article>
`;

export const renderLeadership = ({ title, role }) => `
  <article class="leadership-item subsection-item">
    <h3>${title}</h3>
    <p>${role}</p>
  </article>
`;

export const renderContact = ({ location, emails = [] }) => `
  <p>${location || ""}</p>
  <p>${emails.map(({ address }) => `<a href="mailto:${address}">${address}</a>`).join(" · ")}</p>
`;

const renderByKind = {
  entry: renderEntry,
  project: renderProject,
  leadership: renderLeadership,
  contact: renderContact,
};

export const loadEntries = async (element) => {
  const source = element.dataset.source;
  const kind = element.dataset.kind || "entry";
  if (!source || !renderByKind[kind]) {
    return;
  }

  const response = await fetch(source);
  const items = await response.json();
  element.innerHTML = items.map(renderByKind[kind]).join("");
};
