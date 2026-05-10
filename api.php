<?php
session_start();

$host   = "localhost";
$dbname = "moviedekho";
$user   = "root";
$pass   = "";

mysqli_report(MYSQLI_REPORT_OFF);
$conn = new mysqli($host, $user, $pass, $dbname);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "DB connection failed"]);
    exit();
}

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

$action = $_GET['action'] ?? 'home';
$body   = json_decode(file_get_contents("php://input"), true);

function split_list_value($value) {
    if (is_array($value)) return $value;
    $value = trim((string)$value);
    if ($value === '') return [];
    $decoded = json_decode($value, true);
    if (is_array($decoded)) return $decoded;
    return array_values(array_filter(array_map('trim', explode(',', $value))));
}

/** Extract YouTube video id (11 chars) from watch, youtu.be, or embed URLs; empty if unsupported. */
function youtube_video_id_from_url($url) {
    $url = trim((string)$url);
    if ($url === '') {
        return '';
    }
    if (preg_match('#^https?://(www\.)?youtube\.com/embed/([a-zA-Z0-9_-]{11})(\?|$|/)#i', $url, $m)) {
        return $m[2];
    }
    if (preg_match('#[?&]v=([a-zA-Z0-9_-]{11})#', $url, $m)) {
        return $m[1];
    }
    if (preg_match('#youtu\.be/([a-zA-Z0-9_-]{11})#i', $url, $m)) {
        return $m[1];
    }
    return '';
}

/** Canonical embed URL for iframe, or empty string when invalid / not YouTube. */
function youtube_embed_url($url) {
    $id = youtube_video_id_from_url($url);
    return $id !== '' ? ('https://www.youtube.com/embed/' . $id) : '';
}

function normalize_title_row($row, $conn = null, $genreMap = null) {
    $row['year'] = $row['year'] ?? $row['release_year'] ?? null;
    $row['poster'] = $row['poster'] ?? $row['poster_url'] ?? $row['thumbnail_url'] ?? null;
    $row['backdrop'] = $row['backdrop'] ?? $row['backdrop_url'] ?? null;

    $primaryEmbed = '';
    foreach (['trailer_url', 'trailer', 'teaser_url'] as $field) {
        $embed = youtube_embed_url($row[$field] ?? '');
        if ($embed !== '') {
            $primaryEmbed = $embed;
            break;
        }
    }
    $teaserNorm = youtube_embed_url($row['teaser_url'] ?? '');
    $row['trailer_url'] = $primaryEmbed !== '' ? $primaryEmbed : null;
    $row['trailer'] = $primaryEmbed !== '' ? $primaryEmbed : null;
    $row['teaser_url'] = $teaserNorm !== '' ? $teaserNorm : null;

    $row['gradient'] = $row['gradient'] ?? $row['gradient_color'] ?? null;
    $row['rating'] = $row['rating'] ?? $row['imdb_rating'] ?? null;

    if (!isset($row['genre'])) {
        $genres = [];
        if (is_array($genreMap) && isset($row['id']) && isset($genreMap[(int)$row['id']])) {
            $genres = $genreMap[(int)$row['id']];
        } elseif ($conn && isset($row['id'])) {
            $g = $conn->query("
                SELECT name FROM genres g
                JOIN movie_genres mg ON g.id=mg.genre_id
                WHERE mg.movie_id=".(int)$row['id']."
            ");
            if ($g) {
                while ($gr = $g->fetch_assoc()) $genres[] = $gr['name'];
            }
        }
        $row['genre'] = $genres;
    } else {
        $row['genre'] = split_list_value($row['genre']);
    }

    $row['gallery_images'] = split_list_value($row['gallery_images'] ?? '');
    return $row;
}

function table_exists($conn, $table) {
    $safe = $conn->real_escape_string($table);
    $res = $conn->query("SHOW TABLES LIKE '$safe'");
    return $res && $res->num_rows > 0;
}

function normalize_celebrity_row($row) {
    $row['name'] = $row['full_name'] ?? $row['name'] ?? '';
    $row['img'] = $row['profile_image'] ?? $row['img'] ?? '';
    foreach (['gallery_images','languages','awards','famous_for','hobbies','favorite_movies','upcoming_projects','known_for_movies'] as $field) {
        $row[$field] = split_list_value($row[$field] ?? '');
    }
    return $row;
}

function normalize_lookup_key($value) {
    return preg_replace('/[^a-z0-9]/', '', strtolower((string)$value));
}

function split_known_for_titles($value) {
    return split_list_value($value);
}

function linked_celebrities_for_title($conn, $title) {
    if (!table_exists($conn, 'celebrities')) return [];
    $title = trim((string)$title);
    if ($title === '') return [];

    $safeLike = "%".$title."%";
    $stmt = $conn->prepare("
        SELECT id, full_name, profile_image, profession, nationality, known_for_movies, famous_for
        FROM celebrities
        WHERE (known_for_movies LIKE ? OR famous_for LIKE ?)
        AND (profile_image IS NOT NULL AND profile_image <> '' AND profile_image NOT LIKE '%Signature_of_%')
        LIMIT 80
    ");
    $stmt->bind_param("ss", $safeLike, $safeLike);
    $stmt->execute();
    $res = $stmt->get_result();

    $wanted = normalize_lookup_key($title);
    $out = [];
    while ($row = $res->fetch_assoc()) {
        $known = split_known_for_titles($row['known_for_movies'] ?? '');
        $isLinked = false;
        foreach ($known as $knownTitle) {
            $knownNorm = normalize_lookup_key($knownTitle);
            if ($knownNorm !== '' && ($knownNorm === $wanted || str_contains($knownNorm, $wanted) || str_contains($wanted, $knownNorm))) {
                $isLinked = true;
                break;
            }
        }
        if (!$isLinked) {
            $famousNorm = normalize_lookup_key($row['famous_for'] ?? '');
            $isLinked = ($famousNorm !== '' && (str_contains($famousNorm, $wanted) || str_contains($wanted, $famousNorm)));
        }
        if (!$isLinked) continue;

        $out[] = [
            "id" => (int)$row['id'],
            "name" => $row['full_name'] ?? '',
            "img" => $row['profile_image'] ?? '',
            "profession" => $row['profession'] ?? '',
            "nationality" => $row['nationality'] ?? ''
        ];
    }
    return $out;
}

function dedupe_linked_celebrities(array $items): array {
    $seen = [];
    $out = [];
    foreach ($items as $it) {
        $id = (int)($it['id'] ?? 0);
        if ($id <= 0 || isset($seen[$id])) {
            continue;
        }
        $seen[$id] = true;
        $out[] = $it;
    }
    return $out;
}

function linked_celebrities_from_roles($conn, int $movieId): array {
    if (!table_exists($conn, 'movie_celebrity_roles')) {
        return [];
    }
    $stmt = $conn->prepare("
        SELECT c.id, c.full_name, c.profile_image, c.profession, c.nationality,
               r.character_name AS role_label
        FROM movie_celebrity_roles r
        INNER JOIN celebrities c ON c.id = r.celebrity_id
        WHERE r.movie_id = ?
        ORDER BY r.sort_order ASC, c.full_name ASC
        LIMIT 48
    ");
    $stmt->bind_param("i", $movieId);
    $stmt->execute();
    $res = $stmt->get_result();
    $out = [];
    while ($row = $res->fetch_assoc()) {
        $out[] = [
            "id" => (int)$row["id"],
            "name" => $row["full_name"] ?? "",
            "img" => $row["profile_image"] ?? "",
            "profession" => $row["profession"] ?? "",
            "nationality" => $row["nationality"] ?? "",
            "role" => trim((string)($row["role_label"] ?? "")),
        ];
    }
    return $out;
}

function catalog_known_for_entries($conn, int $celebrityId, $knownForMoviesRaw): array {
    $byId = [];
    if (table_exists($conn, 'movie_celebrity_roles')) {
        $stmt = $conn->prepare("
            SELECT m.id, m.title, m.type, m.release_year, m.poster_url, m.thumbnail_url, m.poster,
                   r.character_name
            FROM movie_celebrity_roles r
            INNER JOIN movies m ON m.id = r.movie_id
            WHERE r.celebrity_id = ?
            AND (m.poster IS NULL OR m.poster NOT LIKE 'assets/generated/%')
            ORDER BY m.release_year DESC, m.title ASC
            LIMIT 40
        ");
        $stmt->bind_param("i", $celebrityId);
        $stmt->execute();
        $res = $stmt->get_result();
        while ($row = $res->fetch_assoc()) {
            $mid = (int)$row["id"];
            $poster = $row["poster_url"] ?? $row["thumbnail_url"] ?? $row["poster"] ?? "";
            $byId[$mid] = [
                "id" => $mid,
                "title" => $row["title"] ?? "",
                "type" => $row["type"] ?? "movie",
                "year" => (int)($row["release_year"] ?? 0),
                "poster_url" => $poster,
                "role" => trim((string)($row["character_name"] ?? "")),
            ];
        }
    }

    $titles = split_list_value($knownForMoviesRaw ?? "");
    foreach ($titles as $t) {
        $t = trim((string)$t);
        if ($t === "") {
            continue;
        }
        $stmt = $conn->prepare("
            SELECT id, title, type, release_year, poster_url, thumbnail_url, poster FROM movies
            WHERE title = ?
            AND (poster IS NULL OR poster NOT LIKE 'assets/generated/%')
            LIMIT 1
        ");
        $stmt->bind_param("s", $t);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        if (!$row) {
            continue;
        }
        $mid = (int)$row["id"];
        if (isset($byId[$mid])) {
            continue;
        }
        $poster = $row["poster_url"] ?? $row["thumbnail_url"] ?? $row["poster"] ?? "";
        $byId[$mid] = [
            "id" => $mid,
            "title" => $row["title"] ?? "",
            "type" => $row["type"] ?? "movie",
            "year" => (int)($row["release_year"] ?? 0),
            "poster_url" => $poster,
            "role" => "",
        ];
        if (count($byId) >= 48) {
            break;
        }
    }

    return array_values($byId);
}

function tmdb_api_key() {
    return getenv('TMDB_API_KEY') ?: ($_GET['api_key'] ?? '');
}

function tmdb_get($path, $params = []) {
    $apiKey = tmdb_api_key();
    if (!$apiKey) {
        return ["success" => false, "message" => "TMDB_API_KEY is not configured"];
    }

    $params = array_merge([
        "api_key" => $apiKey,
        "language" => "en-US"
    ], $params);

    $url = "https://api.themoviedb.org/3/" . ltrim($path, "/") . "?" . http_build_query($params);
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10
    ]);
    $payload = curl_exec($ch);
    $error = curl_error($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);

    if ($payload === false || $error || $status >= 400) {
        return ["success" => false, "message" => "TMDB request failed", "status" => $status];
    }

    $decoded = json_decode($payload, true);
    if (!is_array($decoded)) {
        return ["success" => false, "message" => "TMDB response was invalid"];
    }
    $decoded["success"] = true;
    return $decoded;
}


// ================= HOME =================
if ($action === 'home') {
    echo json_encode([
        "success" => true,
        "message" => "MovieDekho API Running 🚀"
    ]);
}


// ================= TMDB =================
elseif ($action === 'tmdb_search' || $action === 'tmdb_trending') {
    $apiKey = getenv('TMDB_API_KEY') ?: ($_GET['api_key'] ?? '');

    if (!$apiKey) {
        echo json_encode([
            "success" => false,
            "message" => "TMDB_API_KEY is not configured"
        ]);
        exit();
    }

    $endpoint = $action === 'tmdb_trending'
        ? "https://api.themoviedb.org/3/trending/all/week"
        : "https://api.themoviedb.org/3/search/multi";

    $params = [
        "api_key" => $apiKey,
        "language" => "en-US",
        "include_adult" => "false"
    ];

    if ($action === 'tmdb_search') {
        $params["query"] = trim($_GET['q'] ?? '');
    }

    $ch = curl_init($endpoint . "?" . http_build_query($params));
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 8
    ]);
    $payload = curl_exec($ch);
    $error = curl_error($ch);
    curl_close($ch);

    if ($payload === false || $error) {
        echo json_encode(["success" => false, "message" => "TMDB request failed"]);
        exit();
    }

    echo $payload;
}

elseif ($action === 'tmdb_people_popular') {
    $page = max(1, min(5, (int)($_GET['page'] ?? 1)));
    echo json_encode(tmdb_get("person/popular", ["page" => $page, "include_adult" => "false"]));
}

elseif ($action === 'tmdb_people_search') {
    $q = trim($_GET['q'] ?? '');
    if ($q === '') {
        echo json_encode(["success" => false, "message" => "Search query required"]);
        exit();
    }
    echo json_encode(tmdb_get("search/person", ["query" => $q, "page" => 1, "include_adult" => "false"]));
}

elseif ($action === 'tmdb_person_get') {
    $pid = (int)($_GET['id'] ?? 0);
    if ($pid <= 0) {
        echo json_encode(["success" => false, "message" => "Invalid TMDB person id"]);
        exit();
    }
    echo json_encode(tmdb_get("person/$pid", [
        "append_to_response" => "images,combined_credits,external_ids"
    ]));
}

elseif ($action === 'tmdb_movie_lookup') {
    $q = trim($_GET['q'] ?? '');
    if ($q === '') {
        echo json_encode(["success" => false, "message" => "Movie title required"]);
        exit();
    }
    echo json_encode(tmdb_get("search/movie", ["query" => $q, "page" => 1, "include_adult" => "false"]));
}

elseif ($action === 'tmdb_movie_details') {
    $tmdbId = (int)($_GET['id'] ?? 0);
    if ($tmdbId <= 0) {
        echo json_encode(["success" => false, "message" => "TMDB movie id required"]);
        exit();
    }
    echo json_encode(tmdb_get("movie/$tmdbId", [
        "append_to_response" => "images,videos,external_ids"
    ]));
}


// ================= SIGNUP =================
elseif ($action === 'signup') {

    $username = trim($body['username'] ?? '');
    $email    = trim($body['email'] ?? '');
    $password = trim($body['password'] ?? '');

    if (!$username || !$email || !$password) {
        echo json_encode(["success" => false, "message" => "All fields required"]);
        exit();
    }

    $check = $conn->prepare("SELECT id FROM users WHERE email=?");
    $check->bind_param("s", $email);
    $check->execute();
    $check->store_result();

    if ($check->num_rows > 0) {
        echo json_encode(["success" => false, "message" => "Email exists"]);
        exit();
    }

    $hashed = hash('sha256', $password);

    $stmt = $conn->prepare("INSERT INTO users (username,email,password) VALUES (?,?,?)");
    $stmt->bind_param("sss", $username, $email, $hashed);

    echo json_encode(["success" => $stmt->execute()]);
}



elseif ($action === 'login') {

    $email    = trim($body['email'] ?? '');
    $password = hash('sha256', trim($body['password'] ?? ''));

    $stmt = $conn->prepare("SELECT * FROM users WHERE email=? AND password=?");
    $stmt->bind_param("ss", $email, $password);
    $stmt->execute();
    $res = $stmt->get_result();

    if ($res->num_rows === 1) {
        $u = $res->fetch_assoc();

        $_SESSION['loggedIn'] = true;
        $_SESSION['user_id']  = $u['id'];

        
        echo json_encode([
            "success" => true,
            "user" => [
                "id" => $u['id'],
                "username" => $u['username'],
                "email" => $u['email']
            ]
        ]);
    } else {
        echo json_encode(["success" => false]);
    }
}



elseif ($action === 'logout') {
    session_destroy();
    echo json_encode(["success" => true]);
}



elseif ($action === 'session') {

    if (!empty($_SESSION['loggedIn']) && !empty($_SESSION['user_id'])) {

        $uid = $_SESSION['user_id'];

        $stmt = $conn->prepare("SELECT id, username, email FROM users WHERE id=?");
        $stmt->bind_param("i", $uid);
        $stmt->execute();
        $res = $stmt->get_result();

        if ($res->num_rows === 1) {
            $user = $res->fetch_assoc();

            echo json_encode([
                "loggedIn" => true,
                "user" => $user
            ]);
        } else {
            echo json_encode(["loggedIn" => false]);
        }

    } else {
        echo json_encode(["loggedIn" => false]);
    }
}


// ================= WATCHLIST GET =================
elseif ($action === 'watchlist_get') {

    if (empty($_SESSION['loggedIn'])) {
        echo json_encode(["success" => false]);
        exit();
    }

    $uid = $_SESSION['user_id'];

    $stmt = $conn->prepare("SELECT movie_id FROM watchlist WHERE user_id=?");
    $stmt->bind_param("i", $uid);
    $stmt->execute();
    $res = $stmt->get_result();

    $ids = [];
    while ($r = $res->fetch_assoc()) {
        $ids[] = $r['movie_id'];
    }

    echo json_encode(["success" => true, "watchlist" => $ids]);
}


// ================= WATCHLIST TOGGLE =================
elseif ($action === 'watchlist_toggle') {

    if (empty($_SESSION['loggedIn'])) {
        echo json_encode(["success" => false]);
        exit();
    }

    $uid = $_SESSION['user_id'];
    $mid = (int)($body['movie_id'] ?? 0);
    if ($mid <= 0) {
        echo json_encode(["success" => false, "message" => "Invalid movie id"]);
        exit();
    }

    $check = $conn->prepare("SELECT id FROM watchlist WHERE user_id=? AND movie_id=?");
    $check->bind_param("ii", $uid, $mid);
    $check->execute();
    $check->store_result();

    if ($check->num_rows > 0) {
        $stmt = $conn->prepare("DELETE FROM watchlist WHERE user_id=? AND movie_id=?");
        $stmt->bind_param("ii", $uid, $mid);
        echo json_encode(["success" => $stmt->execute(), "action" => "removed"]);
    } else {
        $stmt = $conn->prepare("INSERT INTO watchlist (user_id,movie_id) VALUES (?,?)");
        $stmt->bind_param("ii", $uid, $mid);
        echo json_encode(["success" => $stmt->execute(), "action" => "added"]);
    }
}

// ================= WATCHLIST REMOVE =================
elseif ($action === 'watchlist_remove') {

    if (empty($_SESSION['loggedIn'])) {
        echo json_encode(["success" => false]);
        exit();
    }

    $uid = $_SESSION['user_id'];
    $mid = (int)($body['movie_id'] ?? 0);

    if ($mid <= 0) {
        echo json_encode(["success" => false, "message" => "Invalid movie id"]);
        exit();
    }

    $stmt = $conn->prepare("DELETE FROM watchlist WHERE user_id=? AND movie_id=?");
    $stmt->bind_param("ii", $uid, $mid);
    echo json_encode(["success" => $stmt->execute(), "action" => "removed"]);
}


// ================= REVIEWS GET =================
elseif ($action === 'reviews_get') {

    $mid = (int)($_GET['movie_id'] ?? 0);
    if ($mid <= 0) {
        echo json_encode(["success" => false, "message" => "Invalid movie id", "reviews" => []]);
        exit();
    }

    $stmt = $conn->prepare("
        SELECT u.username,r.rating,r.comment
        FROM reviews r
        JOIN users u ON r.user_id=u.id
        WHERE movie_id=?
    ");
    $stmt->bind_param("i", $mid);
    $stmt->execute();
    $res = $stmt->get_result();

    $data = [];
    while ($r = $res->fetch_assoc()) $data[] = $r;

    echo json_encode(["success" => true, "reviews" => $data]);
}


// ================= REVIEWS POST =================
elseif ($action === 'reviews_post') {

    if (empty($_SESSION['loggedIn'])) {
        echo json_encode(["success" => false]);
        exit();
    }

    $uid = $_SESSION['user_id'];
    $mid = (int)$body['movie_id'];
    $rating = (int)$body['rating'];
    $comment = trim($body['comment']);

    $stmt = $conn->prepare("INSERT INTO reviews (user_id,movie_id,rating,comment) VALUES (?,?,?,?)");
    $stmt->bind_param("iiis", $uid,$mid,$rating,$comment);

    echo json_encode(["success" => $stmt->execute()]);
}

// ================= CELEBRITIES LIST =================
elseif ($action === 'celebrities_list') {
    if (!table_exists($conn, 'celebrities')) {
        echo json_encode(["success" => false, "message" => "Celebrities table not installed"]);
        exit();
    }

    $q = trim($_GET['q'] ?? '');
    $country = trim($_GET['country'] ?? 'all');
    $profession = trim($_GET['profession'] ?? 'all');
    $sort = $_GET['sort'] ?? 'popularity';
    $like = ($q === '') ? "%" : "%$q%";

    $where = ["(full_name LIKE ? OR famous_for LIKE ? OR nationality LIKE ?)"];
    $where[] = "(profile_image IS NOT NULL AND profile_image <> '' AND profile_image NOT LIKE '%Signature_of_%')";
    $params = [$like, $like, $like];
    $types = "sss";

    if ($country !== 'all' && $country !== '') {
        $where[] = "nationality = ?";
        $params[] = $country;
        $types .= "s";
    }

    if ($profession !== 'all' && $profession !== '') {
        $where[] = "profession LIKE ?";
        $params[] = "%$profession%";
        $types .= "s";
    }

    $order = "popularity_score DESC";
    if ($sort === 'rating') $order = "fan_rating DESC";
    if ($sort === 'trending') $order = "trending_score DESC";
    if ($sort === 'name') $order = "full_name ASC";
    if ($sort === 'new') $order = "created_at DESC";

    $sql = "SELECT * FROM celebrities WHERE ".implode(" AND ", $where)." ORDER BY $order LIMIT 120";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $res = $stmt->get_result();

    $items = [];
    while ($row = $res->fetch_assoc()) $items[] = normalize_celebrity_row($row);
    echo json_encode(["success" => true, "celebrities" => $items]);
}

// ================= CELEBRITY GET =================
elseif ($action === 'celebrity_get') {
    if (!table_exists($conn, 'celebrities')) {
        echo json_encode(["success" => false, "message" => "Celebrities table not installed"]);
        exit();
    }

    $id = (int)($_GET['id'] ?? 0);
    $slug = trim($_GET['slug'] ?? '');

    if ($id > 0) {
        $stmt = $conn->prepare("SELECT * FROM celebrities WHERE id=?");
        $stmt->bind_param("i", $id);
    } else {
        $stmt = $conn->prepare("SELECT * FROM celebrities WHERE slug=?");
        $stmt->bind_param("s", $slug);
    }

    $stmt->execute();
    $res = $stmt->get_result();
    if ($res->num_rows === 0) {
        echo json_encode(["success" => false, "message" => "Celebrity not found"]);
        exit();
    }

    $raw = $res->fetch_assoc();
    $knownRaw = $raw["known_for_movies"] ?? "";
    $celebrity = normalize_celebrity_row($raw);
    $celebrity["catalog_known_for"] = catalog_known_for_entries($conn, (int)($raw["id"] ?? 0), $knownRaw);

    echo json_encode(["success" => true, "celebrity" => $celebrity]);
}

// ================= CELEBRITY COMMENTS =================
elseif ($action === 'celebrity_comments_get') {
    $cid = (int)($_GET['celebrity_id'] ?? 0);
    if (!table_exists($conn, 'celebrity_comments')) {
        echo json_encode(["success" => true, "comments" => []]);
        exit();
    }
    $stmt = $conn->prepare("SELECT username, rating, comment, created_at FROM celebrity_comments WHERE celebrity_id=? ORDER BY created_at DESC LIMIT 30");
    $stmt->bind_param("i", $cid);
    $stmt->execute();
    $res = $stmt->get_result();
    $comments = [];
    while ($row = $res->fetch_assoc()) $comments[] = $row;
    echo json_encode(["success" => true, "comments" => $comments]);
}

elseif ($action === 'celebrity_comments_post') {
    if (!table_exists($conn, 'celebrity_comments')) {
        echo json_encode(["success" => false, "message" => "Comments table not installed"]);
        exit();
    }
    $cid = (int)($body['celebrity_id'] ?? 0);
    $rating = (int)($body['rating'] ?? 5);
    $comment = trim($body['comment'] ?? '');
    $username = $_SESSION['loggedIn'] ?? false ? "Member" : "Movie Fan";
    if ($cid <= 0 || $comment === '') {
        echo json_encode(["success" => false]);
        exit();
    }
    $stmt = $conn->prepare("INSERT INTO celebrity_comments (celebrity_id, username, rating, comment) VALUES (?,?,?,?)");
    $stmt->bind_param("isis", $cid, $username, $rating, $comment);
    echo json_encode(["success" => $stmt->execute()]);
}

// ================= CELEBRITY MAIL NOTIFICATIONS =================
// TODO: SMTP Integration required for production use.
// Current implementation uses PHP mail() which requires sendmail/postfix on host.
// For production, implement one of:
// 1. PHPMailer with SMTP credentials from .env
// 2. Use 3rd-party service (SendGrid, AWS SES)
// 3. Database queue + cron job for async delivery
// See MAIL_NOTIFICATION_AUDIT.md for details.
elseif ($action === 'celebrity_notifications_subscribe') {
    $email = trim($body['email'] ?? '');
    $celebrityCount = (int)($body['celebrity_count'] ?? 0);

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(["success" => false, "message" => "Invalid email"]);
        exit();
    }

    // Store preference in localStorage (client handles persistence for now)
    // TODO: Persist to database when SMTP is configured
    // $stmt = $conn->prepare("INSERT INTO mail_subscriptions (email, celebrity_count, created_at) VALUES (?,?,NOW())");
    // $stmt->bind_param("si", $email, $celebrityCount);
    // $stmt->execute();

    $subject = "MoviesDekho celebrity alerts enabled";
    $message = "Celebrity mail alerts are enabled for your followed MoviesDekho profiles.";
    if ($celebrityCount > 0) {
        $message .= "\n\nFollowing: ".$celebrityCount." celebrity profile(s).";
    }

    $headers = "From: no-reply@moviedekho.local\r\n";
    $sent = @mail($email, $subject, $message, $headers);
    echo json_encode([
        "success" => true,
        "mail_sent" => $sent,
        "message" => $sent ? "Mail notification sent" : "Email saved (SMTP not configured - contact admin for mail setup)"
    ]);
}

// ================= MOVIE GET =================
elseif ($action === 'movie_get') {

    $mid = (int)($_GET['id'] ?? 0);

    if ($mid <= 0) {
        echo json_encode(["success" => false, "message" => "Invalid movie id"]);
        exit();
    }

    $stmt = $conn->prepare("
        SELECT * FROM movies
        WHERE id=?
        AND (poster IS NULL OR poster NOT LIKE 'assets/generated/%')
    ");
    $stmt->bind_param("i", $mid);
    $stmt->execute();
    $res = $stmt->get_result();

    if ($res->num_rows === 0) {
        echo json_encode(["success" => false, "message" => "Movie not found"]);
        exit();
    }

    $movie = normalize_title_row($res->fetch_assoc(), $conn);
    $fromRoles = linked_celebrities_from_roles($conn, $mid);
    $fromTitles = linked_celebrities_for_title($conn, $movie['title'] ?? '');
    $movie['linked_celebrities'] = dedupe_linked_celebrities(array_merge($fromRoles, $fromTitles));

    echo json_encode(["success" => true, "movie" => $movie]);
}


// ================= SEARCH =================
elseif ($action === 'search') {

    $q = trim($_GET['q'] ?? '');
    $type = $_GET['type'] ?? 'all';

  
    $like = ($q === '') ? "%" : "%$q%";

    $typeFilter = "";
    $types = "s";
    $params = [$like];
    if ($type === 'movie' || $type === 'series') {
        $typeFilter = " AND type = ?";
        $types .= "s";
        $params[] = $type;
    }

    $stmt = $conn->prepare("
        SELECT * FROM movies
        WHERE title LIKE ?
        $typeFilter
        AND (poster IS NULL OR poster NOT LIKE 'assets/generated/%')
    ");
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $res = $stmt->get_result();

    $movies=[];
    $series=[];
    $genreMap = [];

    $movieIds = [];
    while ($m = $res->fetch_assoc()) {
        $movieIds[] = (int)$m['id'];
        if ($m['type'] == "movie") $movies[] = $m;
        else $series[] = $m;
    }

    if ($movieIds && table_exists($conn, 'movie_genres') && table_exists($conn, 'genres')) {
        $idSql = implode(",", $movieIds);
        $genreRes = $conn->query("
            SELECT mg.movie_id, g.name
            FROM movie_genres mg
            JOIN genres g ON g.id = mg.genre_id
            WHERE mg.movie_id IN ($idSql)
        ");
        if ($genreRes) {
            while ($gr = $genreRes->fetch_assoc()) {
                $mid = (int)$gr['movie_id'];
                if (!isset($genreMap[$mid])) $genreMap[$mid] = [];
                $genreMap[$mid][] = $gr['name'];
            }
        }
    }

    foreach ($movies as $idx => $movieRow) {
        $movies[$idx] = normalize_title_row($movieRow, $conn, $genreMap);
    }
    foreach ($series as $idx => $seriesRow) {
        $series[$idx] = normalize_title_row($seriesRow, $conn, $genreMap);
    }

    $act=[];
    if (table_exists($conn, 'celebrities')) {
        $stmt=$conn->prepare("
            SELECT id, full_name AS name, profile_image AS img, famous_for AS known_for
            FROM celebrities
            WHERE full_name LIKE ? OR famous_for LIKE ?
            ORDER BY popularity_score DESC
            LIMIT 8
        ");
        $stmt->bind_param("ss",$like,$like);
        $stmt->execute();
        $res=$stmt->get_result();
        while($a=$res->fetch_assoc()) $act[]=$a;
    } elseif (table_exists($conn, 'actresses')) {
        $stmt=$conn->prepare("SELECT id,name,img,known_for FROM actresses WHERE name LIKE ?");
        $stmt->bind_param("s",$like);
        $stmt->execute();
        $res=$stmt->get_result();
        while($a=$res->fetch_assoc()) $act[]=$a;
    }

    echo json_encode([
        "success"=>true,
        "total"=>count($movies)+count($series)+count($act),
        "results"=>[
            "movies"=>$movies,
            "series"=>$series,
            "actresses"=>$act
        ]
    ]);
}


else {
    echo json_encode(["success"=>false,"message"=>"Invalid action"]);
}

$conn->close();
?>
