document.addEventListener("DOMContentLoaded", async () => {

  const res = await fetch("../movie.json");
  const allData = await res.json();

  const movies = allData.filter(m => m.type === "movie");

  const top10Row = document.getElementById("top10Row");
  const trendingRow = document.getElementById("trendingRow");
  const latestRow = document.getElementById("latestRow");
  const topRatedRow = document.getElementById("topRatedRow");
  const categoriesContainer = document.getElementById("categories");

  const cardTemplate = document.getElementById("moviecard");
  const categoryTemplate = document.getElementById("category");

  function createCard(movie) {
    const clone = cardTemplate.content.cloneNode(true);

    const card = clone.querySelector(".movie-card");

    clone.querySelector(".movie-poster").src = movie.poster;
    clone.querySelector(".movie-title").textContent = movie.title;
    clone.querySelector(".movie-rating").textContent = `⭐ ${movie.rating}`;
    clone.querySelector(".movie-genre").textContent = movie.genre.join(", ");
    clone.querySelector(".review").textContent =
      `"${movie.reviews?.[0]?.comment || "Great movie"}"`;

    card.onclick = () => {
      window.location.href = `../pages/movie.html?id=${movie.id}`;
    };

    return clone;
  }
  function renderList(container, list) {
    container.innerHTML = "";
    list.forEach(movie => {
      container.appendChild(createCard(movie));
    });
  }


  const top10 = [...movies]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 10);

  renderList(top10Row, top10);

  const trending = [...movies]
    .sort(() => 0.5 - Math.random())
    .slice(0, 10);

  renderList(trendingRow, trending);

  const latest = [...movies]
    .sort((a, b) => b.year - a.year)
    .slice(0, 10);

  renderList(latestRow, latest);

  const topRated = [...movies]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 10);

  renderList(topRatedRow, topRated);


  const genreMap = {};

  movies.forEach(movie => {
    movie.genre.forEach(g => {
      if (!genreMap[g]) genreMap[g] = [];
      genreMap[g].push(movie);
    });
  });

  Object.keys(genreMap).forEach(genre => {

    const clone = categoryTemplate.content.cloneNode(true);

    const title = clone.querySelector(".category-title");
    const row = clone.querySelector(".category-row");

    title.textContent = genre;

    genreMap[genre].slice(0, 10).forEach(movie => {
      row.appendChild(createCard(movie));
    });

    categoriesContainer.appendChild(clone);
  });

});