-- Publish all seed articles
UPDATE articles
SET status = 'published', published_at = now()
WHERE status = 'draft';
