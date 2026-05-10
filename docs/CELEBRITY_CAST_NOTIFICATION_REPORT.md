# Celebrity / cast system & mail notification report

**Date:** 2026-05-10

## Summary

| Area | What changed / status |
|------|------------------------|
| **DB** | New table `movie_celebrity_roles` (movie ↔ celebrity + optional character name). Migration: `database/movie_celebrity_roles.sql`. |
| **Wikipedia cast enrichment** | New CLI/HTTP tool: `enrich_movie_cast_wikipedia.php` + `celebrity_enrichment_lib.php`. Fetches English Wikipedia **Cast** section HTML, parses actor links + optional “as / –” role, **upserts** celebrities (no overwrite of existing rows except merging `known_for_movies` with the current title). |
| **API** | `movie_get` merges `linked_celebrities` from **role mappings** first, then legacy `known_for_movies` / `famous_for` title match. `celebrity_get` adds `catalog_known_for` (DB-backed title list with posters + roles). |
| **UI** | Celebrity **Known For** uses `catalog_known_for` when present; fallback to text + client catalog match. Section hidden when no cards. Movie **cast** shows **role** when available. |
| **Mail** | **No code removed.** Audited: only `celebrity_notifications_subscribe` uses PHP `mail()`; signup/login/newsletter do **not** send email. |

## Counts (this environment)

Enrichment was validated with `--dry-run` (and optional live runs on your machine will populate rows). **Exact “celebrities added” / “roles inserted” counts depend on** catalog titles, Wikipedia page shape, and whether `movie_cast_needs_enrichment()` selects a row.

To produce real counts after import:

`C:\xampp\php\php.exe enrich_movie_cast_wikipedia.php --limit=15`

Then:

```sql
SELECT COUNT(*) FROM movie_celebrity_roles;
SELECT COUNT(*) FROM celebrities;
```

## Fixes applied

1. **Regex bug** in `celebrity_enrichment_lib.php`: `#`-delimited pattern conflicted with `#` in `/wiki/…` URLs — switched delimiter to `~`.
2. **Known-for mapping**: Server resolves titles via junction table + exact `movies.title` match from `known_for_movies` CSV.
3. **Duplicate celebrities**: Name normalization (`md_celeb_normalize_key`) before insert; slug collision handled with numeric suffix.
4. **Gallery broken images**: Uses celebrity avatar fallback instead of removing nodes when suitable.

## Mail / notification audit

| Feature | Mechanism | Sends email? |
|---------|-----------|--------------|
| **Signup** (`signup`) | Inserts user row | **No** |
| **Login** | Session only | **No** |
| **Password reset** | Not implemented | — |
| **Home newsletter form** | `localStorage` only (`movieDekhoNewsletter`) | **No** |
| **My List → Mail alerts** (`celebrity_notifications_subscribe`) | `mail($email, …)` with `@mail()` | **Only if** PHP `mail()` is wired (sendmail/postfix/SMTP adapter on host). Response JSON includes `mail_sent` bool + message when disabled. |

### Current behavior

- **Typical XAMPP Windows**: `mail()` often returns **false** → UI still shows success with message *“Preference saved; mail server is not configured”* (preference is **not** persisted server-side; email is not queued).

### What is missing for real mail

- SMTP configuration (`php.ini` sendmail_path / SMTP extension), or switch to **PHPMailer/Symfony Mailer** with real SMTP credentials.
- Optional: persist subscription emails in a DB table for cron digests.

### Complexity estimate

| Approach | Effort |
|----------|--------|
| SMTP via PHPMailer + env-based credentials | **Medium** (1–2 sessions): composer/deps, secure secrets, test inbox |
| Queue + DB subscriptions + cron | **Higher** |

### Recommendation

- **Keep** `celebrity_notifications_subscribe`: best-effort `mail()` is harmless; frontend gets honest feedback.
- **Do not remove** unless product drops alerts entirely.

## How to run enrichment safely

```bash
# Dry run (no DB writes except migration already applied)
php enrich_movie_cast_wikipedia.php --dry-run --limit=5

# Apply (CLI)
php enrich_movie_cast_wikipedia.php --limit=10

# HTTP (set env MOVIEDEKHO_ENRICH_KEY first)
# enrich_movie_cast_wikipedia.php?key=SECRET&limit=5
```

Respects Wikipedia rate limits with short sleeps; **does not** overwrite non-empty celebrity biography/image except via **new INSERT** only.

## Known limitations

- Wikipedia **Cast** sections vary (tables vs lists); parser favors `<ul>/<ol>` list items with `/wiki/` actor links.
- Film page discovery uses Wikipedia search + `(film)` / `(YYYY film)` title guesses — occasional mismatches possible.
- Role text may be truncated/sanitized (255 chars).

## Recommended follow-ups

1. Persist notification emails + opt-in flag if marketing alerts matter.
2. Optional TMDB credit backup when Wikipedia cast is empty (requires API key + licence considerations).
3. Admin UI to edit `movie_celebrity_roles` without re-running import.
