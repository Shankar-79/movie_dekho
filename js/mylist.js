$(document).ready(async function () {
  const state = {
    all: [],
    celebrities: [],
    savedIds: [],
    followedCelebIds: [],
    favoriteCelebIds: [],
    query: "",
    category: "all",
    sort: "recent",
    grid: true
  };

  function assetPath(path) {
    if (!path) return "../assets/img/favicon.png";
    if (/^(https?:)?\/\//.test(path) || path.startsWith("../")) return path;
    return `../${path}`;
  }

  function genres(movie) {
    return Array.isArray(movie.genre)
      ? movie.genre
      : String(movie.genre || "").split(",").map(genre => genre.trim()).filter(Boolean);
  }

  function rating(movie) {
    return Number(movie.rating || movie.imdb_rating || 0);
  }

  function year(movie) {
    return Number(movie.year || movie.release_year || 0);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function savedKey() {
    return "movieDekhoWatchlist";
  }

  function readSavedIds() {
    return (JSON.parse(localStorage.getItem(savedKey())) || []).map(Number);
  }

  function readIds(key) {
    return (JSON.parse(localStorage.getItem(key)) || []).map(Number);
  }

  async function loadCatalog() {
    try {
      const api = await fetch("../api.php?action=search&q=&type=all").then(res => res.json());
      if (api.success) {
        state.all = [...(api.results.movies || []), ...(api.results.series || [])];
      }
    } catch (err) {}

    if (!state.all.length) {
      state.all = await fetch("../data/movie.json").then(res => res.json()).catch(() => []);
    }
  }

  async function loadCelebrities() {
    try {
      const data = await fetch("../api.php?action=celebrities_list").then(res => res.json());
      if (data.success) state.celebrities = data.celebrities || [];
    } catch (err) {}
  }

  async function loadWatchlist() {
    state.followedCelebIds = readIds("movieDekhoFollowedCelebs");
    state.favoriteCelebIds = readIds("movieDekhoFavoriteCelebs");

    try {
      const data = await fetch("../api.php?action=watchlist_get").then(res => res.json());
      if (data.success && Array.isArray(data.watchlist)) {
        state.savedIds = data.watchlist.map(Number);
        localStorage.setItem(savedKey(), JSON.stringify(state.savedIds));
        return;
      }
    } catch (err) {}

    state.savedIds = readSavedIds();
  }

  await loadCatalog();
  await loadCelebrities();
  await loadWatchlist();
  render();
  bindControls();
  bindNotificationForm();

  function savedMovies() {
    const ids = state.savedIds.map(Number);
    return ids
      .map(id => state.all.find(movie => Number(movie.id) === id))
      .filter(Boolean);
  }

  function filteredMovies() {
    const q = state.query.toLowerCase();
    let list = savedMovies().filter(movie => {
      const type = String(movie.type || "").toLowerCase();
      const matchesCategory = state.category === "all" || (state.category !== "celebrity" && type === state.category);
      const text = `${movie.title} ${type} ${genres(movie).join(" ")}`.toLowerCase();
      return matchesCategory && (!q || text.includes(q));
    });

    if (state.sort === "rating") list = list.sort((a, b) => rating(b) - rating(a));
    if (state.sort === "year") list = list.sort((a, b) => year(b) - year(a));
    if (state.sort === "title") list = list.sort((a, b) => String(a.title).localeCompare(String(b.title)));
    return list;
  }

  function render() {
    const list = filteredMovies();
    const celebrityCount = savedCelebrities().length;
    const titleCount = savedMovies().length;
    $("#count").text(`${titleCount} saved titles - ${celebrityCount} saved celebrities`);
    renderCards(state.category === "celebrity" ? [] : list);
    renderCelebrities();
    renderReviewHistory();
    renderNotifications();
  }

  function renderCards(list) {
    const box = document.getElementById("list");
    const template = document.getElementById("card");
    const emptyState = document.getElementById("emptyState");

    box.classList.toggle("list-mode", !state.grid);
    box.classList.toggle("grid-mode", state.grid);
    box.innerHTML = "";
    emptyState.classList.toggle("show", list.length === 0 && state.category !== "celebrity");

    list.forEach(movie => {
      const clone = template.content.cloneNode(true);
      const card = clone.querySelector(".movie-card");
      const score = rating(movie);
      const movieGenres = genres(movie);
      const poster = clone.querySelector(".poster");

      poster.src = assetPath(movie.poster || movie.poster_url || movie.thumbnail_url);
      poster.onerror = () => {
        poster.onerror = null;
        poster.src = "../assets/img/favicon.png";
      };

      clone.querySelector(".title").textContent = movie.title;
      clone.querySelector(".rating").textContent = `${year(movie) || "N/A"} - ${String(movie.type || "title")} - IMDb ${score || "N/A"}`;
      clone.querySelector(".genre").textContent = movieGenres.slice(0, 3).join(", ") || "Catalog pick";
      clone.querySelector(".priority").textContent = score >= 8.5 ? "Top Rated" : "Saved";
      clone.querySelector(".progress-track span").style.width = `${Math.max(10, Math.min(100, Math.round(score * 10) || 54))}%`;

      clone.querySelectorAll(".card-actions button").forEach(button => {
        button.addEventListener("click", event => {
          event.stopPropagation();
          location.href = `movie.html?id=${movie.id}`;
        });
      });

      clone.querySelector(".remove-btn").onclick = event => {
        event.stopPropagation();
        card.classList.add("removing");
        setTimeout(() => {
          state.savedIds = state.savedIds.filter(id => Number(id) !== Number(movie.id));
          localStorage.setItem(savedKey(), JSON.stringify(state.savedIds));
          fetch("../api.php?action=watchlist_remove", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ movie_id: Number(movie.id) })
          }).catch(() => {});
          render();
        }, 220);
      };

      card.onclick = () => location.href = `movie.html?id=${movie.id}`;
      card.addEventListener("dragstart", event => event.dataTransfer.setData("text/plain", String(movie.id)));
      card.addEventListener("dragover", event => event.preventDefault());
      card.addEventListener("drop", event => {
        event.preventDefault();
        const dragged = Number(event.dataTransfer.getData("text/plain"));
        const target = Number(movie.id);
        const next = [...state.savedIds];
        const from = next.indexOf(dragged);
        const to = next.indexOf(target);
        if (from >= 0 && to >= 0) {
          next.splice(to, 0, next.splice(from, 1)[0]);
          state.savedIds = next;
          localStorage.setItem(savedKey(), JSON.stringify(next));
          render();
        }
      });

      box.appendChild(clone);
    });
  }

  function renderReviewHistory() {
    const reviewBox = document.getElementById("reviewHistory");
    if (!reviewBox) return;

    const reviews = Object.keys(localStorage)
      .filter(key => key.startsWith("reviews_"))
      .flatMap(key => {
        const id = Number(key.replace("reviews_", ""));
        const title = state.all.find(movie => Number(movie.id) === id)?.title || "Saved title";
        return (JSON.parse(localStorage.getItem(key)) || []).map(review => ({ ...review, id, title: review.title || title }));
      })
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    if (!reviews.length) {
      reviewBox.innerHTML = `
        <div class="review-empty">
          <strong>No reviews added yet</strong>
          <p>Your movie reviews will appear here after you submit them from any details page.</p>
        </div>
      `;
      return;
    }

    reviewBox.innerHTML = reviews.slice(0, 6).map(review => `
      <button class="review-row" type="button" data-id="${review.id}">
        <span>${escapeHtml(review.title)}</span>
        <strong>${escapeHtml(review.rating)}/5</strong>
        <small>${escapeHtml(review.comment)}</small>
      </button>
    `).join("");

    reviewBox.querySelectorAll(".review-row").forEach(row => {
      row.onclick = () => location.href = `movie.html?id=${row.dataset.id}#reviews`;
    });
  }

  function savedCelebrities() {
    const ids = [...new Set([...state.followedCelebIds, ...state.favoriteCelebIds])];
    const q = state.query.toLowerCase();
    return ids
      .map(id => state.celebrities.find(person => Number(person.id) === Number(id)))
      .filter(Boolean)
      .filter(person => {
        const text = `${person.full_name} ${person.nationality || ""} ${person.famous_for || ""}`.toLowerCase();
        return !q || text.includes(q);
      });
  }

  function celebrityComments(personId) {
    return JSON.parse(localStorage.getItem(`celebrityComments_${personId}`)) || [];
  }

  function renderCelebrities() {
    const box = document.getElementById("celebrityList");
    const summary = document.getElementById("celebritySummary");
    const template = document.getElementById("celebrityCard");
    if (!box || !summary || !template) return;

    const people = savedCelebrities();
    const commentCount = people.reduce((total, person) => total + celebrityComments(person.id).length, 0);
    summary.innerHTML = `
      <div><strong>${state.followedCelebIds.length}</strong><span>Followed</span></div>
      <div><strong>${state.favoriteCelebIds.length}</strong><span>Favorites</span></div>
      <div><strong>${commentCount}</strong><span>Fan comments</span></div>
    `;

    if (!people.length) {
      box.innerHTML = `
        <div class="celebrity-empty">
          <strong>No celebrities saved yet</strong>
          <p>Follow or favorite celebrities from their profile pages and they will appear here.</p>
          <a href="../pages/celebrities.html">Browse Celebrities</a>
        </div>
      `;
      return;
    }

    box.innerHTML = "";
    people.forEach(person => {
      const clone = template.content.cloneNode(true);
      const followed = state.followedCelebIds.includes(Number(person.id));
      const favorite = state.favoriteCelebIds.includes(Number(person.id));
      const comments = celebrityComments(person.id);
      const img = clone.querySelector(".celeb-avatar");

      img.src = assetPath(person.profile_image || person.thumbnail_image);
      img.onerror = () => {
        img.onerror = null;
        img.src = "../assets/img/user.png";
      };
      clone.querySelector(".celeb-state").textContent = [followed ? "Following" : "", favorite ? "Favorite" : ""].filter(Boolean).join(" - ");
      clone.querySelector(".celeb-name").textContent = person.full_name;
      clone.querySelector(".celeb-meta").textContent = `${person.nationality || "Celebrity"} - ${comments.length} comments`;
      clone.querySelector(".view-celeb").onclick = () => location.href = `celebrity.html?id=${person.id}`;
      clone.querySelector(".remove-celeb").onclick = () => {
        state.followedCelebIds = state.followedCelebIds.filter(id => Number(id) !== Number(person.id));
        state.favoriteCelebIds = state.favoriteCelebIds.filter(id => Number(id) !== Number(person.id));
        localStorage.setItem("movieDekhoFollowedCelebs", JSON.stringify(state.followedCelebIds));
        localStorage.setItem("movieDekhoFavoriteCelebs", JSON.stringify(state.favoriteCelebIds));
        render();
      };
      box.appendChild(clone);
    });
  }

  function notificationItems() {
    return savedCelebrities().flatMap(person => {
      const comments = celebrityComments(person.id).slice(-2).map(comment => ({
        title: `${person.full_name} fan comment`,
        text: `${comment.rating}/5 - ${comment.comment}`,
        when: comment.created_at || new Date().toISOString()
      }));
      return [
        {
          title: `${person.full_name} is on your follow list`,
          text: "Mail alerts are enabled for profile updates and new fan activity.",
          when: new Date().toISOString()
        },
        ...comments
      ];
    }).slice(0, 8);
  }

  function renderNotifications() {
    const feed = document.getElementById("notificationFeed");
    if (!feed) return;
    const prefs = JSON.parse(localStorage.getItem("movieDekhoCelebrityMailPrefs")) || {};
    const items = notificationItems();
    if (!prefs.email) {
      feed.innerHTML = `<p>Add an email to prepare followed celebrity mail notifications.</p>`;
      return;
    }
    feed.innerHTML = items.length
      ? items.map(item => `<div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.text)}</span></div>`).join("")
      : `<p>Follow celebrities to receive mail-ready updates.</p>`;
  }

  function bindNotificationForm() {
    const form = document.getElementById("notificationForm");
    if (!form) return;
    const input = document.getElementById("notificationEmail");
    const prefs = JSON.parse(localStorage.getItem("movieDekhoCelebrityMailPrefs")) || {};
    input.value = prefs.email || localStorage.getItem("user_email") || "";
    form.onsubmit = event => {
      event.preventDefault();
      const email = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert("Enter a valid email address.");
        return;
      }
      localStorage.setItem("movieDekhoCelebrityMailPrefs", JSON.stringify({
        email,
        enabled: true,
        saved_at: new Date().toISOString()
      }));
      fetch("../api.php?action=celebrity_notifications_subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, celebrity_count: savedCelebrities().length })
      }).then(res => res.json()).catch(err => {
        console.warn("Mail alerts disabled: SMTP not configured", err);
      });
      renderNotifications();
      form.classList.add("saved");
      form.querySelector("button").textContent = "Mail Alerts Saved (SMTP disabled)";
    };
  }

  function bindControls() {
    $("#listSearch").on("input", event => {
      state.query = event.target.value.trim();
      render();
    });

    $("#categoryFilter").on("change", event => {
      state.category = event.target.value;
      render();
    });

    $("#sortFilter").on("change", event => {
      state.sort = event.target.value;
      render();
    });

    $("#gridToggle").on("click", function () {
      state.grid = !state.grid;
      this.textContent = state.grid ? "Grid" : "List";
      render();
    });
  }
});
