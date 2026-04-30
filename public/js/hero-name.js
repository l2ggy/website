export const splitHeroNameLetters = () => {
  const heroName = document.querySelector("#hero-name");
  if (!heroName || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const originalText = heroName.textContent || "";
  if (!originalText) {
    return;
  }

  const ligatureGroups = ["ffl", "ffi", "ff", "fi", "fl", "st"];
  const segmentText = (text) => {
    const graphemes = Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text), ({ segment }) => segment);
    const segments = [];
    for (let index = 0; index < graphemes.length; index += 1) {
      const lookahead = graphemes.slice(index, index + 3).join("").toLowerCase();
      const ligature = ligatureGroups.find((group) => lookahead.startsWith(group));
      if (ligature) {
        segments.push(graphemes.slice(index, index + ligature.length).join(""));
        index += ligature.length - 1;
        continue;
      }
      segments.push(graphemes[index]);
    }
    return segments;
  };

  const letterSpans = segmentText(originalText).map((segment, index) => {
    const span = document.createElement("span");
    span.className = "hero-letter";
    span.style.setProperty("--hero-letter-i", index);
    span.style.setProperty("--hero-letter-stagger", String(index));
    span.textContent = segment === " " ? "\u00A0" : segment;
    span.setAttribute("aria-hidden", "true");
    return span;
  });
  const plainResetDurationMs = 320 + letterSpans.length * 18;
  let plainResetTimeoutId = null;

  const randomizeHeroLetters = () => {
    letterSpans.forEach((span) => {
      span.style.setProperty("--hero-letter-seed", (Math.random() * 2 - 1).toFixed(3));
      span.style.setProperty("--hero-letter-stagger", String(Math.floor(Math.random() * letterSpans.length)));
    });
  };

  const showPlainName = () => {
    if (!heroName.classList.contains("hero-name-split")) {
      heroName.classList.remove("hero-name-animate");
      return;
    }
    heroName.classList.remove("hero-name-animate");
    if (plainResetTimeoutId) {
      window.clearTimeout(plainResetTimeoutId);
    }
    plainResetTimeoutId = window.setTimeout(() => {
      heroName.classList.remove("hero-name-split");
      heroName.removeAttribute("aria-label");
      heroName.textContent = originalText;
      plainResetTimeoutId = null;
    }, plainResetDurationMs);
  };

  const showAnimatedName = () => {
    if (plainResetTimeoutId) {
      window.clearTimeout(plainResetTimeoutId);
      plainResetTimeoutId = null;
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
    showPlainName();
    heroName.addEventListener("pointerenter", showAnimatedName);
    heroName.addEventListener("focusin", showAnimatedName);
    heroName.addEventListener("pointerleave", showPlainName);
    heroName.addEventListener("focusout", showPlainName);
  }
};
