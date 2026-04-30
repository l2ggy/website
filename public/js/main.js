import { splitHeroNameLetters } from "./hero-name.js";
import { setupInteractiveGlobe } from "./interactive-globe.js";
import { loadEntries } from "./render/entries.js";
import { renderStats, setStatsFallback } from "./render/stats.js";
import { loadStats } from "./services/stats-client.js";
import { setupTheme } from "./theme.js";

const renderGitHubHeatmap = () => {
  const section = document.querySelector(".hero-heatmap-wrap");
  const heatmapImage = document.querySelector("#github-heatmap");
  const user = section?.dataset.githubUser?.trim();
  const chartColor = "1E3765";

  if (!section || !heatmapImage || !user) {
    return;
  }

  heatmapImage.src = `https://ghchart.rshah.org/${chartColor}/${encodeURIComponent(user)}`;
  heatmapImage.alt = `${user}'s GitHub contribution heatmap`;
};

const initEntries = () => {
  document.querySelectorAll(".entries").forEach((element) => {
    loadEntries(element).catch(() => {
      element.innerHTML = "<p>Unable to load entries.</p>";
    });
  });
};

const initEntryTapIndentation = () => {
  if (!window.matchMedia("(hover: none)").matches) {
    return;
  }

  document.addEventListener("click", (event) => {
    const entry = event.target.closest(".subsection-item");
    const activeEntry = document.querySelector(".subsection-item.is-tapped");

    if (!entry) {
      activeEntry?.classList.remove("is-tapped");
      return;
    }

    if (activeEntry && activeEntry !== entry) {
      activeEntry.classList.remove("is-tapped");
    }

    entry.classList.toggle("is-tapped", activeEntry !== entry);
  });
};

const initStats = () => {
  const section = document.querySelector("#stats");
  if (!section) {
    return;
  }

  loadStats(section).then(renderStats).catch(setStatsFallback);
};

const initVisitStats = async () => {
  try {
    await fetch("/api/visit", { method: "POST", keepalive: true });
  } catch {
    // no-op
  }

  try {
    const response = await fetch("/api/visit-stats");
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  }
};

document.addEventListener("DOMContentLoaded", () => {
  setupTheme();
  splitHeroNameLetters();
  initEntries();
  initEntryTapIndentation();
  initStats();
  renderGitHubHeatmap();
  initVisitStats().then((visitStats) => {
    const visitCount = document.querySelector("#visitor-count");
    if (visitCount && typeof visitStats?.totalVisits === "number") {
      visitCount.textContent = String(visitStats.totalVisits);
    }
    setupInteractiveGlobe(visitStats?.locations || []);
  });
});
