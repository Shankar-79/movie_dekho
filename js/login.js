

$(document).ready(function () {

  const form = $("form");


  form.find("input").on("input", function () {
    if ($(this).val().trim() !== "") {
      $(this).removeClass("field-error").addClass("field-ok");
    } else {
      $(this).removeClass("field-ok").addClass("field-error");
    }
  });

  // Submit → AJAX to api.php?action=login
  form.on("submit", function (e) {
    e.preventDefault();

    const email    = form.find('[name="email"]').val().trim();
    const password = form.find('[name="password"]').val().trim();

    if (!email || !password) {
      $("#formMsg").text("Please fill in all fields.").attr("class", "error-msg");
      return;
    }

    $.ajax({
      url:         "../api.php?action=login",
      method:      "POST",
      contentType: "application/json",
      data:        JSON.stringify({ email, password }),
      success: function (res) {
        if (res.success) {
          clearUserScopedStorage();
          localStorage.setItem("loggedIn",   "true");
          localStorage.setItem("user_id",    res.user.id);
          localStorage.setItem("user_name",  res.user.username);
          localStorage.setItem("user_email", res.user.email);
          $("#formMsg").text("Login successful! Redirecting...").attr("class", "success-msg");
          setTimeout(() => { window.location.href = "mylist.html"; }, 800);
        } else {
          $("#formMsg").text(res.message).attr("class", "error-msg");
        }
      },
      error: function () {
        $("#formMsg").text("Server error. Is XAMPP running?").attr("class", "error-msg");
      }
    });
  });

  function clearUserScopedStorage() {
    Object.keys(localStorage).forEach(key => {
      if (
        key === "movieDekhoWatchlist" ||
        key === "movieDekhoLiked" ||
        key === "movieDekhoProfile" ||
        key === "movieDekhoFollowedCelebs" ||
        key === "movieDekhoFavoriteCelebs" ||
        key === "movieDekhoCelebrityMailPrefs" ||
        key.startsWith("reviews_") ||
        key.startsWith("celebrityComments_")
      ) {
        localStorage.removeItem(key);
      }
    });
  }

});
