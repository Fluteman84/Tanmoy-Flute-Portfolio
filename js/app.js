document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.getElementById("menuToggle");
  const navLinks = document.getElementById("navLinks");

  // ── Tools dropdown ───────────────────────────────
  const toolsDropdown = document.getElementById("toolsDropdown");
  const toolsToggle = document.getElementById("toolsToggle");

  if (toolsToggle && toolsDropdown) {
    toolsToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = toolsDropdown.classList.toggle("is-open");
      toolsToggle.setAttribute("aria-expanded", String(isOpen));
    });

    // Close on outside click
    document.addEventListener("click", (e) => {
      if (!toolsDropdown.contains(e.target)) {
        toolsDropdown.classList.remove("is-open");
        toolsToggle.setAttribute("aria-expanded", "false");
      }
    });

    // Close on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        toolsDropdown.classList.remove("is-open");
        toolsToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  // ── Mobile Navigation Drawer ───────────────────────
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

  // ── Render Instagram Reels (Single unique render, NO duplicates) ──
  const instagramTrack = document.getElementById("instagramTrack");
  if (instagramTrack && typeof instagramPosts !== "undefined" && Array.isArray(instagramPosts)) {
    instagramTrack.innerHTML = "";
    instagramPosts.forEach((post) => {
      const article = document.createElement("article");
      article.className = "carousel-card instagram-card";
      article.innerHTML = `
        <a href="${post.link}" target="_blank" rel="noreferrer" aria-label="${post.caption}">
          <div class="card-media">
            <img src="${post.thumbnail}" alt="${post.caption}" loading="lazy" />
            <span class="card-overlay-icon" aria-hidden="true">IG</span>
          </div>
          <div class="card-content">
            <h3>${post.title}</h3>
            <p>${post.caption}</p>
          </div>
        </a>
      `;
      instagramTrack.appendChild(article);
    });
  }

  // ── Render Featured YouTube Performances (Exactly 3, 16:9 thumbnail previews, click-to-play) ──
  const featuredVideosGrid = document.getElementById("featuredVideosGrid");
  if (featuredVideosGrid && typeof youtubeVideos !== "undefined" && Array.isArray(youtubeVideos)) {
    featuredVideosGrid.innerHTML = "";
    youtubeVideos.slice(0, 3).forEach((video, index) => {
      const card = document.createElement("article");
      card.className = "featured-video-card glass-card";
      card.innerHTML = `
        <div class="video-media-shell" id="videoShell-${index}">
          <img src="${video.thumbnail}" alt="${video.title}" loading="lazy" class="video-thumb" />
          <span class="video-category-badge">${video.category || "Performance"}</span>
          <button class="play-overlay-button" type="button" aria-label="Play ${video.title} video">
            <span class="play-icon" aria-hidden="true">&#9658;</span>
          </button>
        </div>
        <div class="video-card-content">
          <span class="video-category-label">${video.category || "Performance"}</span>
          <h3>${video.title}</h3>
          <p>${video.description}</p>
        </div>
      `;

      const shell = card.querySelector(".video-media-shell");
      const playBtn = card.querySelector(".play-overlay-button");

      function loadPlayer() {
        shell.innerHTML = `
          <iframe
            src="https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1"
            title="${video.title}"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
        `;
        shell.classList.add("is-playing");
      }

      playBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        loadPlayer();
      });

      shell.addEventListener("click", () => {
        if (!shell.classList.contains("is-playing")) {
          loadPlayer();
        }
      });

      featuredVideosGrid.appendChild(card);
    });
  }

  // ── Reveal on Scroll (IntersectionObserver) ────────
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

  // ── Music Category Filters ────────────────────────
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

  // ── Scroll Progress Bar ───────────────────────────
  const scrollProgress = document.getElementById("scrollProgress");
  function updateScrollProgress() {
    if (!scrollProgress) return;
    const scrollTop = window.scrollY;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    scrollProgress.style.width = `${progress}%`;
  }
  window.addEventListener("scroll", updateScrollProgress, { passive: true });
  updateScrollProgress();

  // ── Lightbox for Gallery Images ───────────────────
  const imageLightbox = document.getElementById("imageLightbox");
  const lightboxImage = document.getElementById("lightboxImage");
  const closeLightbox = document.getElementById("closeLightbox");

  function openLightbox(src) {
    if (!imageLightbox || !lightboxImage) return;
    lightboxImage.src = src;
    imageLightbox.classList.add("is-open");
    imageLightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeLightboxModal() {
    if (!imageLightbox || !lightboxImage) return;
    lightboxImage.src = "";
    imageLightbox.classList.remove("is-open");
    imageLightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  if (closeLightbox) {
    closeLightbox.addEventListener("click", closeLightboxModal);
  }

  document.addEventListener("click", (event) => {
    const galleryButton = event.target.closest("[data-lightbox]");
    if (galleryButton) {
      openLightbox(galleryButton.dataset.lightbox);
    }

    if (event.target.hasAttribute("data-close-lightbox")) {
      closeLightboxModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeLightboxModal();
    }
  });

  // ── Contact Form Connect Button ───────────────────
  const contactForm = document.getElementById("contactForm");
  const connectButton = document.getElementById("connectButton");
  if (contactForm && connectButton) {
    connectButton.addEventListener("click", () => {
      const connectUrl = contactForm.dataset.connectUrl;
      if (connectUrl) {
        window.open(connectUrl, "_blank", "noopener,noreferrer");
      }
    });
  }

  // ── Mail Me Copy and Toast Interaction ─────────────
  const mailLink = document.querySelector(".mail-me-link");
  const mailCloud = document.querySelector(".mail-cloud");
  const mailCopyToast = document.getElementById("mailCopyToast");
  let mailToastTimer = null;
  let mailCloudHideTimer = null;

  async function copyTextToClipboard(value) {
    if (!value) return false;
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
    if (!mailCopyToast) return;
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
});
