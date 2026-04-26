
document.addEventListener("DOMContentLoaded", async () => {

  const res  = await fetch("../data/movie.json");
  const data = await res.json();

  const shows = data.filter(m => m.type === "series");

  const top    = document.getElementById("top");
  const trend  = document.getElementById("trend");
  const latest = document.getElementById("latest");
  const rated  = document.getElementById("rated");
  const cat    = document.getElementById("cat");

  const cardTemp = document.getElementById("card");
  const catTemp  = document.getElementById("category");

  function card(show) {
    const c   = cardTemp.content.cloneNode(true);
    const box = c.querySelector(".movie-card");

    c.querySelector(".poster").src   = show.poster;
    c.querySelector(".title").textContent  = show.title;
    c.querySelector(".rating").textContent = `⭐ ${show.rating}`;
    c.querySelector(".genre").textContent  = show.genre.join(", ");
    c.querySelector(".review").textContent =
      `"${show.reviews?.[0]?.comment || "Great show"}"`;

    box.onclick = () => {
      window.location.href = `../pages/movie.html?id=${show.id}`;
    };

    return c;
  }

  function render(el, list) {
    el.innerHTML = "";
    list.forEach(s => el.appendChild(card(s)));
  }

  render(top,    [...shows].sort((a, b) => b.rating - a.rating).slice(0, 10));
  render(trend,  [...shows].sort(() => 0.5 - Math.random()).slice(0, 10));
  render(latest, [...shows].sort((a, b) => b.year - a.year).slice(0, 10));
  render(rated,  [...shows].sort((a, b) => b.rating - a.rating).slice(0, 10));

  const map = {};
  shows.forEach(s => {
    s.genre.forEach(g => {
      if (!map[g]) map[g] = [];
      map[g].push(s);
    });
  });

  Object.keys(map).forEach(g => {
    const c   = catTemp.content.cloneNode(true);
    const row = c.querySelector(".cat-row");

    c.querySelector(".cat-title").textContent = g;
    map[g].slice(0, 10).forEach(s => row.appendChild(card(s)));
    cat.appendChild(c);
  });



  $("#searchInput").on("input", function () {
    const q = $(this).val().toLowerCase().trim();

    $(".movie-card").each(function () {
      const title = $(this).find(".title").text().toLowerCase();
      const genre = $(this).find(".genre").text().toLowerCase();

      if (title.includes(q) || genre.includes(q)) {
        $(this).show();
      } else {
        $(this).hide();
      }
    });
  });


  $(window).on("scroll", function () {
    if ($(this).scrollTop() > 60) {
      $(".navbar").addClass("scrolled");
    } else {
      $(".navbar").removeClass("scrolled");
    }

  
    if ($(this).scrollTop() > 300) {
      $("#backToTop").fadeIn(200);
    } else {
      $("#backToTop").fadeOut(200);
    }
  });

 
  $("body").append('<button id="backToTop" title="Back to top">&#8679;</button>');
  $("#backToTop").hide();

  $("#backToTop").on("click", function () {
    $("html, body").animate({ scrollTop: 0 }, 400);
  });

});