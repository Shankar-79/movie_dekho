document.addEventListener("DOMContentLoaded", function () {

fetch("../components/navbar.html")
.then(response => {
if(!response.ok){
throw new Error("Navbar not found");
}
return response.text();
})
.then(data => {
document.getElementById("navbar-container").innerHTML = data;

const loginBtn = document.getElementById("profile");
if(loginBtn){
loginBtn.addEventListener("click",()=>{
window.location.href="../pages/login.html";
});
}
})

});
document.addEventListener("DOMContentLoaded", () => {

  const input = document.getElementById("search");

  if (!input) return;

  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const q = input.value.trim();

      if (q) {
        window.location.href = `../pages/movies.html?q=${q}`;
      }
    }
  });

});