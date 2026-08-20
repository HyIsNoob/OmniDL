export interface DemoVideo {
  id: string;
  url: string;
  title: string;
  platform: "youtube" | "tiktok" | "facebook";
  uploader: string;
  duration: string;
  views: string;
  thumbnail: string;
  formats: Array<{
    id: string;
    label: string;
    ext: string;
    size: string;
    badge: string;
  }>;
}

export const DEMO_PRESETS: Record<string, DemoVideo> = {
  yt: {
    id: "mT86JXY6oEw",
    url: "https://www.youtube.com/watch?v=mT86JXY6oEw",
    title: "Wuthering Waves ｜ Resonator Showcase ｜ Qingxiao — CULTIVATION",
    platform: "youtube",
    uploader: "Wuthering Waves Official",
    duration: "04:20",
    views: "1.4M views",
    thumbnail: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80",
    formats: [
      { id: "4k", label: "4K UHD (2160p 60fps)", ext: "MP4 (AV1+Opus)", size: "~420 MB", badge: "MAX QUALITY" },
      { id: "1080p", label: "Full HD (1080p 60fps)", ext: "MP4 (H.264+AAC)", size: "~132 MB", badge: "POPULAR" },
      { id: "720p", label: "HD (720p)", ext: "MP4 (H.264)", size: "~58 MB", badge: "FAST" },
      { id: "mp3-320", label: "Audio MP3 (320 kbps)", ext: "MP3 (High Q)", size: "~10.2 MB", badge: "HQ AUDIO" },
    ],
  },
  tiktok: {
    id: "7644334297121312020",
    url: "https://www.tiktok.com/@oniven/video/7644334297121312020",
    title: "peak animation from fate [saber vs rider 4k] #saber #rider #fate",
    platform: "tiktok",
    uploader: "@oniven",
    duration: "00:30",
    views: "440.6K views",
    thumbnail: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
    formats: [
      { id: "tt-hd", label: "Original HD (No Watermark)", ext: "MP4 (1080x1920)", size: "~46.4 MB", badge: "NO WATERMARK" },
      { id: "tt-audio", label: "Original Sound / Music", ext: "MP3 (Audio Only)", size: "~1.2 MB", badge: "AUDIO" },
    ],
  },
  playlist: {
    id: "PLw-VjHDlEOgv",
    url: "https://www.youtube.com/playlist?list=PLw-VjHDlEOgv_anime_hits",
    title: "Epic Anime OST & Battle Themes Collection (24 Tracks)",
    platform: "youtube",
    uploader: "Anime Soundtracks Vault",
    duration: "24 videos (1h 48m)",
    views: "890K views",
    thumbnail: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
    formats: [
      { id: "pl-best-vid", label: "Batch All: Best Video (1080p/4K)", ext: "24x MP4", size: "~2.4 GB", badge: "ALL VIDEOS" },
      { id: "pl-mp3", label: "Batch All: Extract MP3 (320 kbps)", ext: "24x MP3", size: "~245 MB", badge: "ALL AUDIO" },
    ],
  },
};

export class OmniSimulator {
  private activeTab: "home" | "queue" = "home";
  private currentVideo: DemoVideo = DEMO_PRESETS.yt;
  private selectedFormatId: string = "1080p";
  private isFetching = false;
  private isDownloading = false;
  private downloadProgress = 0;
  private downloadInterval: number | null = null;
  private queueJobs: Array<{
    id: string;
    title: string;
    format: string;
    progress: number;
    status: "downloading" | "completed" | "paused";
    speed: string;
    eta: string;
  }> = [];

  constructor() {
    this.init();
  }

  private init() {
    this.bindEvents();
    this.render();
  }

  private bindEvents() {
    // Tab switching
    document.querySelectorAll("[data-sim-tab]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const target = (e.currentTarget as HTMLElement).dataset.simTab as "home" | "queue";
        this.activeTab = target;
        this.render();
      });
    });

    // Preset pills
    document.querySelectorAll("[data-sim-preset]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const key = (e.currentTarget as HTMLElement).dataset.simPreset;
        if (key && DEMO_PRESETS[key]) {
          this.triggerFetch(DEMO_PRESETS[key]);
        }
      });
    });

    // Fetch button
    const fetchBtn = document.getElementById("sim-fetch-btn");
    fetchBtn?.addEventListener("click", () => {
      const input = document.getElementById("sim-url-input") as HTMLInputElement;
      const val = input?.value.toLowerCase() || "";
      if (val.includes("tiktok")) {
        this.triggerFetch(DEMO_PRESETS.tiktok);
      } else if (val.includes("playlist")) {
        this.triggerFetch(DEMO_PRESETS.playlist);
      } else {
        this.triggerFetch(DEMO_PRESETS.yt);
      }
    });

    // Download / Add to queue buttons
    document.getElementById("sim-download-now")?.addEventListener("click", () => {
      this.startDownload();
    });
  }

  public triggerFetch(preset: DemoVideo) {
    this.isFetching = true;
    this.currentVideo = preset;
    this.selectedFormatId = preset.formats[0]?.id || "";
    this.render();

    const input = document.getElementById("sim-url-input") as HTMLInputElement;
    if (input) input.value = preset.url;

    setTimeout(() => {
      this.isFetching = false;
      this.render();
    }, 600);
  }

  private startDownload() {
    const fmt = this.currentVideo.formats.find((f) => f.id === this.selectedFormatId) || this.currentVideo.formats[0];
    const jobId = Math.random().toString(36).substring(2, 9);
    
    const newJob = {
      id: jobId,
      title: this.currentVideo.title,
      format: `${fmt.label} (${fmt.ext})`,
      progress: 0,
      status: "downloading" as const,
      speed: "16.8 MB/s",
      eta: "00:08",
    };

    this.queueJobs.unshift(newJob);
    this.activeTab = "queue";
    this.render();

    if (this.downloadInterval) clearInterval(this.downloadInterval);

    this.downloadInterval = window.setInterval(() => {
      const job = this.queueJobs.find((j) => j.id === jobId);
      if (!job) {
        if (this.downloadInterval) clearInterval(this.downloadInterval);
        return;
      }

      job.progress += Math.floor(Math.random() * 18) + 12;
      if (job.progress >= 100) {
        job.progress = 100;
        job.status = "completed";
        job.speed = "Done";
        job.eta = "00:00";
        if (this.downloadInterval) clearInterval(this.downloadInterval);
        this.showToast(`Download Complete: "${job.title.slice(0, 30)}…"`);
      }
      this.renderQueue();
    }, 400);
  }

  private showToast(msg: string) {
    const toast = document.getElementById("landing-toast");
    if (toast) {
      toast.textContent = msg;
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 3500);
    }
  }

  private render() {
    // Update Tab Buttons
    document.querySelectorAll("[data-sim-tab]").forEach((btn) => {
      const target = (btn as HTMLElement).dataset.simTab;
      if (target === this.activeTab) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    const homeView = document.getElementById("sim-home-view");
    const queueView = document.getElementById("sim-queue-view");

    if (this.activeTab === "home") {
      homeView?.classList.remove("hidden");
      queueView?.classList.add("hidden");
      this.renderHome();
    } else {
      homeView?.classList.add("hidden");
      queueView?.classList.remove("hidden");
      this.renderQueue();
    }

    // Queue count badge
    const badge = document.getElementById("sim-queue-badge");
    if (badge) {
      const activeCount = this.queueJobs.filter((j) => j.status === "downloading").length;
      badge.textContent = String(this.queueJobs.length);
      badge.style.display = this.queueJobs.length > 0 ? "inline-flex" : "none";
    }
  }

  private renderHome() {
    const metaContainer = document.getElementById("sim-meta-container");
    if (!metaContainer) return;

    if (this.isFetching) {
      metaContainer.innerHTML = `
        <div style="padding: 2.5rem; text-align: center; font-weight: 800; font-family: var(--font-display); font-size: 1.1rem;">
          <span style="display: inline-block; animation: spin 1s linear infinite; margin-right: 0.5rem;">[..]</span>
          EXTRACTING METADATA & STREAM FORMATS…
        </div>
      `;
      return;
    }

    const v = this.currentVideo;
    const platformBadgeColor = v.platform === "youtube" ? "var(--coral)" : v.platform === "tiktok" ? "#000" : "#1877f2";
    const platformBadgeText = v.platform === "youtube" ? "YouTube" : v.platform === "tiktok" ? "TikTok" : "Facebook";

    let formatsHtml = "";
    v.formats.forEach((f) => {
      const isSelected = f.id === this.selectedFormatId;
      formatsHtml += `
        <div class="sim-format-opt ${isSelected ? "selected" : ""}" data-format-id="${f.id}" style="
          border: 3px solid var(--black);
          padding: 0.75rem 1rem;
          margin-bottom: 0.6rem;
          background: ${isSelected ? "var(--yellow)" : "#ffffff"};
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-weight: 700;
          box-shadow: ${isSelected ? "3px 3px 0 0 var(--black)" : "none"};
          transition: all 0.1s ease;
        ">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <input type="radio" name="simFormat" ${isSelected ? "checked" : ""} style="accent-color: #000; width: 16px; height: 16px;">
            <div>
              <div style="font-family: var(--font-display); font-size: 0.9rem;">${f.label}</div>
              <div style="font-size: 0.75rem; color: #555;">${f.ext}</div>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-family: var(--font-mono); font-weight: 800; font-size: 0.85rem;">${f.size}</div>
            <span class="brutal-tag" style="background: ${isSelected ? "var(--coral)" : "#eee"}; color: ${isSelected ? "#fff" : "#111"}; font-size: 0.65rem; padding: 0.15rem 0.4rem;">
              ${f.badge}
            </span>
          </div>
        </div>
      `;
    });

    metaContainer.innerHTML = `
      <div class="sim-layout" style="display: grid; grid-template-columns: 1fr 1.3fr; gap: 1.25rem; align-items: start;">
        <div>
          <div style="position: relative; border: 3px solid var(--black); box-shadow: 4px 4px 0 0 var(--black); overflow: hidden; background: #000; aspect-ratio: 16/9;">
            <img src="${v.thumbnail}" alt="${v.title}" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.9;">
            <span style="position: absolute; bottom: 8px; right: 8px; background: #000; color: #fff; font-family: var(--font-mono); font-size: 0.75rem; font-weight: 700; padding: 2px 6px; border: 2px solid #fff;">
              ${v.duration}
            </span>
            <span style="position: absolute; top: 8px; left: 8px; background: ${platformBadgeColor}; color: #fff; font-family: var(--font-display); font-size: 0.7rem; font-weight: 800; padding: 3px 8px; border: 2px solid #000; text-transform: uppercase;">
              ${platformBadgeText}
            </span>
          </div>
          <div style="margin-top: 0.8rem; font-family: var(--font-display); font-size: 0.95rem; line-height: 1.35;">
            ${v.title}
          </div>
          <div style="margin-top: 0.4rem; font-size: 0.8rem; color: #555; font-weight: 600;">
            ${v.uploader} • ${v.views}
          </div>
        </div>

        <div>
          <div style="font-family: var(--font-display); font-size: 0.85rem; text-transform: uppercase; margin-bottom: 0.6rem; letter-spacing: 0.05em;">
            Select Format / Resolution:
          </div>
          <div id="sim-formats-list">
            ${formatsHtml}
          </div>
          <div style="display: flex; gap: 0.6rem; margin-top: 1rem;">
            <button id="sim-download-now" class="brutal-btn brutal-btn-primary" style="flex: 1; padding: 0.7rem;">
              DOWNLOAD NOW
            </button>
            <button id="sim-add-queue" class="brutal-btn brutal-btn-white" style="padding: 0.7rem;">
              + QUEUE
            </button>
          </div>
        </div>
      </div>
    `;

    // Bind format selection clicks
    metaContainer.querySelectorAll(".sim-format-opt").forEach((opt) => {
      opt.addEventListener("click", () => {
        this.selectedFormatId = (opt as HTMLElement).dataset.formatId || "";
        this.renderHome();
      });
    });

    document.getElementById("sim-download-now")?.addEventListener("click", () => this.startDownload());
    document.getElementById("sim-add-queue")?.addEventListener("click", () => {
      this.startDownload();
      this.showToast("Added to OmniDL Queue!");
    });
  }

  private renderQueue() {
    const queueList = document.getElementById("sim-queue-list");
    if (!queueList) return;

    if (this.queueJobs.length === 0) {
      queueList.innerHTML = `
        <div style="padding: 3rem 1rem; text-align: center; color: #666; font-weight: 700;">
          <div style="font-family: var(--font-display); font-size: 1.5rem; margin-bottom: 0.5rem;">[ QUEUE EMPTY ]</div>
          FETCH A VIDEO ON HOME AND CLICK DOWNLOAD!
        </div>
      `;
      return;
    }

    let html = "";
    this.queueJobs.forEach((job) => {
      const isDone = job.status === "completed";
      html += `
        <div style="border: 3px solid var(--black); background: #ffffff; padding: 1rem; margin-bottom: 0.8rem; box-shadow: 4px 4px 0 0 var(--black);">
          <div style="display: flex; justify-content: space-between; align-items: start; gap: 1rem; margin-bottom: 0.5rem;">
            <div>
              <div style="font-family: var(--font-display); font-size: 0.9rem; line-height: 1.3;">${job.title}</div>
              <div style="font-size: 0.75rem; color: #666; font-weight: 600; margin-top: 0.2rem;">${job.format}</div>
            </div>
            <span class="brutal-tag" style="background: ${isDone ? "var(--green)" : "var(--yellow)"};">
              ${isDone ? "COMPLETED" : "DOWNLOADING"}
            </span>
          </div>

          <div class="sim-progress-bar" style="margin: 0.6rem 0;">
            <div class="sim-progress-fill" style="width: ${job.progress}%;"></div>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 0.75rem; font-family: var(--font-mono); font-weight: 700;">
            <span>${job.progress}% • Speed: ${job.speed}</span>
            <span>ETA: ${job.eta}</span>
          </div>
        </div>
      `;
    });

    queueList.innerHTML = html;
  }
}
