const form = document.querySelector("form");

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const email = form.email.value;
  const password = form.password.value;

  const user = JSON.parse(localStorage.getItem("userAccount"));

  if (!user) {
    alert("No account found. Please signup first.");
    return;
  }

  if (email === user.email && password === user.password) {

 
    localStorage.setItem("loggedIn", "true");
    localStorage.setItem("user_name", user.username);
    localStorage.setItem("user_email", user.email);


    window.location.href = "mylist.html";

  } else {
    alert("Invalid email or password");
  }
});