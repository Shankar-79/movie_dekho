document.addEventListener("DOMContentLoaded", async () => {

  if (localStorage.getItem("loggedIn") !== "true") {
    window.location.href = "../pages/login.html";
    return;
  }

  const name = localStorage.getItem("user_name") || "Guest";
  const email = localStorage.getItem("user_email") || "Not set";

  document.getElementById("name").textContent = "Name: " + name;
  document.getElementById("email").textContent = "Email: " + email;

  const res = await fetch("../data/movie.json");
  const data = await res.json();

  // 🔥 FIX 1: always ensure numbers
  const ids = (JSON.parse(localStorage.getItem("watchlist")) || []).map(Number);

  document.getElementById("count").textContent =
    "Watchlist: " + ids.length;

  // 🔥 FIX 2: match properly
  const list = data.filter(m => ids.includes(Number(m.id)));

  const box = document.getElementById("list");
  const temp = document.getElementById("card");
  const empty = document.getElementById("empty");

  box.innerHTML = ""; // 🔥 clear first

  if (list.length === 0) {
    box.appendChild(empty.content.cloneNode(true));
  } else {
    list.forEach(m => {
      const c = temp.content.cloneNode(true);

      c.querySelector(".poster").src = m.poster;
      c.querySelector(".title").textContent = m.title;
      c.querySelector(".rating").textContent = `⭐ ${m.rating}`;
      c.querySelector(".genre").textContent = m.genre.join(", ");

      c.querySelector(".movie-card").onclick = () => {
        location.href = `movie.html?id=${m.id}`;
      };

      box.appendChild(c);
    });
  }

  document.getElementById("logout").onclick = () => {
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_email");

    window.location.href = "../pages/login.html";
  };

});