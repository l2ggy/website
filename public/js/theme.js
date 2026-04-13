const storedThemeKey = "portfolio-theme-override";

export const setupTheme = () => {
  const themeToggle = document.querySelector("#theme-toggle");
  const systemThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  let overrideTheme = localStorage.getItem(storedThemeKey);

  const getSystemTheme = () => (systemThemeQuery.matches ? "dark" : "light");

  const applyTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    if (!themeToggle) {
      return;
    }

    themeToggle.classList.toggle("is-dark", theme === "dark");
    const nextTheme = theme === "dark" ? "light" : "dark";
    themeToggle.setAttribute("aria-label", `Switch to ${nextTheme} mode`);
    themeToggle.setAttribute("title", `Switch to ${nextTheme} mode`);
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
};
