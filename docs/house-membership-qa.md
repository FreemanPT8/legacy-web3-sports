# House Membership QA Checklist

Use these manual steps to confirm that automatic House creation and member assignment behave correctly.

1. **Existing House path**
   - Pick a sport/country pair that already has a House (`/admin/houses`).
   - Create a tester account via `/signup` choosing that sport/country.
   - Refresh `/admin/houses/[houseId]` and confirm the new user appears in the members list without going through pools.

2. **New House creation path**
   - Choose a sport/country pair that does not have any House yet.
   - Sign up a new user with that pair.
   - After signup, check `/admin/houses` for a newly created entry (status should default to `under_construction`) and confirm the user is already listed inside `/admin/houses/[houseId]`.

3. **No leftover sport pool entries**
   - Visit `/admin/houses/pools` and verify that no `sport_pending` entries were created for the users covered in steps 1 and 2.
   - Also run `scripts/process_sport_pending_pool.ts` if there are legacy pending entries and confirm the queue is empty afterwards.
