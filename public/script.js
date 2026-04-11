const root = document.documentElement;
const toggle = document.getElementById("theme-toggle");

toggle?.addEventListener("click", () => {
  root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
});
