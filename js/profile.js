document.addEventListener("DOMContentLoaded", async () => {
  const genres = ["Action", "Adventure", "Thriller", "Horror", "Sci-Fi", "Fantasy", "Romance", "Comedy", "Drama", "Anime", "Crime", "Mystery", "Biography", "Documentary", "Family", "Sports", "War"];
  const defaults = {
    name: localStorage.getItem("user_name") || "Movie Fan",
    bio: "Building a watchlist of thrillers, dramas, action picks, and weekend discoveries.",
    genres: ["Action", "Drama", "Sci-Fi", "Anime"],
    avatar: "../assets/img/user.png",
    prefs: {}
  };

  const state = {
    profile: readProfile(),
    catalog: [],
    savedIds: JSON.parse(localStorage.getItem("movieDekhoWatchlist")) || [],
    likedIds: JSON.parse(localStorage.getItem("movieDekhoLiked")) || []
  };

  function readProfile() {
    return { ...defaults, ...(JSON.parse(localStorage.getItem("movieDekhoProfile")) || {}) };
  }

  function saveProfile() {
    localStorage.setItem("movieDekhoProfile", JSON.stringify(state.profile));
    localStorage.setItem("user_name", state.profile.name);
  }

  function assetPath(path) {
    if (!path) return "../assets/img/favicon.png";
    if (/^(https?:)?\/\//.test(path) || path.startsWith("../")) return path;
    return `../${path}`;
  }

  function list(value) {
    if (Array.isArray(value)) return value;
    return String(value || "").split(",").map(item => item.trim()).filter(Boolean);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function loadCatalog() {
    try {
      const api = await fetch("../api.php?action=search&q=&type=all").then(res => res.json());
      if (api.success) state.catalog = [...(api.results.movies || []), ...(api.results.series || [])];
    } catch (err) {}

    if (!state.catalog.length) {
      state.catalog = await fetch("../data/movie.json").then(res => res.json()).catch(() => []);
    }
  }

  async function loadSavedIds() {
    const localIds = state.savedIds.map(Number);
    try {
      const data = await fetch("../api.php?action=watchlist_get").then(res => res.json());
      if (data.success && Array.isArray(data.watchlist)) {
        const ids = data.watchlist.map(Number);
        state.savedIds = ids;
        localStorage.setItem("movieDekhoWatchlist", JSON.stringify(ids));
        return;
      }
    } catch (err) {}
    state.savedIds = localIds;
  }

  await loadCatalog();
  await loadSavedIds();
  bindEditor();
  bindProfileActions();
  render();

  async function hydrateSessionName() {
    try {
      const session = await fetch("../api.php?action=session").then(res => res.json());
      if (session.loggedIn && session.user?.username && !localStorage.getItem("movieDekhoProfile")) {
        state.profile.name = session.user.username;
      }
    } catch (err) {}
  }

  await hydrateSessionName();
  render();

  function savedTitles() {
    return state.savedIds
      .map(id => state.catalog.find(title => Number(title.id) === Number(id)))
      .filter(Boolean);
  }

  function localReviews() {
    return Object.keys(localStorage)
      .filter(key => key.startsWith("reviews_"))
      .flatMap(key => {
        const id = Number(key.replace("reviews_", ""));
        const title = state.catalog.find(item => Number(item.id) === id)?.title || "MovieDekho title";
        return (JSON.parse(localStorage.getItem(key)) || []).map(review => ({ ...review, id, title: review.title || title }));
      });
  }

  function render() {
    const saved = savedTitles();
    const reviews = localReviews();
    const topGenres = tasteGenres(saved);

    document.getElementById("profileName").textContent = state.profile.name || defaults.name;
    document.getElementById("profileBio").textContent = state.profile.bio || defaults.bio;
    document.getElementById("avatarPreview").src = state.profile.avatar || defaults.avatar;

    document.getElementById("profileGenres").innerHTML = state.profile.genres.map(genre => `<span>${escapeHtml(genre)}</span>`).join("");
    document.getElementById("tasteGenres").innerHTML = topGenres.map(genre => `<span>${escapeHtml(genre)}</span>`).join("");

    document.getElementById("profileStats").innerHTML = [
      [saved.length, "Saved titles"],
      [state.likedIds.length, "Liked titles"],
      [reviews.length, "Reviews added"],
      [topGenres[0] || "Action", "Top genre"]
    ].map(([value, label]) => `<div class="profile-stat"><strong>${escapeHtml(value)}</strong><span>${label}</span></div>`).join("");

    renderSaved(saved);
    renderReviews(reviews);
    syncEditorValues();
  }

  function tasteGenres(saved) {
    const counts = {};
    [...saved, ...state.catalog.filter(item => state.likedIds.includes(Number(item.id)))].forEach(item => {
      list(item.genre).forEach(genre => counts[genre] = (counts[genre] || 0) + 1);
    });
    const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([genre]) => genre);
    return (ranked.length ? ranked : state.profile.genres).slice(0, 8);
  }

  function renderSaved(saved) {
    const row = document.getElementById("savedRow");
    if (!saved.length) {
      row.innerHTML = `
        <div class="saved-empty">
          <strong>No watchlist picks yet</strong>
          <p>Movies and shows appear here only after you add them to My List.</p>
          <a href="../pages/movies.html">Browse Movies</a>
        </div>
      `;
      return;
    }

    const items = saved.slice(0, 8);
    row.innerHTML = items.map(item => `
      <article class="profile-poster" data-id="${item.id}">
        <img src="${assetPath(item.poster || item.poster_url || item.thumbnail_url)}" alt="">
        <strong>${escapeHtml(item.title)}</strong>
      </article>
    `).join("");

    row.querySelectorAll(".profile-poster").forEach(card => {
      card.onclick = () => location.href = `movie.html?id=${card.dataset.id}`;
      const img = card.querySelector("img");
      img.onerror = () => {
        img.onerror = null;
        img.src = "../assets/img/favicon.png";
      };
    });
  }

  function renderReviews(reviews) {
    const box = document.getElementById("profileReviews");
    if (!reviews.length) {
      box.innerHTML = "<p>No reviews yet. Add one from any movie details page.</p>";
      return;
    }

    box.innerHTML = reviews.slice(0, 5).map(review => `
      <button class="review-chip" type="button" data-id="${review.id}">
        <span>${escapeHtml(review.title)}</span>
        <strong>${escapeHtml(review.rating)}/5</strong>
      </button>
    `).join("");

    box.querySelectorAll(".review-chip").forEach(button => {
      button.onclick = () => location.href = `movie.html?id=${button.dataset.id}#reviews`;
    });
  }

  function bindEditor() {
    const modal = document.getElementById("profileModal");
    const form = document.getElementById("profileForm");

    document.getElementById("customizeBtn").onclick = () => {
      syncEditorValues();
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
    };

    document.getElementById("closeProfileModal").onclick = closeModal;
    modal.addEventListener("click", event => {
      if (event.target === modal) closeModal();
    });

    document.getElementById("genrePicker").innerHTML = genres.map(genre => `
      <label><input type="checkbox" value="${escapeHtml(genre)}"> ${escapeHtml(genre)}</label>
    `).join("");

    document.querySelectorAll(".avatar-swatches button").forEach(button => {
      button.onclick = () => {
        document.querySelectorAll(".avatar-swatches button").forEach(item => item.classList.remove("active"));
        button.classList.add("active");
        state.profile.avatar = button.dataset.avatar;
        document.getElementById("avatarPreview").src = button.dataset.avatar;
      };
    });

    form.onsubmit = event => {
      event.preventDefault();
      const checked = [...document.querySelectorAll("#genrePicker input:checked")].map(input => input.value);
      state.profile.name = document.getElementById("nameInput").value.trim() || defaults.name;
      state.profile.bio = document.getElementById("bioInput").value.trim() || defaults.bio;
      state.profile.genres = checked.length ? checked : defaults.genres;
      saveProfile();
      render();
      closeModal();
      toast("Profile updated");
    };

    function closeModal() {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
    }
  }

  function bindProfileActions() {
    document.getElementById("editProfileAction").onclick = () => document.getElementById("customizeBtn").click();
    document.getElementById("openSavedAction").onclick = () => location.href = "../pages/mylist.html";
    document.getElementById("openCelebrityAlertsAction").onclick = () => location.href = "../pages/mylist.html#notificationForm";
  }

  function syncEditorValues() {
    document.getElementById("nameInput").value = state.profile.name || defaults.name;
    document.getElementById("bioInput").value = state.profile.bio || defaults.bio;
    document.querySelectorAll("#genrePicker input").forEach(input => {
      input.checked = state.profile.genres.includes(input.value);
    });
    document.querySelectorAll(".avatar-swatches button").forEach(button => {
      button.classList.toggle("active", button.dataset.avatar === state.profile.avatar);
    });
  }

  function toast(message) {
    const node = document.getElementById("profileToast");
    node.textContent = message;
    node.classList.add("show");
    setTimeout(() => node.classList.remove("show"), 1800);
  }
});
