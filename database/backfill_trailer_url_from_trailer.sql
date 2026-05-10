-- Optional one-time sync when URLs live in `trailer` but `trailer_url` is empty (legacy imports).
USE moviedekho;

UPDATE movies
SET trailer_url = trailer
WHERE (trailer_url IS NULL OR TRIM(trailer_url) = '')
  AND trailer IS NOT NULL
  AND TRIM(trailer) <> '';
