
function getList() {
  return JSON.parse(localStorage.getItem("watchlist")) || [];
}

function toggleWatchlist(id, btn) {
  let list = getList();

  if (list.includes(id)) {
    list = list.filter(x => x !== id);
    $(btn).text("♡");
  } else {
    list.push(id);
    $(btn).text("❤️");
  }

  localStorage.setItem("watchlist", JSON.stringify(list));
}


function isInWatchlist(id) {
  return getList().includes(id);
}


$(document).ready(function () {
  $(".watchlist-btn").each(function () {
    const id = $(this).data("id");

    if (isInWatchlist(id)) {
      $(this).text("❤️");
    } else {
      $(this).text("♡");
    }

  
    $(this).on("click", function () {
      toggleWatchlist(id, this);
    });
  });
});