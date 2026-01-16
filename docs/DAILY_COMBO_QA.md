# Daily Combo Missions - QA & Manual Verification

## Overview
The XP system now includes three daily routes (Rota Basica, Rota Base, Rota Seria) that work as cumulative combos. Each combo:

- Adds glossary reads, blog reads, and lesson completions throughout the CET day (resets at 00h CET).
- Unlocks extra XP (13 / 21 / 47 XP) once the minimum requirements are met in that order.
- Registers progress in `daily_combo_progress` and completes the corresponding mission in `user_missions`.
- Is exposed via `GET /api/missions/generate?userId=X` in `combo_progress`.

This document describes the manual QA plan used to validate the end-to-end flow.

## Prerequisites
1. Authenticated user with access to glossary, blog, and lessons.
2. Cron `POST /api/missions/generate` already executed to generate the three missions for today.
3. Database migrations applied (`daily_combo_progress` + metadata in `daily_missions`).

## Manual Tests

### 1. Rota Basica (1 blog + 1 lesson)
1. Read 1 blog post and complete 1 lesson.
2. Validate:
   - `/api/missions/generate?userId=X` > `combo_progress.blog_count === 1` and `lesson_count === 1`.
   - Mission `combo_quick` appears as `completed` and +13 XP is registered in `xp_transactions`.
   - `/education/xp` shows the "Rota Basica" card as completed and CTA disabled.

### 2. Rota Base (add +2 glossary terms)
1. Consume 2 glossary terms (total >=2).
2. Confirm +21 XP was credited, `combo_base` marked as completed, and `/dashboard` shows the green badge.

### 3. Rota Seria (add +3 glossary terms, +1 blog, +1 lesson)
1. Add glossary reads until total >=5, blog reads >=2, and lesson completions >=2.
2. Verify +47 XP is credited and UI surfaces the final status (dashboard/admin).

### 4. CET Reset
1. Force the next CET date (can use `psql` to update `daily_combo_progress.combo_date` to yesterday).
2. Reload `/education/xp` and `/dashboard` - counters should reset to 0 and cards re-enable.
3. Confirm new reads increment counters from zero.

### 5. API Contract
1. `GET /api/missions/generate?userId=X` should include:
   ```jsonc
   {
     "success": true,
     "missions": [...],
     "combo_progress": {
       "glossary_count": 2,
       "blog_count": 1,
       "lesson_count": 1,
       "quick_completed": true,
       "base_completed": false,
       "serious_completed": false
     }
   }
   ```
2. Confirm each mission includes `metadata.combo` with the official requirements.

## Results
- **Environment:** main @ commit `8ef30eb+`.
- **Status:** PASS - all steps above were manually executed in development and replicated in staging. Bonus XP appeared in `xp_transactions` and UI without regressions.

> Any future change in XP logic should repeat these steps to ensure alignment between API, dashboards, and admin.
