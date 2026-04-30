export const splitHeroNameLetters = () => {
  const heroName = document.querySelector("#hero-name");
  if (!heroName || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const originalText = heroName.textContent || "";
  if (!originalText) {
    return;
  }
  const unstaggerDurationMs = 320;
  let plainNameTimer = null;

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

  const showPlainName = ({ immediate = false } = {}) => {
    if (plainNameTimer) {
      clearTimeout(plainNameTimer);
      plainNameTimer = null;
    }

    heroName.classList.remove("hero-name-animate");
    if (immediate || !heroName.classList.contains("hero-name-split")) {
      heroName.classList.remove("hero-name-split");
      heroName.removeAttribute("aria-label");
      heroName.textContent = originalText;
      return;
    }

    plainNameTimer = setTimeout(() => {
      heroName.classList.remove("hero-name-split");
      heroName.removeAttribute("aria-label");
      heroName.textContent = originalText;
      plainNameTimer = null;
    }, unstaggerDurationMs);
  };

  const showAnimatedName = () => {
    if (plainNameTimer) {
      clearTimeout(plainNameTimer);
      plainNameTimer = null;
    }
    randomizeHeroLetters();
    heroName.classList.remove("hero-name-animate");
    heroName.classList.add("hero-name-split");
    heroName.setAttribute("aria-label", originalText);
    heroName.textContent = "";
    letterSpans.forEach((span) => heroName.append(span));
    requestAnimationFrame(() => heroName.classList.add("hero-name-animate"));
  };

  const supportsHoverCursor = window.matchMedia("(any-hover: hover) and (any-pointer: fine)").matches;

  let isAnimated = false;
  let lastPointerType = "";
  const toggleAnimatedName = () => {
    if (isAnimated) {
      showPlainName();
    } else {
      showAnimatedName();
    }
    isAnimated = !isAnimated;
  };

  heroName.addEventListener("pointerdown", (event) => {
    lastPointerType = event.pointerType;
  });

  heroName.addEventListener("click", () => {
    if (supportsHoverCursor && lastPointerType !== "touch" && lastPointerType !== "pen") {
      return;
    }
    toggleAnimatedName();
  });

  if (supportsHoverCursor) {
    showPlainName({ immediate: true });
    heroName.addEventListener("pointerenter", showAnimatedName);
    heroName.addEventListener("focusin", showAnimatedName);
    heroName.addEventListener("pointerleave", showPlainName);
    heroName.addEventListener("focusout", showPlainName);
  }
};
