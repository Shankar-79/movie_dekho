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
