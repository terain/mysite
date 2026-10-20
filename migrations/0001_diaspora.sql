-- Места на карте диаспоры в Гливице
CREATE TABLE places (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  kind        TEXT NOT NULL,           -- shop, cafe, service, medical, meetup, ...
  description TEXT,
  address     TEXT,
  lat         REAL NOT NULL,
  lng         REAL NOT NULL,
  languages   TEXT NOT NULL DEFAULT 'uk', -- через запятую: uk,ru,pl
  hours       TEXT,
  contacts    TEXT,
  photo       TEXT,                    -- путь внутри media/ на pCloud
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  checked_at  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX places_status ON places (status);

-- Предложения от посетителей, ждут модерации
CREATE TABLE suggestions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  place_id   INTEGER REFERENCES places (id), -- NULL = новое место, иначе правка
  payload    TEXT NOT NULL,                  -- JSON с полями формы
  status     TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'accepted', 'rejected')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
