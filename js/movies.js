document.addEventListener("DOMContentLoaded", async () => {
  try {
    const data = await fetch("../api.php?action=search&q=&type=movie").then(res => res.json());
    if (!data.success) throw new Error("Movies API failed");

    const movies = data.results.movies || [];
    let activeGenre = new URLSearchParams(location.search).get("genre") || "all";
    let searchTerm = "";
    let sortMode = new URLSearchParams(location.search).get("sort") === "rating" ? "rating-desc" : "rating-desc";

    const els = {
      featured: document.getElementById("featuredRow"),
      top10: document.getElementById("top10Row"),
      trending: document.getElementById("trendingRow"),
      latest: document.getElementById("latestRow"),
      rated: document.getElementById("topRatedRow"),
      categories: document.getElementById("categories"),
      resultCount: document.getElementById("resultCount"),
      search: document.getElementById("movieSearch"),
      genreFilter: document.getElementById("genreFilter"),
      sortFilter: document.getElementById("sortFilter"),
      clear: document.getElementById("clearFilters"),
      filterToggle: document.getElementById("filterToggle"),
      showAll: document.getElementById("showAll"),
      chips: document.getElementById("genreChips"),
      cardTemplate: document.getElementById("moviecard"),
      categoryTemplate: document.getElementById("category")
    };

    function assetPath(path) {
      if (!path) return "../assets/img/favicon.png";
      if (/^(https?:)?\/\//.test(path) || path.startsWith("../")) return path;
      return `../${path}`;
    }

    function genresOf(movie) {
      if (Array.isArray(movie.genre)) return movie.genre;
      return String(movie.genre || "").split(",").map(genre => genre.trim()).filter(Boolean);
    }

    function ratingOf(movie) {
      return Number(movie.rating || movie.imdb_rating || 0);
    }

    function yearOf(movie) {
      return Number(movie.year || movie.release_year || 0);
    }

    function getWatchlist() {
      try {
        return (JSON.parse(localStorage.getItem("movieDekhoWatchlist")) || []).map(Number);
      } catch (err) {
        return [];
      }
    }

    function setWatchlist(ids) {
      localStorage.setItem("movieDekhoWatchlist", JSON.stringify([...new Set(ids.map(Number))]));
    }

    async function syncServerWatchlist() {
      try {
        const data = await fetch("../api.php?action=watchlist_get").then(res => res.json());
        if (data.success && Array.isArray(data.watchlist)) {
          setWatchlist(data.watchlist.map(Number));
        }
      } catch (err) {}
    }

    function updateWatchButton(button, movieId) {
      const saved = getWatchlist().includes(Number(movieId));
      button.textContent = saved ? "Saved" : "+";
      button.title = saved ? "In watchlist" : "Add to watchlist";
      button.classList.toggle("saved", saved);
    }

    function guardImage(img) {
      img.onerror = () => {
        img.onerror = null;
        img.src = "../assets/movies/Posters/Interstellar.jpg";
      };
    }

    function createCard(movie, rank) {
      const clone = els.cardTemplate.content.cloneNode(true);
      const card = clone.querySelector(".movie-card");
      const watchButton = clone.querySelector(".card-watchlist");
      const badge = clone.querySelector(".movie-badge");
      const poster = clone.querySelector(".movie-poster");
      const movieId = Number(movie.id);
      const genres = genresOf(movie);

      poster.src = assetPath(movie.poster || movie.poster_url || movie.thumbnail_url);
      poster.alt = movie.title || "";
      guardImage(poster);

      clone.querySelector(".movie-title").textContent = movie.title || "Untitled";
      clone.querySelector(".movie-meta").textContent = `${yearOf(movie) || "N/A"} - ${movie.type || "Movie"}`;
      clone.querySelector(".movie-rating").textContent = `Rating ${ratingOf(movie) || "N/A"}/10`;
      clone.querySelector(".movie-genre").textContent = genres.join(", ");
      clone.querySelector(".review").textContent = ratingOf(movie) >= 9.5 ? "Fan favorite" : "Popular pick";

      badge.textContent = rank ? `#${rank}` : "Top Pick";
      updateWatchButton(watchButton, movieId);

      watchButton.onclick = event => {
        event.stopPropagation();
        const current = getWatchlist();
        const next = current.includes(movieId) ? current.filter(id => id !== movieId) : [...current, movieId];
        setWatchlist(next);
        updateWatchButton(watchButton, movieId);
        fetch("../api.php?action=watchlist_toggle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ movie_id: movieId })
        }).catch(() => {});
      };

      card.onclick = () => {
        location.href = `../pages/movie.html?id=${movieId}`;
      };

      return clone;
    }

    function sortItems(list) {
      const sorted = [...list];
      if (sortMode === "year-desc") return sorted.sort((a, b) => yearOf(b) - yearOf(a));
      if (sortMode === "title-asc") return sorted.sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
      if (sortMode === "rating-asc") return sorted.sort((a, b) => ratingOf(a) - ratingOf(b));
      return sorted.sort((a, b) => ratingOf(b) - ratingOf(a));
    }

    function filteredMovies() {
      const query = searchTerm.toLowerCase();
      return sortItems(movies.filter(movie => {
        const genres = genresOf(movie);
        const matchesGenre = activeGenre === "all" || genres.includes(activeGenre);
        const text = `${movie.title || ""} ${genres.join(" ")}`.toLowerCase();
        return matchesGenre && (!query || text.includes(query));
      }));
    }

    function renderList(container, list, ranked = false) {
      if (!container) return;
      container.innerHTML = "";
      list.forEach((movie, index) => container.appendChild(createCard(movie, ranked ? index + 1 : null)));
    }

    function renderGenres() {
      const genres = [...new Set(movies.flatMap(genresOf))].sort();
      els.genreFilter.innerHTML = '<option value="all">All Genres</option>';
      els.chips.innerHTML = "";

      genres.forEach(genre => {
        const option = document.createElement("option");
        option.value = genre;
        option.textContent = genre;
        els.genreFilter.appendChild(option);

        const chip = document.createElement("button");
        chip.type = "button";
        chip.textContent = genre;
        chip.className = "genre-chip";
        chip.onclick = () => {
          activeGenre = activeGenre === genre ? "all" : genre;
          els.genreFilter.value = activeGenre;
          renderPage();
        };
        els.chips.appendChild(chip);
      });
      els.genreFilter.value = genres.includes(activeGenre) ? activeGenre : "all";
      if (els.genreFilter.value === "all") activeGenre = "all";
    }

    function renderCategories(list) {
      els.categories.innerHTML = "";
      const map = {};
      list.forEach(movie => genresOf(movie).forEach(genre => {
        if (!map[genre]) map[genre] = [];
        map[genre].push(movie);
      }));

      Object.keys(map).sort().forEach(genre => {
        const clone = els.categoryTemplate.content.cloneNode(true);
        clone.querySelector(".category-title").textContent = genre;
        const row = clone.querySelector(".category-row");
        map[genre].slice(0, 10).forEach(movie => row.appendChild(createCard(movie)));
        els.categories.appendChild(clone);
      });
    }

    function renderPage() {
      const filtered = filteredMovies();
      const topRated = [...filtered].sort((a, b) => ratingOf(b) - ratingOf(a));
      const latest = [...filtered].sort((a, b) => yearOf(b) - yearOf(a));
      const trending = [...filtered].sort((a, b) => ((ratingOf(b) * 10) + yearOf(b) / 1000) - ((ratingOf(a) * 10) + yearOf(a) / 1000));

      els.resultCount.textContent = `${filtered.length} movies found`;
      document.querySelectorAll(".genre-chip").forEach(chip => chip.classList.toggle("active", chip.textContent === activeGenre));

      renderList(els.featured, topRated.slice(0, 6));
      renderList(els.top10, topRated.slice(0, 10), true);
      renderList(els.trending, trending.slice(0, 10));
      renderList(els.latest, latest.slice(0, 10));
      renderList(els.rated, topRated.slice(0, 10));
      renderCategories(filtered);
    }

    await syncServerWatchlist();
    renderGenres();
    renderPage();

    els.search.addEventListener("input", event => {
      searchTerm = event.target.value.trim();
      renderPage();
    });

    els.genreFilter.addEventListener("change", event => {
      activeGenre = event.target.value;
      renderPage();
    });

    els.sortFilter.addEventListener("change", event => {
      sortMode = event.target.value;
      renderPage();
    });

    els.clear.addEventListener("click", () => {
      activeGenre = "all";
      searchTerm = "";
      sortMode = "rating-desc";
      els.search.value = "";
      els.genreFilter.value = "all";
      els.sortFilter.value = "rating-desc";
      renderPage();
    });

    els.filterToggle?.addEventListener("click", () => {
      document.querySelector(".movie-tools")?.classList.toggle("filters-open");
    });

    els.showAll?.addEventListener("click", () => {
      activeGenre = "all";
      searchTerm = "";
      sortMode = "rating-desc";
      els.search.value = "";
      els.genreFilter.value = "all";
      els.sortFilter.value = "rating-desc";
      renderPage();
      document.querySelector(".movie-tools")?.classList.add("filters-open");
    });
  } catch (err) {
    console.error("Movies page error:", err);
  }
});
