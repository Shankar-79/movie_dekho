$(document).ready(function () {

  const form = $("#signupForm");

 
  form.find("input").on("input", function () {
    const val = $(this).val().trim();

    if (val.length === 0) {
      $(this).removeClass("field-ok").addClass("field-error");
    } else {
      $(this).removeClass("field-error").addClass("field-ok");
    }
  });

  form.on("submit", function (e) {
    e.preventDefault();

    const username = form.find('[name="username"]').val().trim();
    const email    = form.find('[name="email"]').val().trim();
    const password = form.find('[name="password"]').val().trim();

    if (username === "" || email === "" || password === "") {
      $("#signupMsg").text("Please fill all fields.").addClass("error-msg");
      return;
    }

    if (password.length < 4) {
      $("#signupMsg").text("Password must be at least 4 characters.").addClass("error-msg");
      return;
    }

    const userData = { username, email, password };
    localStorage.setItem("userAccount", JSON.stringify(userData));

   
    $("#signupMsg")
      .text("Signup successful! Redirecting to login...")
      .removeClass("error-msg")
      .addClass("success-msg");

    setTimeout(() => {
      window.location.href = "login.html";
    }, 800);

  });

});