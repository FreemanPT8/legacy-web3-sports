# Admin Houses Overview – Data Contract

This note describes the KPIs and datasets required for the `/admin/houses/overview`
screen. It builds on the existing schema + migrations recently added.

---

## Required KPIs

1. **Total Houses** – Total number of rows in `houses_of_sports`.
2. **Status Breakdown**
   - Active (`status = 'active'` or `governance_status = 'active'`)
   - Under construction (`status = 'under_construction'`)
   - In development (`status in ('in_development', 'development')`)
   - Paused / limited (`governance_status in ('paused', 'under_review', 'limited')`)
3. **Users per House**
   - Count from `user_houses` (role = `MEMBER`, `removed_at is null`).
   - Derive a “top 5 Houses” list ordered by member count.
4. **Capacity vs Load**
   - Pull `monthly_capacity` from `houses_of_sports`.
   - Compare against current month join requests (`house_join_requests` with `status='pending'`
     and `created_at` in current month).
   - Flag Houses where `pending_requests >= monthly_capacity`.
5. **Alert Summary**
   - From `house_alerts`: number of open alerts grouped by severity (low/medium/high).
   - Provide top unresolved alerts with metadata (`house_id`, `type`, `created_at`).
6. **Onboarding Readiness**
   - Use `house_onboarding_status`: highlight Houses with zero published popups.
7. **Sport Pools Pressure**
   - Count `sport_pool_entries` pending per sport and show the top sports lacking capacity.

---

## API Response Shape

Endpoint suggestion: `GET /api/admin/houses/overview`.

```ts
type HouseOverviewResponse = {
  success: true;
  totals: {
    houses: number;
    active: number;
    underConstruction: number;
    inDevelopment: number;
    paused: number;
  };
  members: {
    globalCount: number;
    topHouses: Array<{ houseId: string; houseKey: string; name: string; members: number }>;
  };
  capacity: Array<{
    houseId: string;
    name: string;
    monthlyCapacity: number | null;
    pendingRequests: number;
    status: 'ok' | 'limit' | 'blocked';
  }>;
  alerts: {
    openBySeverity: Record<'low' | 'medium' | 'high', number>;
    top: Array<{
      id: string;
      houseId: string;
      houseName: string;
      type: string;
      severity: string;
      createdAt: string;
    }>;
  };
  onboarding: Array<{
    houseId: string;
    houseKey: string;
    name: string;
    publishedPopups: number;
  }>;
  poolPressure: Array<{
    sportCode: string;
    pending: number;
  }>;
};
```

Only Admin / Super Admin should be able to call the endpoint (reuse `requireAdmin`).

---

## Queries / Sources

| KPI | Source |
| --- | ------ |
| Totals | `houses_of_sports` |
| Members & top houses | `user_houses` joined with `houses_of_sports` |
| Capacity vs pending | `houses_of_sports.monthly_capacity` + `house_join_requests` |
| Alerts | `house_alerts` |
| Onboarding readiness | `house_onboarding_status` |
| Sport pool pressure | `sport_pool_entries` filtered by `status='pending'` |

To keep the endpoint fast:
- Use Supabase RPC to fetch aggregated counts in a single round-trip when possible.
- Limit `topHouses`, `capacity`, `alerts.top`, and `poolPressure` to the most relevant items (e.g. top 5).

This contract will be implemented in the next step along with the UI.

---

## Alert Automation (Cron)

- A background scan endpoint exists at `POST /api/admin/houses/alerts/scan` (admin protected) and
  a cron-friendly public endpoint `GET /api/cron/house-alerts`.
- Configure an environment variable `HOUSE_ALERT_CRON_SECRET` with a random value and include the same value
  in the request header `x-cron-secret` when invoking the cron endpoint.
- Schedule a task (e.g., Vercel Cron, GitHub Actions, external scheduler) to hit
  `/api/cron/house-alerts` every hour. The route reuses the same logic as the manual button and records
  any new alerts/resolutions automatically.

