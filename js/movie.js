document.addEventListener("DOMContentLoaded", async () => {

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  const res = await fetch("../movie.json");
  const movies = await res.json();

  let movie = movies.find(m => m.id == id);

  if (!movie) return;

  const storageKey = "reviews_" + id;


  let savedReviews = JSON.parse(localStorage.getItem(storageKey)) || [];
  movie.reviews = [...(movie.reviews || []), ...savedReviews];


  document.querySelector(".movie-hero").style.background =
    `url(${movie.backdrop}) center/cover`;

  document.getElementById("title").textContent = movie.title;

  document.getElementById("info").textContent =
    `⭐ ${movie.rating} • ${movie.year} • ${movie.genre.join(", ")}`;

 document.getElementById("description").textContent =
  movie.ldescription || movie.description;

 document.getElementById("trailer").src = movie.trailer;


  const reviewsDiv = document.getElementById("reviews");

  function renderReviews() {
    reviewsDiv.innerHTML = "";

    movie.reviews.forEach(r => {
      reviewsDiv.innerHTML += `
        <p>⭐ ${r.rating} - ${r.comment}</p>
      `;
    });
  }

  renderReviews();

  
  let selectedRating = 0;
  const starsContainer = document.getElementById("ratingStars");

  starsContainer.innerHTML = "";

  for (let i = 1; i <= 5; i++) {
    const star = document.createElement("span");
    star.textContent = "★";

    star.onclick = () => {
      selectedRating = i;
      document.querySelectorAll("#ratingStars span").forEach((s, idx) => {
        s.classList.toggle("active", idx < i);
      });
    };

    starsContainer.appendChild(star);
  }

  
  document.getElementById("submitReview").onclick = () => {
    const text = document.getElementById("reviewInput").value;

    if (!text || selectedRating === 0) {
      alert("Give rating & review");
      return;
    }

    const newReview = {
      rating: selectedRating,
      comment: text
    };

    movie.reviews.push(newReview);

    
    savedReviews.push(newReview);
    localStorage.setItem(storageKey, JSON.stringify(savedReviews));

    renderReviews();

    document.getElementById("reviewInput").value = "";
  };

  
  const relatedDiv = document.getElementById("relatedMovies");

  const related = movies
    .filter(m => m.genre.some(g => movie.genre.includes(g)) && m.id != movie.id)
    .slice(0, 10);

  related.forEach(r => {
    relatedDiv.innerHTML += `
      <img src="${r.poster}" onclick="location.href='movie.html?id=${r.id}'">
    `;
  });

});