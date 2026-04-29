export const splitHeroNameLetters = () => {
  const heroName = document.querySelector("#hero-name");
  if (!heroName || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const originalText = heroName.textContent || "";
  if (!originalText) {
    return;
  }

  const letterSpans = Array.from(originalText).map((letter, index) => {
    const span = document.createElement("span");
    span.className = "hero-letter";
    span.style.setProperty("--hero-letter-i", index);
    span.style.setProperty("--hero-letter-stagger", String(index));
    span.textContent = letter === " " ? "\u00A0" : letter;
    span.setAttribute("aria-hidden", "true");
    return span;
  });

  const randomizeHeroLetters = () => {
    letterSpans.forEach((span) => {
      span.style.setProperty("--hero-letter-seed", (Math.random() * 2 - 1).toFixed(3));
      span.style.setProperty("--hero-letter-stagger", String(Math.floor(Math.random() * letterSpans.length)));
    });
  };

  const showPlainName = () => {
    heroName.classList.remove("hero-name-animate", "hero-name-split");
    heroName.removeAttribute("aria-label");
    heroName.textContent = originalText;
  };

  const showAnimatedName = () => {
    randomizeHeroLetters();
    heroName.classList.remove("hero-name-animate");
    heroName.classList.add("hero-name-split");
    heroName.setAttribute("aria-label", originalText);
    heroName.textContent = "";
    letterSpans.forEach((span) => heroName.append(span));
    requestAnimationFrame(() => heroName.classList.add("hero-name-animate"));
  };

  let isToggled = false;
  const toggleAnimatedName = () => {
    isToggled = !isToggled;
    if (isToggled) {
      showAnimatedName();
      return;
    }
    showPlainName();
  };

  showPlainName();
  const supportsHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  if (supportsHover) {
    heroName.addEventListener("pointerenter", showAnimatedName);
    heroName.addEventListener("focusin", showAnimatedName);
    heroName.addEventListener("pointerleave", showPlainName);
    heroName.addEventListener("focusout", showPlainName);
    return;
  }

  heroName.addEventListener("click", toggleAnimatedName);
  heroName.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    toggleAnimatedName();
  });
};
