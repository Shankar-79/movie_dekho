document.addEventListener("DOMContentLoaded", async () => {
  try {
    const data = await fetch("../api.php?action=search&q=&type=series").then(res => res.json());
    if (!data.success) throw new Error("Shows API failed");

    const shows = data.results.series || [];
    let activeGenre = new URLSearchParams(location.search).get("genre") || "all";
    let searchTerm = "";
    let sortMode = "rating-desc";

    const els = {
      featured: document.getElementById("featured"),
      top: document.getElementById("top"),
      trend: document.getElementById("trend"),
      latest: document.getElementById("latest"),
      rated: document.getElementById("rated"),
      cat: document.getElementById("cat"),
      resultCount: document.getElementById("resultCount"),
      search: document.getElementById("showSearch"),
      genreFilter: document.getElementById("genreFilter"),
      sortFilter: document.getElementById("sortFilter"),
      clear: document.getElementById("clearFilters"),
      filterToggle: document.getElementById("filterToggle"),
      showAll: document.getElementById("showAll"),
      chips: document.getElementById("genreChips"),
      cardTemplate: document.getElementById("card"),
      categoryTemplate: document.getElementById("category")
    };

    function assetPath(path) {
      if (!path) return "../assets/img/favicon.png";
      if (/^(https?:)?\/\//.test(path) || path.startsWith("../")) return path;
      return `../${path}`;
    }

    function genresOf(show) {
      if (Array.isArray(show.genre)) return show.genre;
      return String(show.genre || "").split(",").map(genre => genre.trim()).filter(Boolean);
    }

    function ratingOf(show) {
      return Number(show.rating || show.imdb_rating || 0);
    }

    function yearOf(show) {
      return Number(show.year || show.release_year || 0);
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

    function updateWatchButton(button, showId) {
      const saved = getWatchlist().includes(Number(showId));
      button.textContent = saved ? "Saved" : "+";
      button.title = saved ? "In watchlist" : "Add to watchlist";
      button.classList.toggle("saved", saved);
    }

    function guardImage(img) {
      img.onerror = () => {
        img.onerror = null;
        img.src = "../assets/Series/Posters/Breaking_Bad.jpg";
      };
    }

    function createCard(show, rank) {
      const clone = els.cardTemplate.content.cloneNode(true);
      const card = clone.querySelector(".movie-card");
      const watchButton = clone.querySelector(".card-watchlist");
      const badge = clone.querySelector(".movie-badge");
      const poster = clone.querySelector(".poster");
      const showId = Number(show.id);
      const genres = genresOf(show);

      poster.src = assetPath(show.poster || show.poster_url || show.thumbnail_url);
      poster.alt = show.title || "";
      guardImage(poster);

      clone.querySelector(".title").textContent = show.title || "Untitled";
      clone.querySelector(".meta").textContent = `${yearOf(show) || "N/A"} - series`;
      clone.querySelector(".rating").textContent = `Rating ${ratingOf(show) || "N/A"}/10`;
      clone.querySelector(".genre").textContent = genres.join(", ");
      clone.querySelector(".review").textContent = ratingOf(show) >= 9.5 ? "Must watch" : "Popular show";

      badge.textContent = rank ? `#${rank}` : "Top Pick";
      updateWatchButton(watchButton, showId);

      watchButton.onclick = event => {
        event.stopPropagation();
        const current = getWatchlist();
        const next = current.includes(showId) ? current.filter(id => id !== showId) : [...current, showId];
        setWatchlist(next);
        updateWatchButton(watchButton, showId);
        fetch("../api.php?action=watchlist_toggle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ movie_id: showId })
        }).catch(() => {});
      };

      card.onclick = () => {
        location.href = `../pages/movie.html?id=${showId}`;
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

    function filteredShows() {
      const query = searchTerm.toLowerCase();
      return sortItems(shows.filter(show => {
        const genres = genresOf(show);
        const matchesGenre = activeGenre === "all" || genres.includes(activeGenre);
        const text = `${show.title || ""} ${genres.join(" ")}`.toLowerCase();
        return matchesGenre && (!query || text.includes(query));
      }));
    }

    function renderList(container, list, ranked = false) {
      if (!container) return;
      container.innerHTML = "";
      list.forEach((show, index) => container.appendChild(createCard(show, ranked ? index + 1 : null)));
    }

    function renderGenres() {
      const genres = [...new Set(shows.flatMap(genresOf))].sort();
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
      els.cat.innerHTML = "";
      const map = {};
      list.forEach(show => genresOf(show).forEach(genre => {
        if (!map[genre]) map[genre] = [];
        map[genre].push(show);
      }));

      Object.keys(map).sort().forEach(genre => {
        const clone = els.categoryTemplate.content.cloneNode(true);
        clone.querySelector(".cat-title").textContent = genre;
        const row = clone.querySelector(".cat-row");
        map[genre].slice(0, 10).forEach(show => row.appendChild(createCard(show)));
        els.cat.appendChild(clone);
      });
    }

    function renderPage() {
      const filtered = filteredShows();
      const topRated = [...filtered].sort((a, b) => ratingOf(b) - ratingOf(a));
      const newest = [...filtered].sort((a, b) => yearOf(b) - yearOf(a));
      const trending = [...filtered].sort((a, b) => ((ratingOf(b) * 10) + yearOf(b) / 1000) - ((ratingOf(a) * 10) + yearOf(a) / 1000));

      els.resultCount.textContent = `${filtered.length} shows found`;
      document.querySelectorAll(".genre-chip").forEach(chip => chip.classList.toggle("active", chip.textContent === activeGenre));

      renderList(els.featured, topRated.slice(0, 6));
      renderList(els.top, topRated.slice(0, 10), true);
      renderList(els.trend, trending.slice(0, 10));
      renderList(els.latest, newest.slice(0, 10));
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
    console.error("Shows page error:", err);
  }
});
