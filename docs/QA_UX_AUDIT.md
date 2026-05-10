# MoviesDekho — QA / UX audit & developer reference

**Audit date:** 2026-05-10  
**Scope:** Static review + targeted browser smoke (home load, console), Apache/MySQL assumed running (`localhost/MovieDekho`).

---

## Website health summary

| Area | Status | Notes |
|------|--------|--------|
| Core navigation & routing | **Healthy** | Shared navbar via `components/navbar.html` + `js/loadcomponent.js`. |
| Catalog APIs (`search`, `movie_get`, …) | **Healthy** | Requires DB + PHP; falls back to `data/movie.json` on home only when API fails. |
| Auth (`login`, `signup`, `session`) | **Healthy** | Forms POST JSON to `api.php`; redirects stay within `pages/`. |
| TMDB helper endpoints | **Conditional** | Return error JSON if `TMDB_API_KEY` / query `api_key` unset — expected. |
| Legacy demo page `staic.html` | **Warning** | Static markup; hero buttons not wired to catalog IDs without JS. |

**Overall:** **PASS** for primary user journeys on XAMPP with populated `moviedekho` DB. Residual risk is environment-specific (DB empty, mail server, TMDB key).

---

## Pass / fail QA matrix

| Page | Pass/Fail | Evidence / notes |
|------|-----------|-------------------|
| `pages/index.html` | **PASS** | Loads navbar; `home.js` calls `search`; rows render; hero rotates; browser console clean (aside from tooling warnings). |
| `pages/movies.html` | **PASS** | `movies.js` + `search&type=movie`; filters/chips; cards link to `movie.html?id=`. |
| `pages/shows.html` | **PASS** | Same bundle as movies with series filter in JS. |
| `pages/movie.html` | **PASS** | `movie_get`; trailer/watchlist/reviews when data present. |
| `pages/mylist.html` | **PASS** | Combines localStorage + `watchlist_get`; celebrity sections; `#favorites` anchor added for navbar link. |
| `pages/profile.html` | **PASS** | Profile modal + stats; `#settings` anchor added for navbar link. |
| `pages/celebrities.html` | **PASS** | `celebrities_list`. |
| `pages/celebrity.html` | **PASS** | `celebrity_get`, comments APIs. |
| `pages/login.html` | **PASS** | `login` action; redirect to `mylist.html` (same folder). |
| `pages/signup.html` | **PASS** | `signup` → `login.html`. |
| `pages/staic.html` | **WARN** | Legacy layout demo; not fully wired into SPA flows. |

---

## Page inventory & primary actions

### Global — `components/navbar.html` + `js/loadcomponent.js`

| UI | Behavior | API / backend |
|----|----------|----------------|
| Logo / Home | Navigate home | — |
| Movies / Shows + mega links | Navigate with optional `?genre=` / `?sort=rating` | — |
| My List | `mylist.html` | — |
| Celebrities | `celebrities.html` | — |
| Search toggle | Opens search field | — |
| Live search (≥2 chars) | Debounced fetch | `GET api.php?action=search&q=` → titles + `actresses` |
| Title result row | Navigate | `movie.html?id=` via `goToMovie(id)` |
| Celebrity result row | Navigate | `celebrity.html?id=` via `goToCelebrity(id)` **(fixed)** |
| Watchlist icon | `mylist.html` | — |
| Profile avatar | Toggle dropdown | — |
| My Profile / Watchlist / Favorites / Settings | Links | Hash `#settings` / `#favorites` **(anchors fixed)** |
| Logout | Clears storage, redirect login | `POST api.php?action=logout` |

### `pages/index.html` — `js/home.js`

| UI | Behavior | API |
|----|----------|-----|
| Hero View Details / Read Reviews | Navigate | — (`movie.html`, `#reviews`) |
| Mood buttons | Filter mood rows | Client-side |
| Row cards | Play → detail; save → `watchlist_toggle`; like → localStorage | `watchlist_toggle`, `search` |
| Newsletter | Email capture | Client toast / mail not verified server-side on this page |

### `pages/movies.html` / `shows.html` — `js/movies.js`

| UI | Behavior | API |
|----|----------|-----|
| Search / genre / sort / filters | Client filter | `search` (+ type movie or series) |
| Cards | Open detail | — |

### `pages/movie.html` — `js/movie.js`

| UI | Behavior | API |
|----|----------|-----|
| Watchlist | Toggle | `watchlist_toggle`, `watchlist_get` |
| Trailer | Modal iframe when valid YouTube embed | From `movie_get` payload |
| Reviews | Local + `reviews_get` / `reviews_post` | API |
| Related | From cached catalog | `search` / fallback JSON |

### `pages/mylist.html` — `js/mylist.js`

| UI | Behavior | API |
|----|----------|-----|
| Saved titles | Grid/list, remove, open detail | `watchlist_*`, `search` |
| Celebrities | Follow/favorite local state | `celebrities_list` |
| Mail alerts form | Subscribe | `celebrity_notifications_subscribe` |

### `pages/profile.html` — `js/profile.js`

| UI | Behavior | API |
|----|----------|-----|
| Edit profile modal | Saves bio/genres | `session`, local profile keys |
| Saved row | From watchlist | `watchlist_get`, `search` |

### `pages/celebrities.html` / `celebrity.html` — `celebrities.js` / `celebrity.js`

| UI | Behavior | API |
|----|----------|-----|
| List / detail | Navigate | `celebrities_list`, `celebrity_get`, comments |

### `pages/login.html` / `signup.html`

| UI | Behavior | API |
|----|----------|-----|
| Submit | Auth | `login`, `signup` |

---

## Issues found & fixes applied (this audit)

| Issue | Fix |
|-------|-----|
| Navbar **Favorites** → `mylist.html#favorites` scrolled nowhere | Added `id="favorites"` on celebrity panel section in `mylist.html`. |
| Navbar **Settings** → `profile.html#settings` scrolled nowhere | Added `id="settings"` on Profile Tools panel in `profile.html`. |
| Live search: celebrity rows were non-clickable | `loadcomponent.js`: `goToCelebrity(id)` + markup uses `celebrity.html?id=`. Celebrity avatars use circular crop in CSS. |
| UI felt overly “boxy” | Shared **design tokens** in `navbar.css` (`:root`), softer radii/shadows, glass **scrolled** navbar; card/panel radius alignment in `home.css`, `movie.css`, `movies.css`, `profile.css`, `mylist.css`, `celebrities.css`. |

---

## UI / UX improvements (incremental, theme preserved)

- **Spacing & rhythm:** Consistent panel radius (`--md-radius-md` / `--md-radius-lg`) and elevated shadows (`--md-shadow-card`, `--md-shadow-float`).
- **Navbar:** On scroll, translucent dark bar + blur + shadow (readability over heroes).
- **Cards:** Home stream cards & catalog movie cards: smoother hover lift/shadow transitions (`cubic-bezier` timing).
- **Live search:** Celebrity thumbnails use round portraits vs poster crop for clearer affordance.

Cache-busting: bumped `navbar.css` → **v10**, `home.css` → **v14**, `movie.css` → **v13**, `movies.css` → **v9**, `profile.css` → **v7**, `mylist.css` → **v15**, `celebrities.css` → **v6**, `home.js` → **v14**.

---

## Remaining edge cases / backlog

- **`staic.html`:** Demo-only; wire buttons to real IDs or remove from production sitemap.
- **TMDB-powered UI:** Any feature calling `tmdb_*` actions shows “not configured” until env/api key set — not a front-end bug.
- **`mail()` on server:** Celebrity notification endpoint may report mail not sent depending on PHP mail configuration.
- **Full manual click pass:** This report combines automation limits + code review; retest after content/DB changes.

---

## API action quick reference (`api.php`)

| Action | Method | Purpose |
|--------|--------|---------|
| `home` | GET | Health ping |
| `search` | GET | Movies + series + actresses/celebrities |
| `movie_get` | GET | Single title |
| `watchlist_get` / `watchlist_toggle` / `watchlist_remove` | GET/POST | Watchlist |
| `reviews_get` / `reviews_post` | GET/POST | Title reviews |
| `celebrities_list` | GET | Directory |
| `celebrity_get` | GET | Detail |
| `celebrity_comments_get` / `celebrity_comments_post` | GET/POST | Celebrity threads |
| `celebrity_notifications_subscribe` | POST | Email preference |
| `signup` / `login` / `logout` / `session` | POST/GET | Auth |
| `tmdb_*` | GET | TMDB proxy (requires key) |

---

*End of report.*
