const renderIcon = (icon, title) => {
  if (!icon) {
    return '<div class="entry-icon" aria-hidden="true">Icon</div>';
  }

  return `<img class="entry-icon entry-thumb" src="${icon}" alt="${title} logo" loading="lazy" />`;
};

const renderEntry = ({ icon, title, subtitle, dates }) => `
  <article class="entry">
    ${renderIcon(icon, title)}
    <div class="entry-main">
      <div class="entry-head">
        <h3>${title}</h3>
        <p class="entry-dates">${dates || ""}</p>
      </div>
      <p>${subtitle}</p>
    </div>
  </article>
`;

const renderProject = ({ title, summary, tools, link }) => `
  <article class="entry project-entry">
    <div class="entry-main">
      <h3>${link ? `<a class="project-title-link" href="${link}" target="_blank" rel="noreferrer">${title}</a>` : title}</h3>
      <p>${summary}</p>
      <p class="project-tools">${tools}</p>
    </div>
  </article>
`;

const renderByKind = {
  entry: renderEntry,
  project: renderProject,
};

const renderGitHubHeatmap = () => {
  const section = document.querySelector(".hero-heatmap-wrap");
  const heatmapImage = document.querySelector("#github-heatmap");
  const user = section?.dataset.githubUser?.trim();
  const chartColor = "303030";

  if (!section || !heatmapImage || !user) {
    return;
  }

  heatmapImage.src = `https://ghchart.rshah.org/${chartColor}/${encodeURIComponent(user)}`;
  heatmapImage.alt = `${user}'s GitHub contribution heatmap`;
};

const loadEntries = async (element) => {
  const source = element.dataset.source;
  const kind = element.dataset.kind || "entry";
  if (!source || !renderByKind[kind]) return;

  const response = await fetch(source);
  const items = await response.json();
  element.innerHTML = items.map(renderByKind[kind]).join("");
};

const formatInteger = (value) => new Intl.NumberFormat("en-US").format(value);

const loadStats = async () => {
  const statsSection = document.querySelector("#stats");
  if (!statsSection) return;

  const leetcodeUser = statsSection.dataset.leetcodeUser || "lagsterino";
  const monkeytypeUser = statsSection.dataset.monkeytypeUser || "laggy";
  const response = await fetch(`/api/stats?leetcode=${encodeURIComponent(leetcodeUser)}&monkeytype=${encodeURIComponent(monkeytypeUser)}`);

  if (!response.ok) {
    throw new Error("Unable to load stats");
  }

  const stats = await response.json();
  const leetcodeSolved = document.querySelector("#leetcode-solved");
  const leetcodeContest = document.querySelector("#leetcode-contest");
  const monkeytypeVolume = document.querySelector("#monkeytype-volume");
  const monkeytypePb = document.querySelector("#monkeytype-pb");

  if (leetcodeSolved) {
    const solved = stats.leetcode?.solved;
    leetcodeSolved.textContent = solved
      ? `${formatInteger(solved.all)} solved (${formatInteger(solved.easy)} easy · ${formatInteger(solved.medium)} medium · ${formatInteger(solved.hard)} hard)`
      : "Solved stats unavailable.";
  }

  if (leetcodeContest) {
    const rating = stats.leetcode?.contest?.rating;
    const top = stats.leetcode?.contest?.topPercentage;
    leetcodeContest.textContent = rating && top !== null
      ? `Contest rating: ${formatInteger(rating)} · top ${top.toFixed(2)}%`
      : "Contest stats unavailable.";
  }

  if (monkeytypeVolume) {
    const completedTests = stats.monkeytype?.completedTests;
    const totalTypingHours = stats.monkeytype?.totalTypingHours;
    monkeytypeVolume.textContent = completedTests !== undefined && totalTypingHours !== undefined
      ? `${formatInteger(completedTests)} tests completed · ${totalTypingHours}h total typing`
      : "Typing volume unavailable.";
  }

  if (monkeytypePb) {
    const pb = stats.monkeytype?.pb60;
    const top = stats.monkeytype?.pb60TopPercentage;
    monkeytypePb.textContent = pb && top !== null
      ? `PB (60s): ${pb.toFixed(2)} WPM · top ${top.toFixed(2)}%`
      : "PB (60s) unavailable.";
  }
};

const systemThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
const storedThemeKey = "portfolio-theme-override";
const themeToggle = document.querySelector("#theme-toggle");
let overrideTheme = localStorage.getItem(storedThemeKey);

const getSystemTheme = () => (systemThemeQuery.matches ? "dark" : "light");

const applyTheme = (theme) => {
  document.documentElement.dataset.theme = theme;
  if (themeToggle) {
    themeToggle.textContent = theme === "dark" ? "Light mode" : "Dark mode";
    themeToggle.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} mode`);
  }
};

applyTheme(overrideTheme || getSystemTheme());

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.dataset.theme || getSystemTheme();
    overrideTheme = currentTheme === "dark" ? "light" : "dark";
    localStorage.setItem(storedThemeKey, overrideTheme);
    applyTheme(overrideTheme);
  });
}

systemThemeQuery.addEventListener("change", () => {
  const systemTheme = getSystemTheme();

  if (overrideTheme && overrideTheme !== systemTheme) {
    overrideTheme = null;
    localStorage.removeItem(storedThemeKey);
  }

  if (!overrideTheme) {
    applyTheme(systemTheme);
  }
});

document.querySelectorAll(".entries").forEach((element) => {
  loadEntries(element).catch(() => {
    element.innerHTML = "<p>Unable to load entries.</p>";
  });
});

loadStats().catch(() => {
  const statsLines = [
    document.querySelector("#leetcode-solved"),
    document.querySelector("#leetcode-contest"),
    document.querySelector("#monkeytype-volume"),
    document.querySelector("#monkeytype-pb"),
  ];

  statsLines.forEach((line) => {
    if (line) {
      line.textContent = "Stats unavailable right now.";
    }
  });
});

renderGitHubHeatmap();
