# House Profile & Governance Payload

This document captures the data contract for the public House page and the
admin governance screens. It enumerates the sources already available in the
database plus the new columns/tables that must be introduced via migrations
before any UI work happens. All frontend consumers should rely on an aggregate
payload served by a dedicated endpoint (see section 4).

---

## 1. Current Data Sources

| Table / View | Purpose |
| ------------ | ------- |
| `houses_of_sports` | Base identity (sport, country, status, hero texts, `house_key`). |
| `house_profiles` | Marketing text (tagline + description) and image. |
| `house_heads` + `admin_assignments` + `users` | Connect a Head to a Supabase user account. |
| `house_moderators` | Additional staff for each House. |
| `house_onboarding_sequences` / `house_onboarding_status` | Pop-up sequence and readiness. |
| `house_term_acceptances` | Members who accepted the responsibility term. |
| `house_xp_totals` + `user_houses` | XP and membership counts. |

These sources already exist and will be reused. New columns are required to
support the six sections of the public profile and the governance dashboard.

---

## 2. New Columns / Tables

### 2.1 `house_profiles`
Add structured JSON columns so we can render each section without untyped blobs:

| Column | Type | Description |
| ------ | ---- | ----------- |
| `mission_i18n` | `jsonb` | House mission (clear purpose and limitations). |
| `limits_i18n` | `jsonb` | Statements about what the House does *not* do. |
| `audience_fit` | `jsonb` | `{ for: string[], not_for: string[] }` in multiple languages. |
| `support_model_i18n` | `jsonb` | Description of how the accompaniment works. |
| `cta_i18n` | `jsonb` | CTA label, helper text, checkbox label. |
| `head_manifesto_i18n` | `jsonb` | 3–5 line manifesto for the Head (per locale). |
| `culture_i18n` | `jsonb` | Principles/values for the private area. |

> All of the above default to `{}` and are nullable while content is being
> migrated.

### 2.2 `houses_of_sports`

| Column | Type | Notes |
| ------ | ---- | ----- |
| `monthly_capacity` | `integer` | Max number of guided users per month. |
| `support_mode` | `text` | Enum: `async`, `sync`, `hybrid`. |
| `governance_status` | `text` | Enum: `active`, `limited`, `paused`, `under_review`. |
| `is_exemplar` | `boolean` | Define se a House exibe o selo “House exemplar”. |

### 2.3 New tables

| Table | Purpose |
| ----- | ------- |
| `house_head_terms` | `id`, `user_id`, `house_id`, `version`, `accepted_at`, `ip_address`, `user_agent`, `payload`. Holds the acceptance snapshot. |
| `house_history` | Generic audit log for status/capacity/head changes. |
| `house_notes` | Internal notes (admin only). |
| `house_alerts` | Alert system (`type`, `severity`, `status`, `details`). |
| `house_join_requests` *(optional)* | Records CTA submissions awaiting manual approval. |
| `house_events` | Structured list of events (`title_i18n`, `description_i18n`, `start_at`, `end_at`, `location`, `visibility`, `link_url`). |
| `house_feedback` | Qualitative feedback/incidentes (`source`, `category`, `sentiment`, `severity`, `status`, `summary`). |
| `house_head_invites` | Convites de Head com token e data de expiração. |

---

## 3. Terms of Responsibility

The official Head term (v1.1) should live in `content/terms/head_v1.1.md`. When
an admin promotes someone to Head the flow is:

1. Load latest term text and version.
2. Show modal with checkbox + acceptance CTA (styled with `/education/xp`
   palette).
3. On accept, store a row in `house_head_terms` with IP, UA, and payload.
4. Only after a stored acceptance is created do we insert/update
   `house_heads`.

If a new version is released we compare `latest_version` vs
`house_head_terms.version` and block high-impact actions until the new version
is signed.

---

## 4. Aggregate Payload (REST Response)

Endpoint suggestion: `GET /api/houses/[houseKey]`.

```ts
type HouseProfileResponse = {
  success: true;
  house: {
    houseKey: string;
    name: string;
    countryCode: string;
    sportCode: string;
    status: 'active' | 'under_construction' | 'in_development' | 'paused';
    badge: 'validated' | 'in_review';
    positioning: { title: string; subtitle: string };
    mission: { title: string; body: string[] };
    limits: string[];
    head: {
      name: string;
      username: string | null;
      photoUrl: string | null;
      country: string | null;
      background: string[];
      relationToLegacy: string | null;
      manifesto: string[];
    };
    audience: {
      for: string[];
      notFor: string[];
    };
    supportModel: {
      description: string[];
      contactMode: 'async' | 'sync' | 'hybrid';
      expectationNotes: string[];
    };
    cta: {
      label: string;
      helper: string;
      checkbox: string;
    };
    metrics: {
      memberCount: number;
      xpTotal: number;
      termAcceptances: number;
      onboarding: {
        publishedPopups: number;
        readyPopups: number;
        draftPopups: number;
        lastUpdate: string | null;
      };
    };
    culture: string[];
  };
};
```

Additional fields for the private area can extend `house` with:

- `recommendedContent`: derived from `house_onboarding_sequences`.
- `broadcasts`: last N items from `onboarding_popup_logs`.
- `events`: list proveniente de `house_events` ordenada cronologicamente.
- `feedback`: agregados rápidos (totais, negativos abertos) vindos de `house_feedback`.
- `alerts`: contadores de alertas por severidade (derivados de `house_alerts`) – útil para o painel.

---

## 5. Visual Consistency

All new pages/components (public House, private House, admin overview, admin
profile) must reuse the styles from `/education/xp`. That means:

- background gradient `from-[#010913] via-[#02121c] to-[#04131b]`.
- cards with subtle borders (`border-white/10`) and glassmorphism shadows.
- buttons using the same gradients (`from-[#fdd87c] via-[#ffd35f] to-[#fcb045]`
  or cyan variants) and typography (`text-[#fdd87c]` for headings).
- spacing, rounded corners, and iconography consistent with the Education XP
  section.

This spec ensures that backend and frontend engineers share the same contract
while we implement the remaining steps in the plan.
