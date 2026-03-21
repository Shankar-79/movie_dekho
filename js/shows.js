document.addEventListener("DOMContentLoaded", async () => {

  const res = await fetch("../movie.json");
  const allData = await res.json();

  
  const shows = allData.filter(m => m.type === "series");

  const top10Row = document.getElementById("top10Row");
  const trendingRow = document.getElementById("trendingRow");
  const latestRow = document.getElementById("latestRow");
  const topRatedRow = document.getElementById("topRatedRow");
  const categoriesContainer = document.getElementById("categoriesContainer");


  function createCard(show) {
    return `
      <div class="movie-card"
      onclick="window.location.href='../pages/movie.html?id=${show.id}'">
        <img src="${show.poster}" alt="${show.title}">
        <div class="movie-info">
          <h4>${show.title}</h4>
          <p>⭐ ${show.rating}</p>
          <p>${show.genre.join(", ")}</p>
          <span class="review">
            "${show.reviews?.[0]?.comment || "Great show"}"
          </span>
        </div>
      </div>
    `;
  }


  const top10 = [...shows]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 10);

  top10Row.innerHTML = top10.map(createCard).join("");

  
  const trending = [...shows]
    .sort(() => 0.5 - Math.random())
    .slice(0, 10);

  trendingRow.innerHTML = trending.map(createCard).join("");


  const latest = [...shows]
    .sort((a, b) => b.year - a.year)
    .slice(0, 10);

  latestRow.innerHTML = latest.map(createCard).join("");

 
  const topRated = [...shows]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 10);

  topRatedRow.innerHTML = topRated.map(createCard).join("");


  const genreMap = {};

  shows.forEach(show => {
    show.genre.forEach(g => {
      if (!genreMap[g]) genreMap[g] = [];
      genreMap[g].push(show);
    });
  });

  Object.keys(genreMap).forEach(genre => {
    const list = genreMap[genre].slice(0, 10);

    categoriesContainer.innerHTML += `
      <div class="category-block">
        <h2 class="section-title">${genre}</h2>
        <div class="category-row">
          ${list.map(createCard).join("")}
        </div>
      </div>
    `;
  });

});