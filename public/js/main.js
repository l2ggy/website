import { splitHeroNameLetters } from "./hero-name.js";
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

const initStats = () => {
  const section = document.querySelector("#stats");
  if (!section) {
    return;
  }

  loadStats(section).then(renderStats).catch(setStatsFallback);
};

document.addEventListener("DOMContentLoaded", () => {
  setupTheme();
  splitHeroNameLetters();
  initEntries();
  initStats();
  renderGitHubHeatmap();
});
