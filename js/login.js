
$(document).ready(function () {

  const form = $("form");


  form.find("input").on("input", function () {
    if ($(this).val().trim() !== "") {
      $(this).removeClass("field-error").addClass("field-ok");
    } else {
      $(this).removeClass("field-ok").addClass("field-error");
    }
  });

  
  form.on("submit", function (e) {
    e.preventDefault();

    const email    = form.find('[name="email"]').val().trim();
    const password = form.find('[name="password"]').val().trim();

    if (!email || !password) {
      $("#formMsg").text("Please fill in all fields.").addClass("error-msg");
      return;
    }

    const user = JSON.parse(localStorage.getItem("userAccount"));

    if (!user) {
      $("#formMsg").text("No account found. Please signup first.").addClass("error-msg");
      return;
    }

    if (email === user.email && password === user.password) {

      localStorage.setItem("loggedIn", "true");
      localStorage.setItem("user_name", user.username);
      localStorage.setItem("user_email", user.email);

    
      $("#formMsg").text("Login successful! Redirecting...").removeClass("error-msg").addClass("success-msg");

      setTimeout(() => {
        window.location.href = "mylist.html";
      }, 800);

    } else {
      $("#formMsg").text("Invalid email or password.").addClass("error-msg");
    }

  });

});