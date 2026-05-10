document.addEventListener("DOMContentLoaded", function () {
  const fallbackPoster = "../assets/img/favicon.png";

  function assetPath(path) {
    if (!path) return fallbackPoster;
    if (/^(https?:)?\/\//.test(path) || path.startsWith("../")) return path;
    return `../${path}`;
  }

  function guardImage(img, fallback = "../assets/movies/Posters/Interstellar.jpg") {
    if (!img) return;
    img.onerror = () => {
      img.onerror = null;
      img.src = fallback;
    };
  }

  function getYear(movie) {
    return Number(movie.year || movie.release_year || 0);
  }

  function getRating(movie) {
    return Number(movie.rating || movie.imdb_rating || 0);
  }

  function getGenres(movie) {
    if (Array.isArray(movie.genre)) return movie.genre;
    return String(movie.genre || "").split(",").map(g => g.trim()).filter(Boolean);
  }

  function getGradientColors(gradient) {
    const fallback = ["rgba(0,0,0,0.92)", "rgba(0,0,0,0.38)"];
    if (Array.isArray(gradient) && gradient.length >= 2) return gradient;
    if (typeof gradient !== "string" || !gradient.trim()) return fallback;
    try {
      const parsed = JSON.parse(gradient);
      if (Array.isArray(parsed) && parsed.length >= 2) return parsed;
    } catch (err) {}
    const colors = gradient.replace(/linear-gradient\([^,]+,/i, "")
      .replace(/linear-gradient\(/i, "")
      .replace(/\)$/i, "")
      .replace(/["'\[\]]/g, "")
      .split(",")
      .map(color => color.trim())
      .filter(Boolean);
    return colors.length >= 2 ? colors.slice(0, 2) : fallback;
  }

  function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 1800);
  }

  function getSaved() {
    return JSON.parse(localStorage.getItem("movieDekhoWatchlist")) || [];
  }

  function setSaved(ids) {
    localStorage.setItem("movieDekhoWatchlist", JSON.stringify(ids));
  }

  async function syncServerWatchlist() {
    try {
      const data = await fetch("../api.php?action=watchlist_get").then(res => res.json());
      if (data.success && Array.isArray(data.watchlist)) {
        setSaved(data.watchlist.map(Number));
      }
    } catch (err) {}
  }

  function getLiked() {
    return JSON.parse(localStorage.getItem("movieDekhoLiked")) || [];
  }

  function setLiked(ids) {
    localStorage.setItem("movieDekhoLiked", JSON.stringify(ids));
  }

  function skeletonRows() {
    document.querySelectorAll(".movie-row").forEach(row => {
      row.innerHTML = Array.from({ length: 8 }, () => '<div class="skeleton"></div>').join("");
    });
  }

  skeletonRows();
  const watchlistReady = syncServerWatchlist();

  fetch("../api.php?action=search&q=&type=all")
    .then(res => res.json())
    .then(res => {
      if (!res.success) throw new Error("API response failed");
      const movies = [...(res.results.movies || []), ...(res.results.series || [])];
      watchlistReady.finally(() => renderHome(movies));
    })
    .catch(() => {
      fetch("../data/movie.json")
        .then(res => res.json())
        .then(movies => watchlistReady.finally(() => renderHome(movies)))
        .catch(err => console.error("Home data error:", err));
    });

  function createCard(movie, options = {}) {
    const template = document.getElementById("movie-card-template");
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector(".stream-card");
    const save = clone.querySelector(".save-btn");
    const movieId = Number(movie.id);
    const genres = getGenres(movie);
    const saved = getSaved();
    const liked = getLiked();

    const posterImg = clone.querySelector(".poster");
    posterImg.src = assetPath(movie.poster || movie.poster_url || movie.thumbnail_url);
    posterImg.alt = movie.title || "";
    guardImage(posterImg);
    clone.querySelector(".title").textContent = movie.title || "Untitled";
    clone.querySelector(".meta").textContent = `${getYear(movie) || "N/A"} - ${genres.slice(0, 2).join(", ") || movie.type || "Movie"} - ${getRating(movie) || "N/A"}/10`;
    clone.querySelector(".quality-badge").textContent = movie.quality || options.badge || "HD";
    save.textContent = saved.includes(movieId) ? "✓" : "＋";
    save.classList.toggle("saved", saved.includes(movieId));

    save.onclick = event => {
      event.stopPropagation();
      const current = getSaved();
      const next = current.includes(movieId) ? current.filter(id => id !== movieId) : [...current, movieId];
      setSaved(next);
      save.textContent = next.includes(movieId) ? "✓" : "＋";
      save.classList.toggle("saved", next.includes(movieId));
      showToast(next.includes(movieId) ? "Saved to My List" : "Removed from My List");
      fetch("../api.php?action=watchlist_toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movie_id: movieId })
      }).catch(() => {});
    };

    const likeButton = clone.querySelector(".like-btn");
    likeButton.textContent = liked.includes(movieId) ? "Liked" : "Like";
    likeButton.classList.toggle("liked", liked.includes(movieId));

    likeButton.onclick = event => {
      event.stopPropagation();
      const current = getLiked();
      const next = current.includes(movieId) ? current.filter(id => id !== movieId) : [...current, movieId];
      setLiked(next);
      likeButton.textContent = next.includes(movieId) ? "Liked" : "Like";
      likeButton.classList.toggle("liked", next.includes(movieId));
      showToast(next.includes(movieId) ? "Marked as liked" : "Removed like");
    };

    clone.querySelector(".play-btn").onclick = event => {
      event.stopPropagation();
      location.href = `../pages/movie.html?id=${movie.id}`;
    };

    card.onclick = () => {
      location.href = `../pages/movie.html?id=${movie.id}`;
    };

    return clone;
  }

  function renderRow(id, list, options = {}) {
    const row = document.getElementById(id);
    if (!row) return;
    row.innerHTML = "";
    list.forEach(movie => row.appendChild(createCard(movie, options)));
  }

  function renderHome(movies) {
    const byRating = [...movies].sort((a, b) => getRating(b) - getRating(a));
    const byYear = [...movies].sort((a, b) => getYear(b) - getYear(a));
    const trending = [...movies].sort((a, b) =>
      ((Number(b.trending_score) || 0) + getRating(b) * 8 + (Number(b.views) || 0) / 10000) -
      ((Number(a.trending_score) || 0) + getRating(a) * 8 + (Number(a.views) || 0) / 10000)
    );
    const moviesOnly = movies.filter(m => (m.type || "").toLowerCase() === "movie");
    const recommended = [...movies].sort((a, b) =>
      (Number(b.recommended) || getRating(b)) - (Number(a.recommended) || getRating(a))
    );

    renderHero(byRating.slice(0, 8));
    renderStats(movies);
    renderRow("trendingRow", trending.slice(0, 12), { badge: "Hot" });
    renderRow("popularRow", moviesOnly.slice(0, 12), { badge: "4K" });
    renderRow("topRatedRow", byRating.slice(0, 12), { badge: "Top" });
    renderRow("latestRow", byYear.slice(0, 12), { badge: "New" });
    renderRow("recommendedRow", recommended.slice(0, 12), { badge: "For You" });
    renderRow("weekRow", trending.slice(4, 16), { badge: "Week" });
    renderRow("watchedRow", [...movies].sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0)).slice(0, 12), { badge: "Watched" });
    renderRow("editorsRow", byRating.filter(m => getGenres(m).some(g => ["Drama", "Biography", "Mystery", "War"].includes(g))).slice(0, 12), { badge: "Editor" });
    renderRow("awardsRow", byRating.filter(m => getRating(m) >= 8.5).slice(0, 12), { badge: "Award" });
    renderGenres(movies);
    renderCollections(movies);
    renderPlatforms(movies);
    renderContinue(movies);
    renderCountdown(byYear[0] || byRating[0]);
    renderTopPicks(byRating.slice(0, 10));
    bindMood(movies);
  }

  function renderHero(heroMix) {
    const heroCard = document.getElementById("heroCard");
    const heroTitle = document.getElementById("heroTitle");
    const heroInfo = document.getElementById("heroInfo");
    const heroDesc = document.getElementById("heroDesc");
    const heroSection = document.querySelector(".hero-section");
    const detailsBtn = document.querySelector(".details-btn");
    const reviewBtn = document.querySelector(".review-btn");
    let index = 0;

    function updateHero() {
      const movie = heroMix[index];
      if (!movie) return;
      const genres = getGenres(movie);
      const [c1, c2] = getGradientColors(movie.gradient || movie.gradient_color);
      heroTitle.textContent = movie.title;
      heroInfo.textContent = `${movie.type || "movie"} - ${getYear(movie) || "N/A"} - ${genres.join(", ")}`;
      heroDesc.textContent = movie.description || movie.storyline || "";
      heroCard.style.background = `url(${assetPath(movie.backdrop || movie.backdrop_url)}) no-repeat center/cover`;
      heroCard.style.setProperty("--hero-c1", c1);
      heroCard.style.setProperty("--hero-c2", c2);
      heroSection.style.background = `linear-gradient(to bottom, ${c1}, ${c2})`;
      detailsBtn.onclick = () => location.href = `../pages/movie.html?id=${movie.id}`;
      reviewBtn.onclick = () => location.href = `../pages/movie.html?id=${movie.id}#reviews`;
      index = (index + 1) % heroMix.length;
    }

    updateHero();
    setInterval(updateHero, 5200);
  }

  function renderStats(movies) {
    const genres = new Set(movies.flatMap(getGenres));
    const stats = [
      [movies.length, "Titles ready to discover"],
      [genres.size, "Genres covered"],
      [movies.filter(m => getRating(m) >= 8).length, "Highly rated picks"],
      [movies.filter(m => (m.type || "").toLowerCase() === "series").length, "Series in rotation"]
    ];
    document.getElementById("statsStrip").innerHTML = stats.map(([value, label]) => `
      <div class="stat-card"><strong data-count="${value}">0</strong><span>${label}</span></div>
    `).join("");
    animateCounters();
  }

  function renderGenres(movies) {
    const grid = document.getElementById("genreGrid");
    const template = document.getElementById("genre-template");
    const map = {};
    movies.forEach(movie => getGenres(movie).forEach(genre => map[genre] = (map[genre] || 0) + 1));
    grid.innerHTML = "";
    Object.entries(map).sort((a, b) => b[1] - a[1]).forEach(([genre, count]) => {
      const clone = template.content.cloneNode(true);
      clone.querySelector(".genre-name").textContent = genre;
      clone.querySelector(".genre-count").textContent = `${count} titles`;
      clone.querySelector(".genre-tile").onclick = () => location.href = `../pages/movies.html?genre=${encodeURIComponent(genre)}`;
      grid.appendChild(clone);
    });
  }

  function renderCollections(movies) {
    const grid = document.getElementById("collectionsGrid");
    const collections = [
      ["Midnight Thrills", "Thriller, Horror, Mystery"],
      ["Family Watch Night", "Family, Comedy, Adventure"],
      ["Sci-Fi Worlds", "Sci-Fi, Fantasy, Anime"],
      ["Award Season", "Drama, Biography, War"]
    ];
    grid.innerHTML = collections.map(([title, subtitle], index) => {
      const movie = movies[index * 2] || movies[0] || {};
      const href = `../pages/movies.html?genre=${encodeURIComponent(subtitle.split(",")[0])}`;
      return `<a class="collection-card" href="${href}" style="background-image:url('${assetPath(movie.backdrop || movie.backdrop_url || movie.poster)}')">
        <div><h3>${title}</h3><p>${subtitle}</p></div>
      </a>`;
    }).join("");
  }

  function renderPlatforms(movies) {
    const platforms = ["Netflix", "Prime Video", "Disney+", "HBO Max", "Apple TV+", "Crunchyroll"];
    const box = document.getElementById("platformGrid");
    box.innerHTML = platforms.map((platform, index) => {
      const count = movies.filter(m => (m.streaming_platform || "").includes(platform)).length || Math.max(3, movies.length - index * 2);
      return `<div class="platform-pill">${platform}<br><small>${count} titles</small></div>`;
    }).join("");
  }

  function renderContinue(movies) {
    const box = document.getElementById("continueList");
    box.innerHTML = movies.slice(0, 3).map((movie, index) => {
      const progress = [68, 42, 84][index];
      return `<button class="continue-item" type="button" data-id="${movie.id}">
        <img src="${assetPath(movie.backdrop || movie.backdrop_url || movie.poster)}" alt="">
        <div><strong>${movie.title}</strong><p class="meta">IMDb ${getRating(movie) || "N/A"} - ${getGenres(movie).slice(0, 2).join(", ") || "Featured pick"}</p></div>
      </button>`;
    }).join("");
    box.querySelectorAll(".continue-item").forEach(item => {
      item.addEventListener("click", () => location.href = `../pages/movie.html?id=${item.dataset.id}`);
    });
  }

  function renderCountdown(movie) {
    const box = document.getElementById("countdownBox");
    const upcoming = [
      { title: "The Mandalorian and Grogu", date: "2026-05-22" },
      { title: "Masters of the Universe", date: "2026-06-05" },
      { title: "Toy Story 5", date: "2026-06-19" },
      { title: "Supergirl", date: "2026-06-26" }
    ].map(item => ({ ...item, target: new Date(`${item.date}T00:00:00`) }))
      .filter(item => item.target > new Date())
      .sort((a, b) => a.target - b.target);
    const next = upcoming[0] || { title: "Next major release", target: new Date(Date.now() + 86400000) };

    function tick() {
      const diff = Math.max(0, next.target - new Date());
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      box.innerHTML = `<p class="countdown-title">${next.title}</p>
        <div class="countdown-card">
          <div><strong>${days}</strong><span>Days</span></div>
          <div><strong>${hours}</strong><span>Hours</span></div>
          <div><strong>${mins}</strong><span>Min</span></div>
        </div>
        <div class="upcoming-stack">
          ${upcoming.slice(1, 4).map(item => `<button type="button">${item.title}<small>${item.target.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</small></button>`).join("")}
        </div>`;
    }

    tick();
    setInterval(tick, 60000);
  }

  function renderTopPicks(list) {
    document.getElementById("imdbRow").innerHTML = list.map((movie, index) => `
      <button class="top-pick" type="button" data-id="${movie.id}"><strong>${index + 1}</strong><span>${movie.title}</span></button>
    `).join("");
    document.querySelectorAll("#imdbRow .top-pick").forEach(item => {
      item.addEventListener("click", () => location.href = `../pages/movie.html?id=${item.dataset.id}`);
    });
  }

  function bindMood(movies) {
    document.querySelectorAll("[data-mood]").forEach(button => {
      button.addEventListener("click", () => {
        const mood = button.dataset.mood;
        const list = movies.filter(movie => getGenres(movie).includes(mood));
        renderRow("recommendedRow", (list.length ? list : movies).slice(0, 12), { badge: mood });
        showToast(`${mood} mood applied`);
        document.getElementById("recommendedRow").scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  }

  function animateCounters() {
    document.querySelectorAll("[data-count]").forEach(el => {
      const target = Number(el.dataset.count);
      let current = 0;
      const timer = setInterval(() => {
        current += Math.max(1, Math.ceil(target / 24));
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        el.textContent = current.toLocaleString();
      }, 28);
    });
  }

  function loadActresses() {
    fetch("../api.php?action=search&q=&type=actress")
      .then(res => res.json())
      .then(res => {
        const actresses = res.results?.actresses || [];
        const actorRow = document.querySelector(".celebs-row");
        const template = document.getElementById("celeb-template");
        if (!actorRow || !template) return;
        actorRow.innerHTML = "";
        actresses.slice(0, 10).forEach((actor, i) => {
          const clone = template.content.cloneNode(true);
          clone.querySelector(".celeb-img").src = assetPath(actor.img);
          clone.querySelector(".celeb-img").alt = actor.name;
          clone.querySelector(".celeb-name").textContent = actor.name;
          clone.querySelector(".rank").textContent = `#${i + 1}`;
          actorRow.appendChild(clone);
        });
      })
      .catch(err => console.error("Actor spotlight load failed:", err));
  }

  loadActresses();

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add("visible");
    });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach(el => observer.observe(el));

  window.addEventListener("scroll", () => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    const progress = total > 0 ? (window.scrollY / total) * 100 : 0;
    document.getElementById("scrollProgress").style.width = `${progress}%`;
  }, { passive: true });

  // TODO: Newsletter handler disabled - requires SMTP/email backend.
  // This was localStorage-only and emails were never sent.
  // To re-enable when SMTP is configured:
  // 1. Uncomment the code below
  // 2. Set up email service
  // 3. Add server-side subscription persistence
  /*
  document.getElementById("newsletterForm")?.addEventListener("submit", function (event) {
    event.preventDefault();
    const email = this.querySelector("input[type='email']").value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast("Enter a valid email address.");
      return;
    }
    const list = JSON.parse(localStorage.getItem("movieDekhoNewsletter")) || [];
    if (!list.includes(email)) list.push(email);
    localStorage.setItem("movieDekhoNewsletter", JSON.stringify(list));
    showToast("Newsletter saved. You are on the watch drop list.");
    this.classList.add("subscribed");
    this.querySelector("button").textContent = "Saved";
    this.reset();
  });
  */
});
