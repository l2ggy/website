export const splitHeroNameLetters = () => {
  const heroName = document.querySelector("#hero-name");
  if (!heroName || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const originalText = heroName.textContent || "";
  if (!originalText) {
    return;
  }

  const kerningPairNudges = {
    fi: -0.08,
    fl: -0.06,
    ff: -0.04,
    ffi: -0.1,
    ffl: -0.08,
  };

  const letterSpans = Array.from(originalText).map((letter, index, letters) => {
    const span = document.createElement("span");
    span.className = "hero-letter";
    span.style.setProperty("--hero-letter-i", index);
    span.style.setProperty("--hero-letter-stagger", String(index));
    const previousLetter = letters[index - 1] || "";
    const pair = `${previousLetter}${letter}`.toLowerCase();
    const triple = `${letters[index - 2] || ""}${pair}`.toLowerCase();
    const kerningNudge = kerningPairNudges[triple] ?? kerningPairNudges[pair] ?? 0;
    span.style.setProperty("--hero-letter-kerning-nudge", `${kerningNudge}em`);
    span.textContent = letter === " " ? "\u00A0" : letter;
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
