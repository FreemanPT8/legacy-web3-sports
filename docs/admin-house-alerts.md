# Admin House Alerts – Requirements

Context: `house_alerts` was added in the governance migration with the structure
`(id, house_id, type, severity, status, details, created_at, resolved_at, resolved_by)`.
To expose this in the admin UI we need:

## Data we must retrieve

1. **List of open alerts**  
   - Fields: id, house_id, type, severity, created_at, details summary.  
   - Join with `houses_of_sports` to show `house_key` + display name.
2. **Filter / search**  
   - Filter by severity (`low`, `medium`, `high`) and status (`open`, `in_progress`, `resolved`).  
   - Optional search by `house_key` or `type`.
3. **Resolve / escalate actions**  
   - Admin must be able to mark an alert as resolved (`status='resolved'`, `resolved_at=now`, `resolved_by=user`).  
   - Optional future state: `status='in_progress'`.
4. **Metrics**  
   - Count of alerts grouped by severity for quick badges (already computed in overview API).  
   - For detail page we only need the raw list + metadata.

## API Contract

`GET /api/admin/houses/alerts?status=open&severity=high`

Returns:

```ts
type HouseAlertDTO = {
  id: string;
  houseId: string;
  houseKey: string;
  houseName: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'resolved';
  details: Record<string, any>;
  createdAt: string;
  resolvedAt: string | null;
};
```

`PATCH /api/admin/houses/alerts/:id`

Payload: `{ status: 'resolved' | 'in_progress' }`. On resolve we set `resolved_at` and `resolved_by`.

## UI expectations

- Same palette as `/education/xp` (gradient background, bordered cards, cyan/dourado highlights).
- Table/List view with:
  - House (name + key)
  - Tipo
  - Severidade (badge color-coded)
  - Data
  - Botão “Marcar como resolvido” (apenas para alertas `open`)
- Toast feedback on success/erro + SWR mutate para refrescar lista.
