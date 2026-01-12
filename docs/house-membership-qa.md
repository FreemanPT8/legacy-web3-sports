# House Membership QA Checklist

Use este roteiro para validar o fluxo manual de governaça das Houses agora que
não existe auto-criação. O objetivo é confirmar que os utilizadores entram na
pool correta, que os Admins criam Houses manualmente e que o batch sincroniza
a membership sem churn.

---

## 1. Utilizador com House existente

1. Escolhe um par `desporto + país` que já tenha House ativa no painel
   (`/admin/houses`).
2. Cria uma conta via `/signup` selecionando o mesmo par.
3. Executa `syncUserHouseMembership` (pode ser via painel ou script) para esse
   utilizador.
4. Verifica em `/admin/houses/[houseId]` que o utilizador aparece na lista de
   membros **sem** criar entradas em `sport_pool_entries`.

## 2. Utilizador sem House criada

1. Escolhe um par `desporto + país` que ainda não tenha House.
2. Ajusta o utilizador (ou cria outro) para esse par.
3. Corre `syncUserHouseMembership` para ele.
4. Valida:
   - Nenhuma row válida de `user_houses` foi removida.
   - `sport_pool_entries` recebeu uma entrada `sport_pending` com
     `status='pending'`, `notes` mencionando `no_house_found` (ou o motivo),
     `sport_id` e `country_code` corretos.
   - O utilizador tem `requires_sport_assignment = true` e
     `sport_assignment_notes` coerentes.

## 3. Criação manual + sincronismo

1. Como Admin com permissão `Manage Houses of Sports`, abre
   `/admin/houses/create` e cria a House para o par do passo anterior.
2. Assim que a House for criada, executa o batch:
   - via `/api/admin/houses/sync-members` (se existir),
   - ou `syncHouseMembersBySportCountry`,
   - ou o script `scripts/process_sport_pending_pool.ts`.
3. Valida que:
   - Todos os utilizadores na pool daquele `sport/country` migraram para
     `user_houses` (membership `MEMBER`).
   - As entradas em `sport_pool_entries` mudaram para `assigned` e têm
     `house_id` preenchido.
   - Os utilizadores afetados perderam o flag `requires_sport_assignment`.

## 4. Evitar churn

1. Edita o utilizador do passo anterior para outro esporte/país e corre
   `syncUserHouseMembership`.
2. Depois volta o utilizador ao par original e corre novamente.
3. Confirma que o processo nunca apaga memberships válidas (mantém a House
   atual quando o par não muda) e que só adiciona/remover quando o par efetivo
   do utilizador muda.

## 5. Documentar resultados

- Guarda evidências (prints, IDs de registros) de cada passo acima.
- Atualiza este ficheiro sempre que o fluxo de governaça mudar (novo tipo de
  pool, múltiplas Houses por par, etc.).
