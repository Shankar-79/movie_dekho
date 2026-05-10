const MOVIEDEKHO_WATCHLIST_KEY = "movieDekhoWatchlist";

function getLocalWatchlist() {
  try {
    return (JSON.parse(localStorage.getItem(MOVIEDEKHO_WATCHLIST_KEY)) || []).map(Number);
  } catch (err) {
    return [];
  }
}

function setLocalWatchlist(ids) {
  localStorage.setItem(MOVIEDEKHO_WATCHLIST_KEY, JSON.stringify([...new Set(ids.map(Number))]));
}

function updateLegacyWatchButton(btn, saved) {
  if (!btn) return;
  btn.textContent = saved ? "Saved" : "Save";
  btn.classList.toggle("saved", saved);
}

function toggleWatchlist(id, btn) {
  const movieId = Number(id);
  const current = getLocalWatchlist();
  const adding = !current.includes(movieId);
  const next = adding ? [...current, movieId] : current.filter(item => item !== movieId);

  setLocalWatchlist(next);
  updateLegacyWatchButton(btn, adding);

  fetch("../api.php?action=watchlist_toggle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ movie_id: movieId })
  }).catch(() => {});
}

document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".watchlist-btn");
  if (!buttons.length) return;

  const localIds = getLocalWatchlist();
  buttons.forEach(btn => {
    const id = Number(btn.dataset.id);
    updateLegacyWatchButton(btn, localIds.includes(id));
    btn.onclick = () => toggleWatchlist(id, btn);
  });

  fetch("../api.php?action=watchlist_get")
    .then(res => res.json())
    .then(res => {
      if (!res.success || !Array.isArray(res.watchlist)) return;
      const apiIds = res.watchlist.map(Number);
      setLocalWatchlist(apiIds);
      buttons.forEach(btn => updateLegacyWatchButton(btn, apiIds.includes(Number(btn.dataset.id))));
    })
    .catch(() => {});
});
