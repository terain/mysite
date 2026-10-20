-- Шаги квеста. Сам текст задания живёт в src/content/quest/<slug>.md
CREATE TABLE quest_steps (
  slug        TEXT PRIMARY KEY,
  answer_hash TEXT NOT NULL,          -- SHA-256 от нормализованного ответа
  unlocks     TEXT,                   -- slug следующего шага
  position    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE players (
  code       TEXT PRIMARY KEY,        -- личный код или ссылка игрока
  name       TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE player_progress (
  player_code TEXT NOT NULL REFERENCES players (code),
  step_slug   TEXT NOT NULL REFERENCES quest_steps (slug),
  solved_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (player_code, step_slug)
);
