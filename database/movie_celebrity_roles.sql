-- Links catalog movies/series to celebrities with optional character name.
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS movie_celebrity_roles (
  movie_id INT NOT NULL,
  celebrity_id INT NOT NULL,
  character_name VARCHAR(255) DEFAULT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  source VARCHAR(32) DEFAULT 'manual',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (movie_id, celebrity_id),
  INDEX idx_mcr_celeb (celebrity_id),
  CONSTRAINT fk_mcr_movie FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
  CONSTRAINT fk_mcr_celeb FOREIGN KEY (celebrity_id) REFERENCES celebrities(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
