import { ICONS } from "./icons";

// Screenshot Data
const SCREENSHOTS = [
  {
    id: "home",
    title: "01 / HOME & STREAM EXTRACTOR",
    subtitle: "Paste any link to auto-inspect metadata, available resolutions, and audio codecs.",
    src: "/gallery/main-home.png",
    hotspots: [
      { text: "Smart Format Detection (4K / 1080p / MP3)", top: "35%", left: "62%", color: "var(--yellow)" },
      { text: "One-Click Instant Download", top: "72%", left: "62%", color: "var(--coral)" },
      { text: "Live Video & Channel Metadata", top: "52%", left: "18%", color: "var(--teal)" },
    ],
  },
  {
    id: "search",
    title: "02 / IN-APP YOUTUBE SEARCH",
    subtitle: "Search YouTube videos directly inside the desktop app without opening a browser.",
    src: "/gallery/search.png",
    hotspots: [
      { text: "Fast YouTube Search Engine", top: "18%", left: "45%", color: "var(--yellow)" },
      { text: "Thumbnail & Duration Grid", top: "48%", left: "30%", color: "var(--purple)" },
      { text: "1-Click Direct Enqueue", top: "65%", left: "75%", color: "var(--green)" },
    ],
  },
  {
    id: "playlist",
    title: "03 / BATCH PLAYLIST GRABBER",
    subtitle: "Fetch full playlists or albums. Download dozens of tracks concurrently at max speed.",
    src: "/gallery/playlist.png",
    hotspots: [
      { text: "Batch Item Checkboxes & Select All", top: "25%", left: "35%", color: "var(--teal)" },
      { text: "Auto-Index & Chapter Naming", top: "55%", left: "65%", color: "var(--yellow)" },
      { text: "Parallel Concurrency Queue", top: "78%", left: "40%", color: "var(--coral)" },
    ],
  },
];

document.addEventListener("DOMContentLoaded", () => {
  initCursorSpotlight();
  initTiltCards();
  initScreenshotShowcase();
  initInteractiveCalculator();
  initFaqAccordion();
  initCopyLink();
  initLightbox();
  fetchLatestReleaseInfo();
});

// 1. Cursor Spotlight Tracking
function initCursorSpotlight() {
  window.addEventListener("mousemove", (e) => {
    document.documentElement.style.setProperty("--mouse-x", `${e.clientX}px`);
    document.documentElement.style.setProperty("--mouse-y", `${e.clientY}px`);
  });
}

// 2. 3D Tilt Cards
function initTiltCards() {
  const cards = document.querySelectorAll(".tilt-card");
  cards.forEach((card) => {
    const el = card as HTMLElement;
    el.addEventListener("mousemove", (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -5;
      const rotateY = ((x - centerX) / centerX) * 5;

      el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translate(-2px, -2px)`;
    });

    el.addEventListener("mouseleave", () => {
      el.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) translate(0, 0)";
    });
  });
}

// 3. Screenshot Showcase
function initScreenshotShowcase() {
  const tabsContainer = document.getElementById("showcase-tabs");
  const imgEl = document.getElementById("showcase-current-img") as HTMLImageElement;
  const titleEl = document.getElementById("showcase-title");
  const subtitleEl = document.getElementById("showcase-subtitle");
  const hotspotsContainer = document.getElementById("showcase-hotspots");

  if (!tabsContainer || !imgEl) return;

  let activeIndex = 0;

  function renderShowcase(index: number) {
    activeIndex = index;
    const item = SCREENSHOTS[index];

    // Update image with smooth fade
    imgEl.style.opacity = "0.3";
    setTimeout(() => {
      imgEl.src = item.src;
      imgEl.alt = item.title;
      imgEl.style.opacity = "1";
    }, 150);

    if (titleEl) titleEl.textContent = item.title;
    if (subtitleEl) subtitleEl.textContent = item.subtitle;

    // Update tabs active state
    document.querySelectorAll(".showcase-tab-btn").forEach((btn, i) => {
      if (i === index) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Update Hotspots
    if (hotspotsContainer) {
      hotspotsContainer.innerHTML = item.hotspots
        .map(
          (h) => `
          <div class="hotspot-pill" style="top: ${h.top}; left: ${h.left}; background: ${h.color};">
            <span class="icon-svg">${ICONS.zap}</span>
            <span>${h.text}</span>
          </div>
        `
        )
        .join("");
    }
  }

  // Bind tab buttons
  document.querySelectorAll(".showcase-tab-btn").forEach((btn, idx) => {
    btn.addEventListener("click", () => renderShowcase(idx));
  });

  renderShowcase(0);
}

// 4. Interactive Calculator
function initInteractiveCalculator() {
  const formatSelect = document.getElementById("calc-format") as HTMLSelectElement;
  const durationSlider = document.getElementById("calc-duration") as HTMLInputElement;
  const durationVal = document.getElementById("calc-duration-val");
  const sizeVal = document.getElementById("calc-size-val");
  const timeOmniVal = document.getElementById("calc-time-omni");
  const timeWebVal = document.getElementById("calc-time-web");
  const codecVal = document.getElementById("calc-codec-val");

  if (!formatSelect || !durationSlider) return;

  function calculate() {
    const mins = parseInt(durationSlider.value, 10);
    const fmt = formatSelect.value;

    if (durationVal) {
      durationVal.textContent = mins >= 60 ? `${(mins / 60).toFixed(1)} hours (${mins} min)` : `${mins} minutes`;
    }

    let mbPerMin = 25; // default 1080p
    let codec = "H.264 + AAC (192 kbps)";

    if (fmt === "4k") {
      mbPerMin = 85;
      codec = "AV1 / VP9 (60fps) + Opus (160 kbps)";
    } else if (fmt === "1080p") {
      mbPerMin = 28;
      codec = "H.264 (60fps) + AAC (192 kbps)";
    } else if (fmt === "720p") {
      mbPerMin = 14;
      codec = "H.264 (30fps) + AAC (128 kbps)";
    } else if (fmt === "mp3") {
      mbPerMin = 2.4;
      codec = "Pure MP3 VBR 0 (~320 kbps)";
    }

    const totalMb = Math.round(mins * mbPerMin);
    const sizeDisplay = totalMb >= 1024 ? `${(totalMb / 1024).toFixed(2)} GB` : `${totalMb} MB`;

    // OmniDL speed ~ 18 MB/s vs Web speed ~ 1.5 MB/s
    const omniSecs = Math.max(1, Math.round(totalMb / 18));
    const webSecs = Math.max(5, Math.round(totalMb / 1.5));

    if (sizeVal) sizeVal.textContent = sizeDisplay;
    if (timeOmniVal) timeOmniVal.textContent = omniSecs > 60 ? `~${Math.round(omniSecs / 60)} min ${omniSecs % 60}s` : `~${omniSecs} seconds`;
    if (timeWebVal) timeWebVal.textContent = webSecs > 60 ? `~${Math.round(webSecs / 60)} min` : `~${webSecs} seconds`;
    if (codecVal) codecVal.textContent = codec;
  }

  formatSelect.addEventListener("change", calculate);
  durationSlider.addEventListener("input", calculate);
  calculate();
}

// 5. FAQ Accordion
function initFaqAccordion() {
  const faqItems = document.querySelectorAll(".faq-item");
  faqItems.forEach((item) => {
    const header = item.querySelector(".faq-header");
    header?.addEventListener("click", () => {
      const isOpen = item.classList.contains("open");
      faqItems.forEach((i) => i.classList.remove("open"));
      if (!isOpen) {
        item.classList.add("open");
      }
    });
  });
}

// 6. Copy Link
function initCopyLink() {
  const copyBtn = document.getElementById("copy-download-link");
  copyBtn?.addEventListener("click", () => {
    const link = "https://github.com/HyIsNoob/OmniDL/releases/latest/download/OmniDL-Setup-1.6.3.exe";
    navigator.clipboard.writeText(link).then(() => {
      showToast("Download link copied to clipboard!");
    });
  });
}

// 7. Lightbox Preview Modal
function initLightbox() {
  const modal = document.getElementById("lightbox-modal");
  const modalImg = document.getElementById("lightbox-img") as HTMLImageElement;
  const openTrigger = document.getElementById("showcase-img-wrap");
  const closeBtn = document.getElementById("lightbox-close");

  if (!modal || !modalImg || !openTrigger) return;

  openTrigger.addEventListener("click", () => {
    const currentSrc = (document.getElementById("showcase-current-img") as HTMLImageElement)?.src;
    if (currentSrc) {
      modalImg.src = currentSrc;
      modal.classList.add("active");
    }
  });

  closeBtn?.addEventListener("click", () => modal.classList.remove("active"));
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("active");
  });
}

// 8. Live GitHub Release Tag Fetcher
async function fetchLatestReleaseInfo() {
  try {
    const res = await fetch("https://api.github.com/repos/HyIsNoob/OmniDL/releases/latest");
    if (res.ok) {
      const data = await res.json();
      const tag = data.tag_name || "v1.6.3";
      document.querySelectorAll("[data-latest-version]").forEach((el) => {
        el.textContent = tag;
      });
    }
  } catch {
    /* fallback to default */
  }
}

function showToast(msg: string) {
  const toast = document.getElementById("landing-toast");
  if (toast) {
    toast.innerHTML = `<span class="icon-svg" style="color: #000;">${ICONS.check}</span> <span>${msg}</span>`;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3500);
  }
}
