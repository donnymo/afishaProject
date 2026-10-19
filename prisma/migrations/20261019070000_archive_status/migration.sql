-- Закончившиеся события уходят в архив, чтобы не замедлять выборки по опубликованным.
-- Новое значение enum нельзя использовать в той же транзакции, поэтому уже прошедшие
-- события переводит в архив не миграция, а EventsArchiver при старте приложения.
ALTER TYPE "EventStatus" ADD VALUE 'archived';

-- CreateIndex
CREATE INDEX "events_status_ends_at_idx" ON "events"("status", "ends_at");

-- CreateIndex
CREATE INDEX "events_status_hidden_at_idx" ON "events"("status", "hidden_at");
