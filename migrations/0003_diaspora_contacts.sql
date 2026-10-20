-- Отдельные поля контактов вместо одного текстового `contacts` (он остаётся для заметок).
ALTER TABLE places ADD COLUMN phone TEXT;
ALTER TABLE places ADD COLUMN website TEXT;
ALTER TABLE places ADD COLUMN telegram TEXT;
ALTER TABLE places ADD COLUMN instagram TEXT;
ALTER TABLE places ADD COLUMN facebook TEXT;
ALTER TABLE places ADD COLUMN updated_at TEXT;
CREATE INDEX places_kind ON places (kind);
CREATE INDEX suggestions_status ON suggestions (status);
