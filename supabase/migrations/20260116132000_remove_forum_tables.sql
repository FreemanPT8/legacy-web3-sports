-- Remove legacy forum tables and related likes

DELETE FROM content_likes WHERE content_type = 'forum_post';

ALTER TABLE content_likes
  DROP CONSTRAINT IF EXISTS content_likes_content_type_check;

ALTER TABLE content_likes
  ADD CONSTRAINT content_likes_content_type_check
  CHECK (content_type IN ('blog_post'));

DROP TABLE IF EXISTS forum_posts CASCADE;
DROP TABLE IF EXISTS forum_topics CASCADE;
DROP TABLE IF EXISTS forum_room_members CASCADE;
DROP TABLE IF EXISTS forum_rooms CASCADE;
