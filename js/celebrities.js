document.addEventListener("DOMContentLoaded", async () => {
  const state = { all: [], filtered: [], query: "", country: "all", profession: "all", sort: "popularity" };
  const els = {
    search: document.getElementById("celebritySearch"),
    country: document.getElementById("countryFilter"),
    profession: document.getElementById("professionFilter"),
    sort: document.getElementById("sortFilter"),
    grid: document.getElementById("celebrityGrid"),
    trending: document.getElementById("trendingRow"),
    stats: document.getElementById("heroStats"),
    count: document.getElementById("resultCount"),
    template: document.getElementById("celebrityCard")
  };

  function asset(path) {
    if (!path) return "../assets/img/user.png";
    if (/^(https?:)?\/\//.test(path) || path.startsWith("../")) return path;
    return `../${path}`;
  }

  function list(value) {
    if (Array.isArray(value)) return value;
    return String(value || "").split(",").map(item => item.trim()).filter(Boolean);
  }

  function hasRealImage(item) {
    const image = String(item.profile_image || item.thumbnail_image || "").trim();
    return image && !image.includes("Signature_of_") && !image.includes("user.png");
  }

  function canonicalName(name) {
    return String(name || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\b(jonas|bachchan|khan|entertainer|singer)\b/g, "")
      .replace(/[^a-z0-9]/g, "");
  }

  function uniqueProfiles(items) {
    const seen = new Set();
    return items.filter(item => {
      if (!hasRealImage(item)) return false;
      const key = canonicalName(item.full_name);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function follows() {
    return JSON.parse(localStorage.getItem("movieDekhoFollowedCelebs")) || [];
  }

  function setFollows(ids) {
    localStorage.setItem("movieDekhoFollowedCelebs", JSON.stringify([...new Set(ids.map(Number))]));
  }

  async function load() {
    els.count.textContent = "Loading celebrity profiles...";
    try {
      const data = await fetch("../api.php?action=celebrities_list").then(res => res.json());
      state.all = data.success ? uniqueProfiles(data.celebrities) : [];
    } catch (err) {
      state.all = [];
    }

    if (!state.all.length) {
      renderSourceMessage();
      return;
    }

    initFilters();
    render();
  }

  function initFilters() {
    const countries = [...new Set(state.all.map(item => item.nationality).filter(Boolean))].sort();
    const professions = [...new Set(state.all.flatMap(item => list(item.profession)).filter(Boolean))].sort();
    els.country.innerHTML = `<option value="all">All Countries</option>` + countries.map(country => `<option>${country}</option>`).join("");
    els.profession.innerHTML = `<option value="all">All Professions</option>` + professions.map(profession => `<option>${profession}</option>`).join("");
  }

  function applyFilters() {
    const q = state.query.toLowerCase();
    let items = state.all.filter(item => {
      const text = `${item.full_name} ${item.famous_for} ${item.nationality} ${item.profession}`.toLowerCase();
      const countryOk = state.country === "all" || item.nationality === state.country;
      const professionOk = state.profession === "all" || list(item.profession).includes(state.profession) || String(item.profession || "").includes(state.profession);
      return countryOk && professionOk && (!q || text.includes(q));
    });

    if (state.sort === "trending") items.sort((a, b) => Number(b.trending_score) - Number(a.trending_score) || String(a.full_name).localeCompare(String(b.full_name)));
    else if (state.sort === "rating") items.sort((a, b) => Number(b.fan_rating) - Number(a.fan_rating) || String(a.full_name).localeCompare(String(b.full_name)));
    else if (state.sort === "name") items.sort((a, b) => String(a.full_name).localeCompare(String(b.full_name)));
    else items.sort((a, b) => Number(b.popularity_score) - Number(a.popularity_score) || String(a.full_name).localeCompare(String(b.full_name)));
    state.filtered = items;
  }

  function render() {
    applyFilters();
    els.count.textContent = `${state.filtered.length} celebrity profiles loaded`;
    els.stats.innerHTML = [
      [state.all.length, "Profiles"],
      [new Set(state.all.map(x => x.nationality).filter(Boolean)).size, "Countries"],
      [state.all.filter(x => Number(x.featured)).length, "Featured"],
      [state.all.filter(x => x.instagram_link || x.twitter_link || x.imdb_link || x.website_link).length, "Official links"]
    ].map(([value, label]) => `<div class="hero-stat"><strong>${value}</strong><span>${label}</span></div>`).join("");

    const trending = [...state.all].filter(item => Number(item.featured)).sort((a, b) => String(a.full_name).localeCompare(String(b.full_name))).slice(0, 16);
    const trendingIds = new Set(trending.map(item => Number(item.id)));
    renderInto(els.trending, trending);
    renderInto(els.grid, state.filtered.filter(item => !trendingIds.has(Number(item.id))));
  }

  function renderInto(container, items) {
    container.innerHTML = "";
    items.forEach(item => container.appendChild(cardFor(item)));
  }

  function cardFor(item) {
    const clone = els.template.content.cloneNode(true);
    const card = clone.querySelector(".celebrity-card");
    const button = clone.querySelector(".follow-btn");
    const id = Number(item.id);
    const image = clone.querySelector(".celeb-img");

    image.src = asset(item.profile_image || item.thumbnail_image || item.img);
    image.alt = item.full_name || "";
    image.onerror = () => {
      image.onerror = null;
      image.src = "../assets/img/user.png";
    };

    clone.querySelector(".celeb-name").textContent = item.full_name || "Unknown";
    clone.querySelector(".celeb-meta").textContent = `${item.nationality || "International"} - ${item.profession || "Actress"}`;
    clone.querySelector(".celeb-known").textContent = item.famous_for || item.short_bio || "Celebrity profile";
    const score = Math.round(Number(item.popularity_score || 0));

    updateFollow(button, id);
    button.onclick = event => {
      event.stopPropagation();
      const current = follows();
      const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
      setFollows(next);
      updateFollow(button, id);
      toast(next.includes(id) ? "Celebrity followed" : "Celebrity unfollowed");
    };
    card.onclick = () => location.href = `celebrity.html?id=${id}`;
    return clone;
  }

  function renderSourceMessage() {
    els.count.textContent = "Celebrity data has not been imported yet";
    els.stats.innerHTML = "";
    els.trending.innerHTML = "";
    els.grid.innerHTML = `
      <div class="source-message">
        <h3>Import real celebrity profiles</h3>
        <p>No fake celebrity profiles are shown. Run the celebrity importer once, then reload this page.</p>
        <p>Open <code>http://localhost/MovieDekho/wiki_celebrity_import.php</code> in the browser or run it with PHP.</p>
      </div>
    `;
  }

  function updateFollow(button, id) {
    const active = follows().includes(id);
    button.textContent = active ? "Following" : "Follow";
    button.classList.toggle("following", active);
  }

  function toast(message) {
    const node = document.getElementById("toast");
    node.textContent = message;
    node.classList.add("show");
    setTimeout(() => node.classList.remove("show"), 1600);
  }

  els.search.oninput = event => { state.query = event.target.value.trim(); render(); };
  els.country.onchange = event => { state.country = event.target.value; render(); };
  els.profession.onchange = event => { state.profession = event.target.value; render(); };
  els.sort.onchange = event => { state.sort = event.target.value; render(); };
  load();
});
