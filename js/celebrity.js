document.addEventListener("DOMContentLoaded", async () => {
  const id = Number(new URLSearchParams(location.search).get("id") || 0);
  const state = { item: null, all: [], catalog: [] };

  function asset(path) {
    if (!path) return "../assets/img/user.png";
    if (/^(https?:)?\/\//.test(path) || path.startsWith("../")) return path;
    return `../${path}`;
  }

  function list(value) {
    if (Array.isArray(value)) return value;
    return String(value || "").split(",").map(item => item.trim()).filter(Boolean);
  }

  function safe(value) {
    return String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  }

  function present(value) {
    if (Array.isArray(value)) return value.length ? value.join(", ") : "";
    return String(value || "").trim();
  }

  async function load() {
    try {
      const detail = await fetch(`../api.php?action=celebrity_get&id=${id}`).then(res => res.json());
      if (detail.success) state.item = detail.celebrity;
    } catch (err) {}

    try {
      const listData = await fetch("../api.php?action=celebrities_list").then(res => res.json());
      if (listData.success) state.all = listData.celebrities;
    } catch (err) {}

    try {
      const catalogData = await fetch("../api.php?action=search&q=&type=all").then(res => res.json());
      if (catalogData.success) state.catalog = [...(catalogData.results.movies || []), ...(catalogData.results.series || [])];
    } catch (err) {}

    if (!state.item) {
      renderSourceMessage();
      return;
    }

    render();
  }

  function render() {
    const item = state.item;
    const gallery = list(item.gallery_images);
    const fullName = item.full_name || item.name || "Celebrity";
    document.title = `${fullName} - MoviesDekho`;
    document.getElementById("detailHero").style.backgroundImage = `url(${asset(item.banner_image || item.profile_image)})`;

    const profile = document.getElementById("profileImage");
    profile.src = asset(item.profile_image || item.thumbnail_image);
    profile.onerror = () => {
      profile.onerror = null;
      profile.src = "../assets/img/user.png";
    };

    document.getElementById("fullName").textContent = fullName;
    const verify = document.querySelector(".verify-mark");
    if (verify) verify.style.display = item.full_name ? "inline-flex" : "none";
    document.getElementById("shortBio").textContent = item.short_bio || item.famous_for || "Verified celebrity profile.";
    document.getElementById("biography").textContent = item.biography || item.short_bio || "Biography details are not available yet.";
    document.getElementById("trendingBadge").textContent = item.imdb_link || item.instagram_link || item.website_link ? "Official profile" : "Celebrity profile";
    document.getElementById("professionTags").innerHTML = list(item.profession || "Actress").map(tag => `<span>${safe(tag)}</span>`).join("");

    const awards = list(item.awards);
    const knownWorks = list(item.known_for_movies);
    const socialCount = [item.instagram_link, item.twitter_link, item.youtube_link, item.imdb_link, item.website_link].filter(Boolean).length;
    const stats = [
      [knownWorks.length || "", "Known works"],
      [awards.length || "", "Awards"],
      [item.followers || "", "Followers"],
      [socialCount || "", "Official links"],
      [Number(item.fan_rating) > 0 ? item.fan_rating : "", "Fan rating"]
    ].filter(([value]) => present(value));
    document.getElementById("statsGrid").innerHTML = stats.length
      ? stats.map(([value, label]) => `<div class="stat-card"><strong>${safe(value)}</strong><span>${label}</span></div>`).join("")
      : `<div class="stat-card"><strong>Profile</strong><span>Public details</span></div>`;

    const facts = [
      ["Birth date", item.birth_date],
      ["Birthplace", item.birthplace],
      ["Nationality", item.nationality],
      ["Height", item.height],
      ["Zodiac", item.zodiac_sign],
      ["Languages", list(item.languages).join(", ")],
      ["Years active", item.years_active]
    ].filter(([, value]) => present(value));
    document.getElementById("facts").innerHTML = facts.length
      ? facts.map(([label, value]) => `<div><strong>${safe(label)}</strong><span>${safe(value)}</span></div>`).join("")
      : "<p>Profile facts are being updated.</p>";

    const timeline = [
      ["Biography", item.short_bio],
      ["Known for", item.famous_for],
      ["Known works", list(item.known_for_movies).join(", ")],
      ["Awards", awards.slice(0, 8).join(", ")],
      ["Upcoming", list(item.upcoming_projects).join(", ")]
    ].filter(([, text]) => present(text));
    document.getElementById("timeline").innerHTML = timeline.length
      ? timeline.map(([title, text]) => `<div><strong>${safe(title)}</strong><p>${safe(text)}</p></div>`).join("")
      : "<p>Career highlights are being updated.</p>";

    const creditCards = renderFilmography(item);
    renderGallery(gallery.length ? gallery : [item.profile_image, item.banner_image], creditCards, item);
    renderSocial(item);
    renderRelated(item);
    bindActions(item);
    loadComments(item.id);
  }

  function renderFilmography(item) {
    const section = document.getElementById("knownForSection");
    const catalog = Array.isArray(item.catalog_known_for) ? item.catalog_known_for : [];

    if (catalog.length) {
      document.getElementById("filmography").innerHTML = catalog.map(entry => {
        const image = asset(entry.poster_url || "");
        const yr = entry.year || "—";
        const roleHtml = entry.role
          ? `<p class="film-role">${safe(entry.role)}</p>`
          : "";
        return `
        <article class="film-card linked" onclick="location.href='movie.html?id=${Number(entry.id)}'">
          <img src="${image}" alt="">
          <strong>${safe(entry.title)}</strong>
          <p>${safe(entry.type || "Title")} · ${safe(String(yr))}</p>
          ${roleHtml}
        </article>`;
      }).join("");
      section?.classList.remove("hidden-section");
      document.querySelectorAll("#filmography .film-card img").forEach(image => {
        image.onerror = () => {
          image.onerror = null;
          image.src = asset(item.profile_image || item.thumbnail_image);
        };
      });
      return catalog.map(entry => ({
        match: {
          id: entry.id,
          title: entry.title,
          type: entry.type,
          release_year: entry.year,
          poster_url: entry.poster_url,
          poster: entry.poster_url,
          backdrop_url: entry.poster_url,
          thumbnail_url: entry.poster_url
        }
      }));
    }

    const works = list(item.known_for_movies);
    const cards = works.map(title => {
      const match = findCatalogTitle(title);
      return { title, match };
    }).filter(card => card.match).slice(0, 16);

    document.getElementById("filmography").innerHTML = cards.length ? cards.map(({ title, match }) => {
      const image = asset(match.poster || match.poster_url || match.thumbnail_url || match.backdrop_url);
      const meta = `${match.type || "Title"} - ${match.release_year || match.year || "Catalog"}`;
      return `
        <article class="film-card linked" onclick="location.href='movie.html?id=${match.id}'">
          <img src="${image}" alt="">
          <strong>${safe(title)}</strong>
          <p>${safe(meta)}</p>
        </article>
      `;
    }).join("") : "";

    if (cards.length) {
      section?.classList.remove("hidden-section");
    } else {
      section?.classList.add("hidden-section");
    }

    document.querySelectorAll("#filmography .film-card img").forEach(image => {
      image.onerror = () => {
        image.onerror = null;
        image.src = asset(item.profile_image || item.thumbnail_image);
      };
    });
    return cards;
  }

  function findCatalogTitle(title) {
    const normalize = value => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const needle = normalize(title);
    return state.catalog.find(item => normalize(item.title) === needle)
      || state.catalog.find(item => needle && (normalize(item.title).includes(needle) || needle.includes(normalize(item.title))));
  }

  function renderGallery(images, creditCards = [], itemFallback = null) {
    const fallbackPerson = itemFallback || state.item || {};
    const creditImages = creditCards
      .map(card => card.match)
      .filter(Boolean)
      .map(match => match.backdrop_url || match.backdrop || match.poster_url || match.poster || match.thumbnail_url);
    const usable = [...new Set([...images, ...creditImages].filter(Boolean))];
    const gallery = document.getElementById("gallery");
    gallery.innerHTML = usable.length
      ? usable.slice(0, 8).map((src, index) => `<img class="gallery-shot shot-${index % 4}" src="${asset(src)}" loading="lazy" alt="">`).join("")
      : "<p>Photo gallery is being updated.</p>";
    gallery.querySelectorAll("img").forEach(image => {
      image.onerror = () => {
        image.onerror = null;
        image.src = asset(fallbackPerson.profile_image || fallbackPerson.thumbnail_image);
      };
      image.onclick = () => openLightbox(image.src);
    });
  }

  function renderSocial(item) {
    const links = [
      ["Instagram", item.instagram_link],
      ["Twitter/X", item.twitter_link],
      ["YouTube", item.youtube_link],
      ["IMDb", item.imdb_link],
      ["Official Website", item.website_link]
    ].filter(([, url]) => url);
    document.getElementById("socialLinks").innerHTML = links.length
      ? links.map(([label, url]) => `<a class="social-card" href="${safe(url)}" target="_blank" rel="noopener">${safe(label)}</a>`).join("")
      : "<p>No official links imported.</p>";
  }

  function renderRelated(item) {
    const related = state.all
      .filter(person => Number(person.id) !== Number(item.id) && person.nationality === item.nationality)
      .slice(0, 10);
    document.getElementById("relatedRow").innerHTML = related.map(person => `
      <article class="celebrity-card" onclick="location.href='celebrity.html?id=${person.id}'">
        <img class="celeb-img" src="${asset(person.profile_image || person.thumbnail_image)}" alt="">
        <div class="celeb-info"><span class="verified">Verified</span><h3 class="celeb-name">${safe(person.full_name)}</h3><p class="celeb-meta">${safe(person.nationality || "International")}</p><p class="celeb-known">${safe(person.famous_for || person.short_bio || "")}</p></div>
      </article>
    `).join("");
  }

  function bindActions(item) {
    bindToggle("followBtn", "movieDekhoFollowedCelebs", item.id, "Follow", "Following");
    bindToggle("favoriteBtn", "movieDekhoFavoriteCelebs", item.id, "Favorite", "Favorited");
    document.getElementById("shareBtn").onclick = async () => {
      try {
        if (navigator.share) await navigator.share({ title: item.full_name, url: location.href });
        else if (navigator.clipboard) await navigator.clipboard.writeText(location.href);
        toast("Profile link copied");
      } catch (err) {
        toast("Share cancelled");
      }
    };
    document.getElementById("commentBtn").onclick = postComment;
  }

  function bindToggle(buttonId, key, personId, off, on) {
    const button = document.getElementById(buttonId);
    const read = () => JSON.parse(localStorage.getItem(key)) || [];
    const write = ids => localStorage.setItem(key, JSON.stringify([...new Set(ids.map(Number))]));
    const update = () => button.textContent = read().includes(Number(personId)) ? on : off;
    button.onclick = () => {
      const ids = read();
      write(ids.includes(Number(personId)) ? ids.filter(id => id !== Number(personId)) : [...ids, Number(personId)]);
      update();
      toast(button.textContent);
    };
    update();
  }

  function loadComments(personId) {
    const local = JSON.parse(localStorage.getItem(`celebrityComments_${personId}`)) || [];
    fetch(`../api.php?action=celebrity_comments_get&celebrity_id=${personId}`)
      .then(res => res.json())
      .then(res => {
        const apiComments = res.success ? res.comments || [] : [];
        renderComments([...local, ...apiComments]);
      })
      .catch(() => renderComments(local));
  }

  function renderComments(comments) {
    document.getElementById("comments").innerHTML = comments.length ? comments.map(comment => `
      <div class="comment-card"><strong>${safe(comment.username || "Movie Fan")} - ${safe(comment.rating)}/5</strong><p>${safe(comment.comment)}</p></div>
    `).join("") : "<p>No fan comments yet. Be the first.</p>";
  }

  function postComment() {
    const comment = document.getElementById("commentInput").value.trim();
    const rating = document.getElementById("commentRating").value;
    if (!comment) return toast("Write a comment first");
    const key = `celebrityComments_${state.item.id}`;
    const next = [...(JSON.parse(localStorage.getItem(key)) || []), {
      username: "Movie Fan",
      rating,
      comment,
      celebrity_id: Number(state.item.id),
      celebrity_name: state.item.full_name,
      created_at: new Date().toISOString()
    }];
    localStorage.setItem(key, JSON.stringify(next));
    document.getElementById("commentInput").value = "";
    renderComments(next);
    toast("Comment posted");
    fetch("../api.php?action=celebrity_comments_post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ celebrity_id: Number(state.item.id), rating, comment })
    }).catch(() => {});
  }

  function renderSourceMessage() {
    document.getElementById("celebrityDetail").innerHTML = `
      <section class="source-message detail-source">
        <h1>Import celebrity profiles</h1>
        <p>No fake actress data is shown. Open <code>http://localhost/MovieDekho/wiki_celebrity_import.php</code>, then reload this page.</p>
        <a class="social-card" href="celebrities.html">Back to celebrities</a>
      </section>
    `;
  }

  function openLightbox(src) {
    const box = document.getElementById("lightbox");
    box.querySelector("img").src = src;
    box.classList.add("open");
  }

  document.getElementById("closeLightbox").onclick = () => document.getElementById("lightbox").classList.remove("open");

  function toast(message) {
    const node = document.getElementById("toast");
    node.textContent = message;
    node.classList.add("show");
    setTimeout(() => node.classList.remove("show"), 1600);
  }

  load();
});
