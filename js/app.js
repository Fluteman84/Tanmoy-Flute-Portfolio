document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.getElementById("menuToggle");
  const navLinks = document.getElementById("navLinks");
  const scrollProgress = document.getElementById("scrollProgress");
  const contactForm = document.getElementById("contactForm");
  const connectButton = document.getElementById("connectButton");
  const videoModal = document.getElementById("videoModal");
  const modalVideoShell = document.getElementById("modalVideoShell");
  const closeVideoModal = document.getElementById("closeVideoModal");
  const imageLightbox = document.getElementById("imageLightbox");
  const lightboxImage = document.getElementById("lightboxImage");
  const closeLightbox = document.getElementById("closeLightbox");
  const mailLink = document.querySelector(".mail-me-link");
  const mailCloud = document.querySelector(".mail-cloud");
  const mailCopyToast = document.getElementById("mailCopyToast");
  let mailToastTimer = null;
  let mailCloudHideTimer = null;

  function createInstagramCard(post) {
    const article = document.createElement("article");
    article.className = "carousel-card instagram-card";

    article.innerHTML = `
      <a href="${post.link}" target="_blank" rel="noreferrer">
        <div class="card-media">
          <img src="${post.thumbnail}" alt="${post.caption}" loading="lazy" />
          <span class="card-overlay-icon">IG</span>
        </div>
        <div class="card-content">
          <h3>${post.title}</h3>
          <p>${post.caption}</p>
        </div>
      </a>
    `;

    return article;
  }

  function createVideoCard(video) {
    const article = document.createElement("article");
    article.className = "carousel-card video-card";

    article.innerHTML = `
      <button class="video-card-button" type="button" data-video-id="${video.youtubeId}" data-video-link="${video.link}" aria-label="Play ${video.title}">
        <div class="card-media">
          <img src="${video.thumbnail}" alt="${video.title}" loading="lazy" />
          <span class="play-overlay">&#9658;</span>
        </div>
        <div class="card-content">
          <h3>${video.title}</h3>
          <p>${video.description}</p>
        </div>
      </button>
    `;

    return article;
  }

  window.setupInfiniteCarousel({
    items: instagramPosts,
    track: document.getElementById("instagramTrack"),
    renderItem: createInstagramCard,
    prevButton: document.querySelector('[data-carousel-prev="instagram"]'),
    nextButton: document.querySelector('[data-carousel-next="instagram"]'),
    autoPlayDelay: 3600
  });

  window.setupInfiniteCarousel({
    items: youtubeVideos,
    track: document.getElementById("youtubeTrack"),
    renderItem: createVideoCard,
    prevButton: document.querySelector('[data-carousel-prev="youtube"]'),
    nextButton: document.querySelector('[data-carousel-next="youtube"]'),
    autoPlayDelay: 4600
  });

  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
      const isOpen = navLinks.classList.toggle("is-open");
      menuToggle.classList.toggle("active", isOpen);
      menuToggle.setAttribute("aria-expanded", String(isOpen));
    });

    navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        navLinks.classList.remove("is-open");
        menuToggle.classList.remove("active");
        menuToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.5 }
  );

  function animateCounter(element) {
    const targetValue = Number(element.dataset.counter) || 0;
    const suffix = element.dataset.suffix || "";
    const duration = 1800;
    const start = performance.now();

    function updateCounter(timestamp) {
      const progress = Math.min((timestamp - start) / duration, 1);
      const current = Math.floor(progress * targetValue);
      element.textContent = `${current}${suffix}`;

      if (progress < 1) {
        window.requestAnimationFrame(updateCounter);
      }
    }

    window.requestAnimationFrame(updateCounter);
  }

  document.querySelectorAll("[data-counter]").forEach((counter) => counterObserver.observe(counter));

  const filterContainer = document.getElementById("categoryFilters");
  const categoryCards = Array.from(document.querySelectorAll(".category-card"));

  if (filterContainer && categoryCards.length) {
    filterContainer.addEventListener("click", (event) => {
      const chip = event.target.closest("[data-filter]");
      if (!chip) {
        return;
      }

      filterContainer.querySelectorAll(".filter-chip").forEach((button) => {
        button.classList.toggle("active", button === chip);
      });

      const filter = chip.dataset.filter;
      categoryCards.forEach((card) => {
        const matches = filter === "all" || card.dataset.category.includes(filter);
        card.classList.toggle("is-hidden", !matches);
      });
    });
  }

  function updateScrollProgress() {
    const scrollTop = window.scrollY;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    scrollProgress.style.width = `${progress}%`;
  }

  window.addEventListener("scroll", updateScrollProgress);
  updateScrollProgress();

  document.addEventListener("click", (event) => {
    const videoButton = event.target.closest("[data-video-id]");
    if (videoButton) {
      openVideoModal(videoButton.dataset.videoId);
    }

    const galleryButton = event.target.closest("[data-lightbox]");
    if (galleryButton) {
      openLightbox(galleryButton.dataset.lightbox);
    }

    if (event.target.hasAttribute("data-close-modal")) {
      closeModal();
    }

    if (event.target.hasAttribute("data-close-lightbox")) {
      closeLightboxModal();
    }
  });

  function openVideoModal(videoId) {
    modalVideoShell.innerHTML = `
      <iframe
        src="https://www.youtube.com/embed/${videoId}?autoplay=1"
        title="YouTube performance video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
    `;
    videoModal.classList.add("is-open");
    videoModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    modalVideoShell.innerHTML = "";
    videoModal.classList.remove("is-open");
    videoModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function openLightbox(src) {
    lightboxImage.src = src;
    imageLightbox.classList.add("is-open");
    imageLightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeLightboxModal() {
    lightboxImage.src = "";
    imageLightbox.classList.remove("is-open");
    imageLightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  closeVideoModal.addEventListener("click", closeModal);
  closeLightbox.addEventListener("click", closeLightboxModal);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
      closeLightboxModal();
    }
  });

  if (contactForm && connectButton) {
    connectButton.addEventListener("click", () => {
      const connectUrl = contactForm.dataset.connectUrl;
      if (connectUrl) {
        window.open(connectUrl, "_blank", "noopener,noreferrer");
      }
    });
  }

  async function copyTextToClipboard(value) {
    if (!value) {
      return false;
    }

    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch (error) {
        return false;
      }
    }

    const helper = document.createElement("textarea");
    helper.value = value;
    helper.setAttribute("readonly", "");
    helper.style.position = "absolute";
    helper.style.left = "-9999px";
    document.body.appendChild(helper);
    helper.select();

    let didCopy = false;
    try {
      didCopy = document.execCommand("copy");
    } catch (error) {
      didCopy = false;
    }

    document.body.removeChild(helper);
    return didCopy;
  }

  function showMailCopiedToast() {
    if (!mailCopyToast) {
      return;
    }

    mailCopyToast.classList.add("is-visible");
    window.clearTimeout(mailToastTimer);
    mailToastTimer = window.setTimeout(() => {
      mailCopyToast.classList.remove("is-visible");
    }, 2400);
  }

  if (mailLink && mailCloud) {
    const mailId = mailLink.dataset.mailId || "";
    const hideDelayMs = 500;

    const showMailCloud = () => {
      window.clearTimeout(mailCloudHideTimer);
      mailCloud.classList.add("is-visible");
    };

    const hideMailCloudWithDelay = () => {
      window.clearTimeout(mailCloudHideTimer);
      mailCloudHideTimer = window.setTimeout(() => {
        mailCloud.classList.remove("is-visible");
      }, hideDelayMs);
    };

    const hideMailCloudNow = () => {
      window.clearTimeout(mailCloudHideTimer);
      mailCloud.classList.remove("is-visible");
    };

    const handleCopy = async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const copied = await copyTextToClipboard(mailId);
      if (copied) {
        showMailCopiedToast();
        hideMailCloudWithDelay();
      }
    };

    mailCloud.addEventListener("click", handleCopy);

    mailCloud.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        handleCopy(event);
      }
    });

    mailLink.addEventListener("mouseenter", showMailCloud);
    mailLink.addEventListener("mouseleave", hideMailCloudWithDelay);
    mailCloud.addEventListener("mouseenter", showMailCloud);
    mailCloud.addEventListener("mouseleave", hideMailCloudWithDelay);
  }

  const testimonialCards = Array.from(document.querySelectorAll(".testimonial-card"));
  let testimonialIndex = 0;

  if (testimonialCards.length > 1) {
    window.setInterval(() => {
      testimonialCards[testimonialIndex].classList.remove("active");
      testimonialIndex = (testimonialIndex + 1) % testimonialCards.length;
      testimonialCards[testimonialIndex].classList.add("active");
    }, 4200);
  }
});
