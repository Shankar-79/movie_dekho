$(document).ready(async function () {


  const isLoggedIn = localStorage.getItem("loggedIn") === "true";

  if (isLoggedIn) {
    $("#loginBtn").hide();
    $("#logout").show();
  } else {
    $("#loginBtn").show();
    $("#logout").hide();
  }

  if (!isLoggedIn) {
    window.location.href = "../pages/login.html";
    return;
  }

 
  const name = localStorage.getItem("user_name") || "Guest";
  const email = localStorage.getItem("user_email") || "Not set";

  $("#name").text("Name: " + name);
  $("#email").text("Email: " + email);


  const res = await fetch("../data/movie.json");
  const data = await res.json();


  const ids = (JSON.parse(localStorage.getItem("watchlist")) || []).map(Number);

  $("#count").text("Watchlist: " + ids.length);


  const list = data.filter(m => ids.includes(Number(m.id)));

  const box = document.getElementById("list");
  const temp = document.getElementById("card");
  const empty = document.getElementById("empty");

  box.innerHTML = "";

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
        window.location.href = `movie.html?id=${m.id}`;
      };

      box.appendChild(c);
    });
  }


  $("#logout").on("click", function () {
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_email");

    $("#loginBtn").show();
    $("#logout").hide();

    window.location.href = "../pages/login.html";
  });

});