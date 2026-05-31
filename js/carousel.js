(function () {
  function setupInfiniteCarousel(options) {
    const {
      items,
      track,
      renderItem,
      prevButton,
      nextButton,
      autoPlayDelay = 4200
    } = options;

    if (!items.length || !track) {
      return null;
    }

    const clonesBefore = items.map((item) => renderItem(item, true));
    const originals = items.map((item) => renderItem(item));
    const clonesAfter = items.map((item) => renderItem(item, true));

    track.innerHTML = "";
    [...clonesBefore, ...originals, ...clonesAfter].forEach((element) => track.appendChild(element));

    let currentIndex = items.length;
    let intervalId = null;
    let isDragging = false;
    let startX = 0;
    let deltaX = 0;

    const readCardWidth = () => {
      const firstCard = track.querySelector(".carousel-card");
      if (!firstCard) {
        return 0;
      }

      const gap = parseFloat(window.getComputedStyle(track).columnGap || window.getComputedStyle(track).gap) || 0;
      return firstCard.getBoundingClientRect().width + gap;
    };

    const updatePosition = (animate = true) => {
      const offset = readCardWidth() * currentIndex;
      track.style.transition = animate ? "transform 420ms ease" : "none";
      track.style.transform = `translateX(-${offset}px)`;
    };

    const normalizeIndex = () => {
      if (currentIndex >= items.length * 2) {
        currentIndex = items.length;
        updatePosition(false);
      }

      if (currentIndex < items.length) {
        currentIndex = items.length * 2 - 1;
        updatePosition(false);
      }
    };

    const moveTo = (direction) => {
      currentIndex += direction;
      updatePosition(true);
    };

    const startAutoPlay = () => {
      stopAutoPlay();
      intervalId = window.setInterval(() => moveTo(1), autoPlayDelay);
    };

    const stopAutoPlay = () => {
      if (intervalId) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleDragStart = (clientX) => {
      isDragging = true;
      startX = clientX;
      deltaX = 0;
      stopAutoPlay();
    };

    const handleDragMove = (clientX) => {
      if (!isDragging) {
        return;
      }

      deltaX = clientX - startX;
    };

    const handleDragEnd = () => {
      if (!isDragging) {
        return;
      }

      isDragging = false;

      if (deltaX > 50) {
        moveTo(-1);
      } else if (deltaX < -50) {
        moveTo(1);
      }

      startAutoPlay();
    };

    prevButton?.addEventListener("click", () => {
      moveTo(-1);
      startAutoPlay();
    });

    nextButton?.addEventListener("click", () => {
      moveTo(1);
      startAutoPlay();
    });

    track.addEventListener("transitionend", normalizeIndex);

    track.addEventListener("mouseenter", stopAutoPlay);
    track.addEventListener("mouseleave", startAutoPlay);

    track.addEventListener("touchstart", (event) => handleDragStart(event.touches[0].clientX), { passive: true });
    track.addEventListener("touchmove", (event) => handleDragMove(event.touches[0].clientX), { passive: true });
    track.addEventListener("touchend", handleDragEnd);

    track.addEventListener("mousedown", (event) => handleDragStart(event.clientX));
    window.addEventListener("mousemove", (event) => handleDragMove(event.clientX));
    window.addEventListener("mouseup", handleDragEnd);

    window.addEventListener("resize", () => {
      updatePosition(false);
    });

    updatePosition(false);
    startAutoPlay();

    return {
      moveNext: () => moveTo(1),
      movePrev: () => moveTo(-1)
    };
  }

  window.setupInfiniteCarousel = setupInfiniteCarousel;
})();
