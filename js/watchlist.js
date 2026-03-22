function getList(){
  return JSON.parse(localStorage.getItem("watchlist")) || [];
}

function toggleWatchlist(id, btn){
  let list = getList();

  if(list.includes(id)){
    list = list.filter(x => x !== id);
    btn.textContent = "♡";
  }else{
    list.push(id);
    btn.textContent = "❤️";
  }

  localStorage.setItem("watchlist", JSON.stringify(list));
}

function isInWatchlist(id){
  return getList().includes(id);
}