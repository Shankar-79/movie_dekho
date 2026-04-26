

document.addEventListener("DOMContentLoaded", async () => {

  const id  = new URLSearchParams(location.search).get("id");
  const res = await fetch("../data/movie.json");
  const data = await res.json();

  let m = data.find(x => x.id == id);
  if (!m) return;

  document.getElementById("hero").style.background =
    `url(${m.backdrop}) center/cover`;

  document.getElementById("t").textContent = m.title;
  document.getElementById("i").textContent =
    `⭐ ${m.rating} • ${m.year} • ${m.genre.join(", ")}`;
  document.getElementById("d").textContent =
    m.ldescription || m.description;
  document.getElementById("trailer").src = m.trailer;

  const key   = "reviews_" + id;
  let saved   = JSON.parse(localStorage.getItem(key)) || [];
  m.reviews   = [...(m.reviews || []), ...saved];

  const box     = document.getElementById("reviews");
  const temp    = document.getElementById("rev-temp");
  const watchBtn = document.getElementById("watchBtn");

  function getWatchlist() {
    return JSON.parse(localStorage.getItem("watchlist")) || [];
  }

  function saveWatchlist(list) {
    localStorage.setItem("watchlist", JSON.stringify(list));
  }

  
  function updateWatchBtn() {
    const list = getWatchlist();
    if (list.includes(m.id)) {
      $("#watchBtn").text("❤️ Added");
    } else {
      $("#watchBtn").text("🤍 Add to Watchlist");
    }
  }

  // ── jQuery Feature 2: Watchlist toggle with .on("click") ──
  $("#watchBtn").on("click", function () {
    let list = getWatchlist();

    if (list.includes(m.id)) {
      list = list.filter(x => x !== m.id);
    } else {
      list.push(m.id);
    }

    saveWatchlist(list);
    updateWatchBtn();
  });

  updateWatchBtn();

  function showReviews() {
    box.innerHTML = "";
    m.reviews.forEach(r => {
      const c = temp.content.cloneNode(true);
      c.querySelector("p").textContent = `⭐ ${r.rating} - ${r.comment}`;
      box.appendChild(c);
    });
  }

  showReviews();

  let rate = 0;
  const stars = document.getElementById("stars");

  for (let i = 1; i <= 5; i++) {
    const s = document.createElement("span");
    s.textContent = "★";

    // ── jQuery Feature 3: Star rating highlight with .addClass / .removeClass ──
    s.onclick = () => {
      rate = i;
      $("#stars span").each(function (idx) {
        if (idx < i) {
          $(this).addClass("active");
        } else {
          $(this).removeClass("active");
        }
      });
    };

    stars.appendChild(s);
  }

  // ── jQuery Feature 4: Review submit with .on("click") + .val() ──
  $("#btn").on("click", function () {
    const text = $("#inp").val().trim();

    if (!text || rate === 0) {
      alert("Give rating & review");
      return;
    }

    const obj = { rating: rate, comment: text };
    m.reviews.push(obj);
    saved.push(obj);

    localStorage.setItem(key, JSON.stringify(saved));
    showReviews();

    // ── jQuery Feature 5: Clear input with .val("") ──
    $("#inp").val("");
  });

  const rel     = document.getElementById("rel");
  const relTemp = document.getElementById("rel-temp");

  const list = data
    .filter(x => x.genre.some(g => m.genre.includes(g)) && x.id != m.id)
    .slice(0, 10);

  list.forEach(r => {
    const c   = relTemp.content.cloneNode(true);
    const img = c.querySelector("img");
    img.src   = r.poster;

    img.onclick = () => {
      location.href = `movie.html?id=${r.id}`;
    };

    rel.appendChild(c);
  });

});