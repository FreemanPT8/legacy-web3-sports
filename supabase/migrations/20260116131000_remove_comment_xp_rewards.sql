-- Remove comment-related XP reward definitions

DELETE FROM xp_rewards
WHERE action_type IN ('comment', 'forum_post', 'forum_topic', 'comment_weekly_top');
