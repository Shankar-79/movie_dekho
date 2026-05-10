document.addEventListener("DOMContentLoaded", function () {
  fetch("../components/navbar.html")
    .then(res => {
      if (!res.ok) throw new Error("Navbar request failed");
      return res.text();
    })
    .then(html => {
      const mount = document.getElementById("navbar-container");
      if (!mount) return;
      mount.innerHTML = html;
      initNavbar();
    })
    .catch(() => {});

  function assetPath(path) {
    if (!path) return "../assets/img/favicon.png";
    if (/^(https?:)?\/\//.test(path) || path.startsWith("../")) return path;
    return `../${path}`;
  }

  function initNavbar() {
    const nav = document.querySelector("[data-nav]");
    const menu = document.getElementById("navMenu");
    const toggle = document.getElementById("navToggle");
    const searchWrap = document.querySelector(".nav-search");
    const searchToggle = document.getElementById("searchToggle");
    const input = document.getElementById("navSearch");
    const resultsBox = document.getElementById("liveResults");
    const profileButton = document.getElementById("profileMenuButton");
    const profileDropdown = document.getElementById("profileDropdown");
    const logoutButton = document.getElementById("navLogout");
    const userName = document.getElementById("navUserName");

    const current = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav-center a").forEach(link => {
      const target = link.getAttribute("href").split("/").pop().split("?")[0];
      link.classList.toggle("active", target === current || (current === "" && target === "index.html"));
    });

    toggle?.addEventListener("click", () => {
      toggle.classList.toggle("open");
      menu?.classList.toggle("open");
    });

    searchToggle?.addEventListener("click", () => {
      searchWrap?.classList.toggle("open");
      if (searchWrap?.classList.contains("open")) input?.focus();
    });

    profileButton?.addEventListener("click", event => {
      event.stopPropagation();
      profileDropdown?.classList.toggle("open");
    });

    logoutButton?.addEventListener("click", () => {
      fetch("../api.php?action=logout", { method: "POST" }).finally(() => {
        localStorage.clear();
        location.href = "../pages/login.html";
      });
    });

    fetch("../api.php?action=session")
      .then(res => res.json())
      .then(res => {
        if (res.loggedIn && res.user?.username) {
          userName.textContent = res.user.username;
        } else {
          userName.textContent = localStorage.getItem("user_name") || "Movie Fan";
        }
      })
      .catch(() => {
        userName.textContent = localStorage.getItem("user_name") || "Movie Fan";
      });

    let lastScroll = window.scrollY;
    window.addEventListener("scroll", () => {
      const y = window.scrollY;
      nav?.classList.toggle("scrolled", y > 60);
      if (y > 180 && y > lastScroll + 8) nav?.classList.add("nav-hidden");
      if (y < lastScroll - 8 || y < 90) nav?.classList.remove("nav-hidden");
      lastScroll = Math.max(y, 0);
    }, { passive: true });

    let debounceTimer;
    input?.addEventListener("input", function () {
      const q = input.value.trim();
      clearTimeout(debounceTimer);

      if (q.length < 2) {
        if (resultsBox) resultsBox.style.display = "none";
        return;
      }

      debounceTimer = setTimeout(() => searchLive(q), 220);
    });

    document.addEventListener("click", function (event) {
      if (!event.target.closest(".nav-right")) {
        if (resultsBox) resultsBox.style.display = "none";
        profileDropdown?.classList.remove("open");
      }
      if (!event.target.closest(".navbar")) {
        menu?.classList.remove("open");
        toggle?.classList.remove("open");
      }
    });

    function searchLive(q) {
      if (!resultsBox) return;
      fetch(`../api.php?action=search&q=${encodeURIComponent(q)}`)
        .then(res => res.json())
        .then(data => {
          const movies = data.results?.movies || [];
          const series = data.results?.series || [];
          const actresses = data.results?.actresses || [];
          const titles = [...movies, ...series].slice(0, 7);

          if (!titles.length && !actresses.length) {
            resultsBox.innerHTML = '<p class="live-no-result">No matching titles yet</p>';
            resultsBox.style.display = "block";
            return;
          }

          const titleHtml = titles.map(item => `
            <div class="live-item" onclick="goToMovie(${Number(item.id)})">
              <img src="${assetPath(item.poster || item.poster_url)}" alt="">
              <div>
                <div class="live-title">${escapeHtml(item.title)}</div>
                <div class="live-meta">${escapeHtml(item.type || "movie")} - ${item.year || item.release_year || "N/A"} - ${item.rating || item.imdb_rating || "N/A"}/10</div>
              </div>
            </div>
          `).join("");

          const actorHtml = actresses.slice(0, 3).map(actor => `
            <div class="live-item live-item--celebrity" role="link" tabindex="0"
              onclick="goToCelebrity(${Number(actor.id)})">
              <img src="${assetPath(actor.img)}" alt="">
              <div>
                <div class="live-title">${escapeHtml(actor.name)}</div>
                <div class="live-meta">${escapeHtml(actor.known_for || "Popular celebrity")}</div>
              </div>
            </div>
          `).join("");

          resultsBox.innerHTML = titleHtml + actorHtml;
          resultsBox.style.display = "block";
        })
        .catch(() => {
          resultsBox.innerHTML = '<p class="live-no-result">Search is unavailable</p>';
          resultsBox.style.display = "block";
        });
    }

    window.goToMovie = function (id) {
      window.location.href = `../pages/movie.html?id=${id}`;
    };

    window.goToCelebrity = function (id) {
      if (!Number.isFinite(Number(id)) || Number(id) <= 0) return;
      window.location.href = `../pages/celebrity.html?id=${id}`;
    };
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
});
