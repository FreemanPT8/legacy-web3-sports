# Admin Houses Overview – Data Contract

This note describes the KPIs and datasets required for the `/admin/houses/overview`
screen. It builds on the existing schema + migrations recently added.

---

> Nota: a capacidade mensal é apenas um indicador. O painel deve focar pedidos
> pendentes (CTA backlog) e pressões na pool por desporto/país, já que a
> capacidade é ilimitada por agora.

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
4. **CTA backlog**
   - Contar `house_join_requests` com `status='pending'`.
   - Destacar as Houses com mais pedidos pendentes e o timestamp do ?ltimo pedido.
5. **Alert Summary**
   - From `house_alerts`: number of open alerts grouped by severity (low/medium/high).
   - Provide top unresolved alerts with metadata (`house_id`, `type`, `created_at`).
6. **Onboarding Readiness**
   - Use `house_onboarding_status`: highlight Houses with zero published popups.
7. **Qualitative Feedback**
   - Aggregate `house_feedback` (positive / neutral / negative) to surface cultural or support signals.
8. **Sport Pools Pressure**
   - Count `sport_pool_entries` pending per sport and show the top sports lacking capacity.
9. **Join Requests**
   - Provide a small “join report” card (via `/api/admin/houses/join-report`) showing totals per status and the Houses com mais pedidos pendentes.

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
  ctaQueue: {
    totals: Record<string, number>;
    houses: Array<{
      houseId: string;
      houseKey: string;
      name: string;
      pending: number;
      lastRequest: string | null;
    }>;
  };
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
  joinReport: {
    totals: Record<string, number>;
    houses: Array<{
      houseId: string;
      houseKey: string;
      name: string;
      pending: number;
      lastRequest: string | null;
    }>;
  };
};
```

Only Admin / Super Admin should be able to call the endpoint (reuse `requireAdmin`).

---

## Queries / Sources

| KPI | Source |
| --- | ------ |
| Totals | `houses_of_sports` |
| Members & top houses | `user_houses` joined with `houses_of_sports` |
| CTA backlog | `house_join_requests` (`status='pending'`) |
| Alerts | `house_alerts` |
| Onboarding readiness | `house_onboarding_status` |
| Qualitative feedback | `house_feedback` (filtered por `house_id`) |
| Sport pool pressure | `sport_pool_entries` filtered by `status='pending'` |
| Join report | `house_join_requests` grouped by `house_id` & `status` |

To keep the endpoint fast:
- Use Supabase RPC to fetch aggregated counts in a single round-trip when possible.
- Limit `topHouses`, `capacity`, `alerts.top`, and `poolPressure` to the most relevant items (e.g. top 5).

This contract will be implemented in the next step along with the UI.

---

## Eventos privados na área da House

- A API `GET /api/houses/[houseKey]/events` devolve apenas eventos com visibilidade `members` ou `public` classificados por data.
- No painel público (`/houses/[houseKey]`) o cartão “Eventos” deve aparecer logo após “Mensagens oficiais”, utilizando o mesmo gradiente do módulo `/education/xp`.
- A copy base:
  - PT: “Sem eventos programados para já…”
  - EN: “No events queued yet…”
  - ES: “Sin eventos programados…”
- Quando o Head cria eventos no painel admin (`/admin/houses/[houseId]`), as ações devem ser registadas com `logHouseHistory` (`events.created`, `events.updated`, `events.deleted`) para manter auditoria.

## Alert Automation (Cron)

- O endpoint de varredura é `POST /api/admin/houses/alerts/run` (proteção `requireAdmin`). Para uso em cron existe o wrapper
  `GET /api/cron/house-alerts` que aceita o header `x-cron-secret`.
- Configura o env `HOUSES_ALERTS_CRON_SECRET` com um valor aleatório (mesmo valor usado no cron job).
- Agenda uma chamada horária (Vercel Cron → `https://.../api/cron/house-alerts`) adicionando o header `x-cron-secret: <SECRET>`.
- O route reutiliza a mesma lógica do botão “Executar scan” e cria linhas em `house_alerts` sempre que o SLA da pool,
  feedback negativo ou outros critérios são detectados automaticamente.
