document.addEventListener("DOMContentLoaded", async () => {

  const res = await fetch("../movie.json");
  const allData = await res.json();

 
  const movies = allData.filter(m => m.type === "movie");

  const top10Row = document.getElementById("top10Row");
  const trendingRow = document.getElementById("trendingRow");
  const latestRow = document.getElementById("latestRow");
  const topRatedRow = document.getElementById("topRatedRow");
  const categoriesContainer = document.getElementById("categoriesContainer");

  
  function createCard(movie) {
    return `
     <div class="movie-card"
  onclick="window.location.href='../pages/movie.html?id=${movie.id}'">

  <img src="${movie.poster}" alt="${movie.title}">

  <div class="movie-info">
    <h4>${movie.title}</h4>
    <p>⭐ ${movie.rating}</p>
    <p>${movie.genre.join(", ")}</p>
    <span class="review">
      "${movie.reviews?.[0]?.comment || "Great movie"}"
    </span>
  </div>

</div>
        </div>
      </div>
    `;
  }

  
  const top10 = [...movies]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 10);

  top10Row.innerHTML = top10.map(createCard).join("");


  const trending = [...movies]
    .sort(() => 0.5 - Math.random())
    .slice(0, 10);

  trendingRow.innerHTML = trending.map(createCard).join("");

  
  const latest = [...movies]
    .sort((a, b) => b.year - a.year)
    .slice(0, 10);

  latestRow.innerHTML = latest.map(createCard).join("");

  
  const topRated = [...movies]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 10);

  topRatedRow.innerHTML = topRated.map(createCard).join("");

 
  const genreMap = {};

  movies.forEach(movie => {
    movie.genre.forEach(g => {
      if (!genreMap[g]) genreMap[g] = [];
      genreMap[g].push(movie);
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