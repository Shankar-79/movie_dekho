

$(document).ready(function () {

  const form = $("#signupForm");


  form.find("input").on("input", function () {
    if ($(this).val().trim() !== "") {
      $(this).removeClass("field-error").addClass("field-ok");
    } else {
      $(this).removeClass("field-ok").addClass("field-error");
    }
  });

  
  form.on("submit", function (e) {
    e.preventDefault();

    const username = form.find('[name="username"]').val().trim();
    const email    = form.find('[name="email"]').val().trim();
    const password = form.find('[name="password"]').val().trim();

    if (!username || !email || !password) {
      $("#signupMsg").text("Please fill all fields.").attr("class", "error-msg");
      return;
    }
    if (password.length < 4) {
      $("#signupMsg").text("Password must be at least 4 characters.").attr("class", "error-msg");
      return;
    }

    $.ajax({
      url:         "../api.php?action=signup",
      method:      "POST",
      contentType: "application/json",
      data:        JSON.stringify({ username, email, password }),
      success: function (res) {
        if (res.success) {
          $("#signupMsg").text("Signup successful! Redirecting...").attr("class", "success-msg");
          setTimeout(() => { window.location.href = "login.html"; }, 800);
        } else {
          $("#signupMsg").text(res.message).attr("class", "error-msg");
        }
      },
      error: function () {
        $("#signupMsg").text("Server error. Is XAMPP running?").attr("class", "error-msg");
      }
    });
  });

});