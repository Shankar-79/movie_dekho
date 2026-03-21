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

    const trending = [...movies]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5);

   
    const upcoming = movies
  .filter(m => m.year === 2026)
  .slice(0, 10);

    
    const top10 = [...movies]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 10);

    
    const heroCard = document.getElementById("heroCard");
    const heroTitle = document.getElementById("heroTitle");
    const heroInfo = document.getElementById("heroInfo");
    const heroDesc = document.getElementById("heroDesc");
    const heroSection = document.querySelector(".hero-section");

    let index = 0;


   function updateHero() {
  const movie = trending[index];

  heroCard.style.opacity = 0;

  setTimeout(() => {
    
    heroTitle.textContent = movie.title;
    heroInfo.textContent = `⭐ ${movie.rating} • ${movie.year} • ${movie.genre.join(", ")}`;
    heroDesc.textContent = movie.description;


    heroCard.style.background = `
      url(${movie.backdrop}) no-repeat center/cover
    `;

    
    const [c1, c2] = movie.gradient || ["#0f0c29", "#302b63"];

    heroSection.style.background = `
      linear-gradient(to bottom, ${c1}, ${c2}, #000)
    `;

    heroCard.style.opacity = 1;

    index = (index + 1) % trending.length;
  }, 300);
}
    updateHero();
    setInterval(updateHero, 5000);



if (openingRow) {
  openingRow.innerHTML = "";

  upcoming.forEach(movie => {
    openingRow.innerHTML += `
      <div class="upcoming-card" 
          onclick="window.location.href='../pages/movie.html?id=${movie.id}'">

        <img src="${movie.poster}" alt="${movie.title}">
        <div class="upcoming-info">
          <p>⭐ ${movie.rating}</p>
          <h4>${movie.title}</h4>
        </div>
      </div>
    `;
  });
}
    
    if (moviesGrid) {
      moviesGrid.innerHTML = "";

      top10.forEach((movie, i) => {
        moviesGrid.innerHTML += `
          <div class="top-card"
              onclick="window.location.href='../pages/movie.html?id=${movie.id}'">
            <span class="rank-badge">#${i + 1}</span>

            <img src="${movie.poster}" alt="${movie.title}">

            <div class="top-info">
              <h4>${movie.title}</h4>
              <p>${movie.year} • ${movie.genre.join(", ")}</p>
              <p>⭐ ${movie.rating}</p>
              <p>${movie.description.slice(0, 90)}...</p>
            </div>
          </div>
        `;
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

  if (actorRow) {
    actorsData.sort((a, b) => b.followers - a.followers);

    const topActors = actorsData.slice(0, 10);

    actorRow.innerHTML = "";

    topActors.forEach((actor, i) => {
      actorRow.innerHTML += `
        <div class="celeb-card">
          <img src="../assets/actors/${actor.img}" alt="${actor.name}">
          <div class="plus">+</div>
          <p class="rank">${i + 1} ▲ ${actor.followers.toLocaleString()}</p>
          <h4>${actor.name}</h4>
        </div>
      `;
    });
  }

});


