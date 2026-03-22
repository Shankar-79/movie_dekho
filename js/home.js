document.addEventListener("DOMContentLoaded", () => {

  async function loadMovies() {
    try {
      const res = await fetch("../movie.json");
      const movies = await res.json();
      renderMovies(movies);
    } catch (err) {
      console.error("Error loading movie data:", err);
    }
  }

  function renderMovies(movies) {

    const openingRow = document.getElementById("openingRow");
    const moviesGrid = document.getElementById("moviesGrid");

    const topTemplate = document.getElementById("top-movie-template");
    const upcomingTemplate = document.getElementById("upcoming-template");

    const trending = [...movies].sort((a, b) => b.rating - a.rating).slice(0, 5);
    const latest = [...movies].sort((a, b) => b.year - a.year).slice(0, 5);
    const upcoming = movies.filter(m => m.year === 2026).slice(0, 10);
    const top10 = [...movies].sort((a, b) => b.rating - a.rating).slice(0, 10);

    const heroMix = [...trending,  ...upcoming]
      .sort(() => 0.5 - Math.random())
      .slice(0, 10);
    const heroCard = document.getElementById("heroCard");
    const heroTitle = document.getElementById("heroTitle");
    const heroInfo = document.getElementById("heroInfo");
    const heroDesc = document.getElementById("heroDesc");
    const heroSection = document.querySelector(".hero-section");
    const detailsBtn = document.querySelector(".details-btn");
const reviewBtn = document.querySelector(".review-btn");

    let index = 0;

    function updateHero() {
      const movie = heroMix[index];

      heroCard.style.opacity = 0;

      setTimeout(() => {

        heroTitle.textContent = movie.title;
        heroInfo.textContent =
          `⭐ ${movie.rating} • ${movie.year} • ${movie.genre.join(", ")}`;
        heroDesc.textContent = movie.description;

        heroCard.style.background =
          `url(${movie.backdrop}) no-repeat center/cover`;

        const [c1, c2] = movie.gradient || ["#0f0c29", "#302b63"];

        heroSection.style.background =
          `linear-gradient(to bottom, ${c1}, ${c2}, #000)`;
            detailsBtn.onclick = () => {
      window.location.href = `../pages/movie.html?id=${movie.id}`;
    };

    reviewBtn.onclick = () => {
      window.location.href = `../pages/movie.html?id=${movie.id}#reviews`;
    };

        heroCard.style.opacity = 1;

        index = (index + 1) % heroMix.length;

      }, 300);
    }

    updateHero();
    setInterval(updateHero, 5000);

    if (openingRow) {
      openingRow.innerHTML = "";

      upcoming.forEach(movie => {
        const clone = upcomingTemplate.content.cloneNode(true);

        const card = clone.querySelector(".upcoming-card");

        clone.querySelector(".upcoming-poster").src = movie.poster;
        clone.querySelector(".upcoming-title").textContent = movie.title;
        clone.querySelector(".upcoming-rating").textContent = `⭐ ${movie.rating}`;

        card.onclick = () => {
          window.location.href = `../pages/movie.html?id=${movie.id}`;
        };

        openingRow.appendChild(clone);
      });
    }

    if (moviesGrid) {
      moviesGrid.innerHTML = "";

      top10.forEach((movie, i) => {
        const clone = topTemplate.content.cloneNode(true);

        const card = clone.querySelector(".top-card");

        clone.querySelector(".rank-badge").textContent = `#${i + 1}`;
        clone.querySelector(".top-poster").src = movie.poster;
        clone.querySelector(".top-title").textContent = movie.title;
        clone.querySelector(".top-meta").textContent =
          `${movie.year} • ${movie.genre.join(", ")}`;
        clone.querySelector(".top-rating").textContent = `⭐ ${movie.rating}`;
        clone.querySelector(".top-desc").textContent =
          movie.description.slice(0, 90) + "...";

        card.onclick = () => {
          window.location.href = `../pages/movie.html?id=${movie.id}`;
        };

        moviesGrid.appendChild(clone);
      });
    }
  }

  loadMovies();
  const actorsData = [
    { name: "Zendaya", followers: 184000000, img: "zendaya.jpeg" },
    { name: "Tom Holland", followers: 67000000, img: "tomholland.jpeg" },
    { name: "Brad Pitt", followers: 23000000, img: "bradpitt.jpeg" },
    { name: "Ryan Reynolds", followers: 52000000, img: "ryanreynolds.jpeg" },
    { name: "Emma Stone", followers: 31000000, img: "emmastone.jpeg" },
    { name: "Scarlett Johansson", followers: 57000000, img: "scarlettjohansson.jpeg" },
    { name: "Chris Hemsworth", followers: 59000000, img: "chrishemsworth.jpeg" },
    { name: "Margot Robbie", followers: 28000000, img: "margotrobbie.jpeg" },
    { name: "Robert Downey Jr.", followers: 97000000, img: "robatdowneyjr.jpeg" },
    { name: "Keanu Reeves", followers: 42000000, img: "keanureeves.jpeg" },
    { name: "Jennifer Lawrence", followers: 36000000, img: "jenniferlawrence.jpeg" },
    { name: "Gal Gadot", followers: 108000000, img: "galgadot.jpeg" },
    { name: "Dwayne Johnson", followers: 395000000, img: "dwayne.jpeg" },
    { name: "Leonardo DiCaprio", followers: 65000000, img: "leonardodicaprio.jpeg" },
    { name: "Chris Evans", followers: 84000000, img: "chrisevans.jpeg" }
  ];

  const actorRow = document.querySelector(".celebs-row");
  const celebTemplate = document.getElementById("celeb-template");

  if (actorRow) {
    actorsData.sort((a, b) => b.followers - a.followers);

    const topActors = actorsData.slice(0, 10);

    actorRow.innerHTML = "";

    topActors.forEach((actor, i) => {
      const clone = celebTemplate.content.cloneNode(true);

      clone.querySelector(".celeb-img").src =
        `../assets/actors/${actor.img}`;

      clone.querySelector(".rank").textContent =
        `${i + 1} ▲ ${actor.followers.toLocaleString()}`;

      clone.querySelector(".celeb-name").textContent = actor.name;

      actorRow.appendChild(clone);
    });
  }

});