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

  let plainResetTimeoutId = null;

  const restorePlainName = () => {
    heroName.classList.remove("hero-name-split");
    heroName.removeAttribute("aria-label");
    heroName.textContent = originalText;
  };

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

    if (plainResetTimeoutId) {
      window.clearTimeout(plainResetTimeoutId);
      plainResetTimeoutId = null;
    }

    heroName.classList.remove("hero-name-animate");

    let didRestore = false;
    let pending = letterSpans.length;
    const completeReset = () => {
      if (didRestore) {
        return;
      }
      didRestore = true;
      if (plainResetTimeoutId) {
        window.clearTimeout(plainResetTimeoutId);
        plainResetTimeoutId = null;
      }
      restorePlainName();
    };

    const onResetDone = () => {
      pending -= 1;
      if (pending === 0) {
        completeReset();
      }
    };

    letterSpans.forEach((span) => {
      span.addEventListener("transitionend", onResetDone, { once: true });
    });

    plainResetTimeoutId = window.setTimeout(completeReset, 400);
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

    void heroName.offsetWidth;
    heroName.classList.add("hero-name-animate");
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
