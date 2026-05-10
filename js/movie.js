document.addEventListener("DOMContentLoaded", async () => {
  const id = new URLSearchParams(location.search).get("id");
  const fallbackPoster = "../assets/movies/Posters/Interstellar.jpg";
  const fallbackBackdrop = "../assets/movies/Backdrop/Interstellarbd.jpg";
  let allTitles = [];

  function assetPath(path) {
    if (!path) return "../assets/img/favicon.png";
    if (/^(https?:)?\/\//.test(path) || path.startsWith("../") || path.startsWith("data:")) return path;
    return `../${path}`;
  }

  function guardImage(img, fallback = "../assets/img/favicon.png") {
    if (!img) return;
    img.onerror = () => {
      img.onerror = null;
      img.src = fallback;
    };
  }

  function list(value) {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch (err) {}
    return String(value).split(",").map(item => item.trim()).filter(Boolean);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function youtubeVideoIdFromUrl(url) {
    const s = String(url || "").trim();
    if (!s) return "";
    let m = s.match(/^https?:\/\/(www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})(\?|$|\/)/i);
    if (m) return m[2];
    m = s.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (m) return m[1];
    m = s.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i);
    if (m) return m[1];
    return "";
  }

  function youtubeUrlToEmbed(url) {
    const id = youtubeVideoIdFromUrl(url);
    return id ? `https://www.youtube.com/embed/${id}` : "";
  }

  /** Prefer trailer_url, then legacy trailer, then teaser_url; only valid YouTube → embed URL. */
  function resolveTrailerEmbed(item) {
    if (!item) return "";
    const candidates = [item.trailer_url, item.trailer, item.teaser_url];
    for (const u of candidates) {
      const embed = youtubeUrlToEmbed(u);
      if (embed) return embed;
    }
    return "";
  }

  function showToast(message) {
    let toast = document.getElementById("toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "toast";
      toast.className = "toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 1900);
  }

  async function loadAllTitles() {
    try {
      const apiData = await fetch("../api.php?action=search&q=&type=all").then(res => res.json());
      if (apiData.success) {
        allTitles = [...(apiData.results.movies || []), ...(apiData.results.series || [])];
      }
    } catch (err) {}

    if (!allTitles.length) {
      allTitles = await fetch("../data/movie.json").then(res => res.json()).catch(() => []);
    }
  }

  async function loadMovie() {
    try {
      const data = await fetch(`../api.php?action=movie_get&id=${encodeURIComponent(id)}`).then(res => res.json());
      if (data.success) return data.movie;
    } catch (err) {}
    return allTitles.find(item => String(item.id) === String(id));
  }

  async function enrichMovieFromTmdb(item) {
    if (!item || String(item.type || "").toLowerCase() === "series") return item;
    try {
      const search = await fetch(`../api.php?action=tmdb_movie_lookup&q=${encodeURIComponent(item.title || "")}`).then(res => res.json());
      if (!search.success || !search.results?.length) return item;
      const wantedYear = String(item.release_year || item.year || "");
      const match = search.results.find(result => !wantedYear || String(result.release_date || "").startsWith(wantedYear)) || search.results[0];
      const detail = await fetch(`../api.php?action=tmdb_movie_details&id=${match.id}`).then(res => res.json());
      if (!detail.success) return item;

      const trailer = (detail.videos?.results || []).find(video => video.site === "YouTube" && (video.type === "Trailer" || video.type === "Teaser"));
      return {
        ...item,
        poster: detail.poster_path ? `https://image.tmdb.org/t/p/w500${detail.poster_path}` : item.poster,
        poster_url: detail.poster_path ? `https://image.tmdb.org/t/p/w500${detail.poster_path}` : item.poster_url,
        backdrop: detail.backdrop_path ? `https://image.tmdb.org/t/p/original${detail.backdrop_path}` : item.backdrop,
        backdrop_url: detail.backdrop_path ? `https://image.tmdb.org/t/p/original${detail.backdrop_path}` : item.backdrop_url,
        thumbnail_url: detail.backdrop_path ? `https://image.tmdb.org/t/p/w780${detail.backdrop_path}` : item.thumbnail_url,
        gallery_images: (detail.images?.backdrops || []).slice(0, 6).map(image => `https://image.tmdb.org/t/p/w780${image.file_path}`),
        trailer_url: trailer ? `https://www.youtube.com/embed/${trailer.key}` : item.trailer_url,
        imdb_rating: detail.vote_average ? Number(detail.vote_average).toFixed(1) : item.imdb_rating,
        rating: detail.vote_average ? Number(detail.vote_average).toFixed(1) : item.rating,
        description: detail.overview || item.description,
        storyline: detail.overview || item.storyline,
        release_date: detail.release_date || item.release_date,
        release_year: detail.release_date ? detail.release_date.slice(0, 4) : item.release_year,
        duration: detail.runtime ? `${detail.runtime} min` : item.duration,
        tmdb_id: detail.id
      };
    } catch (err) {
      return item;
    }
  }

  await loadAllTitles();
  let movie = await loadMovie();

  if (!movie) {
    document.getElementById("t").textContent = "Title not found";
    document.getElementById("i").textContent = "Choose a title from Movies or Shows.";
    document.getElementById("d").textContent = "This item is not available in the current catalog.";
    return;
  }

  movie = await enrichMovieFromTmdb(movie);

  const genres = list(movie.genre);
  const poster = movie.poster || movie.poster_url || movie.thumbnail_url || fallbackPoster;
  const backdrop = movie.backdrop || movie.backdrop_url || poster || fallbackBackdrop;
  const trailer = resolveTrailerEmbed(movie);
  const rating = movie.imdb_rating || movie.rating || "N/A";
  const year = movie.release_year || movie.year || "N/A";
  const isSeries = String(movie.type || "").toLowerCase() === "series";

  document.title = `${movie.title} - MoviesDekho`;
  document.getElementById("hero").style.background = `url(${assetPath(backdrop)}) center/cover`;
  document.getElementById("poster").src = assetPath(poster);
  guardImage(document.getElementById("poster"), fallbackPoster);
  document.getElementById("typeLabel").textContent = `${movie.type || "movie"} - ${movie.quality || "HD"}`;
  document.getElementById("t").textContent = movie.title;
  document.getElementById("i").textContent = `${year} - ${runtimeFor(movie)} - ${movie.age_rating || "UA"} - IMDb ${rating}`;
  document.getElementById("d").textContent = movie.description || movie.storyline || "";
  document.getElementById("storyline").textContent = movie.storyline || movie.ldescription || movie.description || "";
  document.getElementById("genreTags").innerHTML = genres.map(genre => `<span>${escapeHtml(genre)}</span>`).join("");
  const trailerIframe = document.getElementById("trailer");
  if (trailerIframe) trailerIframe.src = "about:blank";

  renderRatings(movie);
  renderCredits(movie);
  renderAvailability(movie);
  renderCast(movie);
  renderGallery(movie, backdrop, poster);
  renderProduction(movie);
  renderTimeline(movie);
  renderSeriesSection(movie, poster, backdrop);
  renderRelated(movie);
  bindTrailer(trailer);
  bindShare(movie);
  bindWatchlist();
  bindReviews();

  function runtimeFor(item) {
    if (String(item.type || "").toLowerCase() === "series") {
      return `${item.seasons || 1} seasons - ${item.episodes || "?"} episodes`;
    }
    return item.duration || "120 min";
  }

  function renderRatings(item) {
    const cards = isSeries
      ? [
          ["IMDb", item.imdb_rating || item.rating || "N/A"],
          ["Seasons", item.seasons || "1"],
          ["Episodes", item.episodes || "N/A"],
          ["Audience", item.rating || item.imdb_rating || "N/A"]
        ]
      : [
          ["IMDb", item.imdb_rating || item.rating || "N/A"],
          ["MovieDekho", item.rating || item.imdb_rating || "N/A"],
          ["Metascore", item.metascore || "N/A"],
          ["Trending", item.trending_score || item.views || "Hot"]
        ];
    document.getElementById("ratingGrid").innerHTML = cards.map(([label, value]) => `
      <div class="rating-card"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>
    `).join("");
  }

  function renderCredits(item) {
    const credits = [
      ["Director", item.director || "Catalog Team"],
      ["Writer", item.writer || "Screenplay Team"],
      ["Producer", item.producer || "MoviesDekho"],
      ["Music", item.music_director || "Original Score"]
    ];
    document.getElementById("credits").innerHTML = credits.map(([label, value]) => `
      <div><small>${label}</small><strong>${escapeHtml(value)}</strong></div>
    `).join("");
  }

  function renderAvailability(item) {
    const platforms = list(item.streaming_platform).length ? list(item.streaming_platform) : ["Catalog info", "Watchlist ready"];
    document.getElementById("availability").innerHTML = platforms.map(platform => `<span class="availability-pill">${escapeHtml(platform)}</span>`).join("");
  }

  function renderCast(item) {
    const row = document.getElementById("castRow");
    const castSection = row?.closest(".section");
    if (!row || !castSection) return;

    const linked = Array.isArray(item.linked_celebrities) ? item.linked_celebrities : [];
    if (!linked.length) {
      castSection.classList.add("hidden-section");
      return;
    }

    castSection.classList.remove("hidden-section");
    row.innerHTML = linked.slice(0, 12).map(person => `
      <a class="cast-card" href="../pages/celebrity.html?id=${Number(person.id)}">
        <img src="${assetPath(person.img)}" alt="${escapeHtml(person.name)}">
        <strong>${escapeHtml(person.name)}</strong>
        ${person.role ? `<span class="cast-role">${escapeHtml(person.role)}</span>` : ""}
      </a>
    `).join("");
    row.querySelectorAll("img").forEach(img => guardImage(img, "../assets/img/user.png"));
  }

  function renderGallery(item, backdropImage, posterImage) {
    const gallery = list(item.gallery_images);
    const images = gallery.length ? gallery : [backdropImage, item.thumbnail_url || posterImage, item.backdrop_url || backdropImage];
    document.getElementById("gallery").innerHTML = images.slice(0, 6).map(image => `<img src="${assetPath(image)}" alt="">`).join("");
    document.querySelectorAll("#gallery img").forEach(img => guardImage(img, fallbackBackdrop));
  }

  function renderProduction(item) {
    const rows = [
      ["Language", item.language || "English"],
      ["Country", item.country || "United States"],
      ["Release Date", item.release_date || year],
      ["Quality", item.quality || "HD"]
    ];
    document.getElementById("productionInfo").innerHTML = rows.map(([label, value]) => `
      <div><small>${label}</small><strong>${escapeHtml(value)}</strong></div>
    `).join("");
  }

  function renderTimeline(item) {
    const rows = [
      ["Community note", `${item.title} is listed for ${genres.slice(0, 2).join(" and ") || "movie discovery"}.`],
      ["Catalog status", trailer ? "Trailer available" : "Trailer not available yet"],
      ["Recommendation", "Similar titles are listed below"]
    ];
    document.getElementById("timeline").innerHTML = rows.map(([label, value]) => `
      <div><strong>${label}</strong><p>${escapeHtml(value)}</p></div>
    `).join("");
  }

  function renderSeriesSection(item, posterImage, backdropImage) {
    const section = document.getElementById("seriesSection");
    const nav = document.getElementById("seasonNav");
    const listBox = document.getElementById("episodeList");
    if (!section || !nav || !listBox) return;

    const seasonCount = isSeries ? Math.max(1, Number(item.seasons) || 1) : 0;
    if (!isSeries) {
      section.classList.add("hidden-section");
      return;
    }

    section.classList.remove("hidden-section");
    const totalEpisodes = Math.max(1, Number(item.episodes) || seasonCount * 8);
    const seasonData = buildSeasonData(seasonCount, totalEpisodes, item, posterImage, backdropImage);
    let activeSeason = seasonData[0]?.season || 1;

    function renderSeasonNav() {
      nav.innerHTML = seasonData.map(entry => `
        <button type="button" class="season-pill ${entry.season === activeSeason ? "active" : ""}" data-season="${entry.season}">
          Season ${entry.season} (${entry.episodes.length})
        </button>
      `).join("");
      nav.querySelectorAll(".season-pill").forEach(button => {
        button.addEventListener("click", () => {
          activeSeason = Number(button.dataset.season);
          renderSeasonNav();
          renderEpisodes();
        });
      });
    }

    function renderEpisodes() {
      const current = seasonData.find(entry => entry.season === activeSeason) || seasonData[0];
      listBox.innerHTML = current.episodes.map(episode => `
        <article class="episode-card">
          <img src="${assetPath(episode.thumbnail)}" alt="${escapeHtml(episode.title)}">
          <div>
            <strong>S${current.season}:E${episode.number} - ${escapeHtml(episode.title)}</strong>
            <small>${escapeHtml(episode.runtime)}</small>
            <p>${escapeHtml(episode.overview)}</p>
          </div>
        </article>
      `).join("");
      listBox.querySelectorAll("img").forEach(img => guardImage(img, fallbackPoster));
    }

    renderSeasonNav();
    renderEpisodes();
  }

  function buildSeasonData(seasonCount, totalEpisodes, item, posterImage, backdropImage) {
    const parsed = parseEpisodesData(item);
    if (parsed.length) return parsed;

    const perSeason = Math.max(1, Math.round(totalEpisodes / seasonCount));
    const runtime = item.duration || "45 min";
    const story = item.storyline || item.description || "Episode details are not available yet.";
    const seasons = [];
    let episodeNumber = 1;

    for (let season = 1; season <= seasonCount; season++) {
      const episodes = [];
      const maxForSeason = season === seasonCount
        ? Math.max(1, totalEpisodes - (perSeason * (seasonCount - 1)))
        : perSeason;
      for (let idx = 1; idx <= maxForSeason; idx++) {
        episodes.push({
          number: idx,
          title: `Episode ${episodeNumber}`,
          thumbnail: backdropImage || posterImage || fallbackPoster,
          runtime,
          overview: story
        });
        episodeNumber += 1;
      }
      seasons.push({ season, episodes });
    }
    return seasons;
  }

  function parseEpisodesData(item) {
    const candidates = [item.episodes_data, item.episode_data, item.season_data];
    for (const raw of candidates) {
      if (!raw) continue;
      try {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (!Array.isArray(parsed)) continue;
        const normalized = parsed
          .map(season => ({
            season: Number(season.season || season.season_number || 0),
            episodes: Array.isArray(season.episodes) ? season.episodes.map((episode, index) => ({
              number: Number(episode.number || episode.episode_number || index + 1),
              title: episode.title || episode.name || `Episode ${index + 1}`,
              thumbnail: episode.thumbnail || episode.image || "",
              runtime: episode.runtime || episode.duration || "45 min",
              overview: episode.overview || episode.description || "Overview unavailable."
            })) : []
          }))
          .filter(season => season.season > 0 && season.episodes.length);
        if (normalized.length) return normalized;
      } catch (err) {}
    }
    return [];
  }

  function renderRelated(item) {
    const rel = document.getElementById("rel");
    const temp = document.getElementById("rel-temp");
    let related = allTitles
      .filter(x => String(x.id) !== String(item.id) && list(x.genre).some(g => genres.includes(g)))
      .slice(0, 12);

    if (!related.length) {
      related = allTitles
        .filter(x => String(x.id) !== String(item.id))
        .sort((a, b) => (Number(b.rating || b.imdb_rating) || 0) - (Number(a.rating || a.imdb_rating) || 0))
        .slice(0, 12);
    }

    rel.innerHTML = "";
    related.forEach(title => {
      const clone = temp.content.cloneNode(true);
      const relatedImg = clone.querySelector("img");
      relatedImg.src = assetPath(title.poster || title.poster_url || title.thumbnail_url);
      guardImage(relatedImg, fallbackPoster);
      clone.querySelector("strong").textContent = title.title;
      clone.querySelector(".mini-card").onclick = () => location.href = `movie.html?id=${title.id}`;
      rel.appendChild(clone);
    });
  }

  function bindTrailer(trailerUrl) {
    const modal = document.getElementById("trailerModal");
    const button = document.getElementById("trailerBtn");
    const frame = document.getElementById("trailer");

    if (!trailerUrl) {
      button.style.display = "none";
      return;
    }

    button.style.display = "";
    button.onclick = () => {
      frame.src = trailerUrl;
      modal.classList.add("open");
    };
    document.getElementById("closeTrailer").onclick = closeTrailer;
    modal.addEventListener("click", event => {
      if (event.target === modal) closeTrailer();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") closeTrailer();
    });

    function closeTrailer() {
      modal.classList.remove("open");
      frame.src = "about:blank";
    }
  }

  function bindShare(item) {
    document.getElementById("shareBtn").onclick = async () => {
      const url = location.href;
      try {
        if (navigator.share) {
          await navigator.share({ title: item.title, text: `Check out ${item.title} on MoviesDekho`, url });
        } else if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(url);
          showToast("Movie link copied.");
        } else {
          prompt("Copy this link", url);
        }
      } catch (err) {
        showToast("Share was cancelled.");
      }
    };
  }

  function bindWatchlist() {
    const button = document.getElementById("watchBtn");
    const key = "movieDekhoWatchlist";
    const movieId = Number(id);
    let ids = JSON.parse(localStorage.getItem(key)) || [];
    button.textContent = ids.includes(movieId) ? "Added to Watchlist" : "Add to Watchlist";

    fetch("../api.php?action=watchlist_get")
      .then(res => res.json())
      .then(res => {
        if (!res.success || !Array.isArray(res.watchlist)) return;
        ids = res.watchlist.map(Number);
        localStorage.setItem(key, JSON.stringify(ids));
        button.textContent = ids.includes(movieId) ? "Added to Watchlist" : "Add to Watchlist";
      })
      .catch(() => {});

    button.onclick = () => {
      const current = JSON.parse(localStorage.getItem(key)) || [];
      const next = current.includes(movieId) ? current.filter(item => item !== movieId) : [...current, movieId];
      localStorage.setItem(key, JSON.stringify(next));
      button.textContent = next.includes(movieId) ? "Added to Watchlist" : "Add to Watchlist";
      showToast(next.includes(movieId) ? "Saved to My List." : "Removed from My List.");
      fetch("../api.php?action=watchlist_toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movie_id: movieId })
      }).catch(() => {});
    };
  }

  function bindReviews() {
    const box = document.getElementById("reviewList");
    const temp = document.getElementById("rev-temp");
    const key = `reviews_${id}`;
    let rate = 0;

    function localReviews() {
      return JSON.parse(localStorage.getItem(key)) || [];
    }

    function renderReviews(reviews) {
      const unique = [];
      const seen = new Set();
      reviews.forEach(review => {
        const signature = `${review.rating}|${String(review.comment || "").trim().toLowerCase()}`;
        if (seen.has(signature)) return;
        seen.add(signature);
        unique.push(review);
      });
      box.innerHTML = "";
      if (!unique.length) {
        box.innerHTML = "<p>No reviews yet. Be the first.</p>";
        return;
      }
      unique.forEach(review => {
        const clone = temp.content.cloneNode(true);
        const node = clone.querySelector("p");
        const rating = Math.max(0, Math.min(5, Number(review.rating) || 0));
        node.className = "review-card";
        node.innerHTML = `
          <span class="review-stars">${"★".repeat(rating)}${"☆".repeat(5 - rating)}</span>
          <span>${escapeHtml(review.comment)}</span>
        `;
        box.appendChild(clone);
      });
    }

    function loadReviews() {
      fetch(`../api.php?action=reviews_get&movie_id=${id}`)
        .then(res => res.json())
        .then(res => {
          const apiReviews = res.success ? res.reviews.map(review => ({
            rating: review.rating,
            comment: `${review.username || "User"}: ${review.comment}`
          })) : [];
          renderReviews([...localReviews(), ...apiReviews]);
        })
        .catch(() => renderReviews(localReviews()));
    }

    const stars = document.getElementById("stars");
    stars.innerHTML = "";
    for (let i = 1; i <= 5; i++) {
      const star = document.createElement("span");
      star.textContent = "\u2605";
      star.onclick = () => {
        rate = i;
        [...stars.children].forEach((node, index) => node.classList.toggle("active", index < i));
      };
      stars.appendChild(star);
    }

    document.getElementById("btn").onclick = () => {
      const comment = document.getElementById("inp").value.trim();
      if (!comment || !rate) {
        showToast("Select stars and write a review first.");
        return;
      }
      const next = [...localReviews(), { movie_id: Number(id), title: movie.title, rating: rate, comment, created_at: new Date().toISOString() }];
      localStorage.setItem(key, JSON.stringify(next));
      document.getElementById("inp").value = "";
      rate = 0;
      [...stars.children].forEach(node => node.classList.remove("active"));
      renderReviews(next);
      showToast("Review added.");

      fetch("../api.php?action=reviews_post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movie_id: Number(id), rating: next.at(-1).rating, comment: next.at(-1).comment })
      }).catch(() => {});
    };

    loadReviews();
  }
});
