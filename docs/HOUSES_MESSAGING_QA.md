## QA checklist – Houses messaging & public filters

### 1. Mensagens privadas (Head/Moderador ↔ Membro)
- Logar com um membro que tenha ≥369 XP e navegar para `/houses/[houseKey]/private-area`;
- Verificar se a mensagem de boas-vindas do Head aparece no topo para membro/moderador/Head;
- Confirmar botão “Enviar mensagem…” habilitado apenas para XP≥369; testá-lo com XP abaixo do threshold para ver o texto de desbloqueio;
- Enviar mensagem ao Head/moderador e confirmar que aparece na lista com indicador “Entrante”/“Enviada” conforme o caso;
- Abrir uma mensagem recebida e clicar em “Marcar como lida”; garantir que o Head recebe notificação (ver tabela `notifications`);
- Repetir fluxo com Head/moderador enviando para membro; membros não devem conseguir contactar outros membros ou staff sem XP.

### 2. Global/header
- Logar como qualquer conta e verificar o novo ícone de mensagens ao lado da campainha (`components/layout/Header.tsx`);
- Garantir que o badge mostra o número correto de mensagens não lidas (endpoint `/api/houses/private-messages/unread-count`);
- Confirmar que o link do ícone leva à inbox apropriada (`/admin/houses/messages` para administradores ou `/sports/houses` para demais contas).

### 3. Admin inbox
- Aceder a `/admin/houses/messages` com uma conta com permissão `canManageHouses`;
- Testar filtros por House/status/busca e confirmar que a lista reflete as mudanças imediatamente;
- Validar tags “Unread/Read”, timestamps e campos “From/To” baseado nas mensagens privadas;
- Verificar que “Total messages” e botão “Refresh inbox” funcionam;
- Simular leitura de mensagem pelo membro e garantir que o admin vê o estado atualizado após refresh.

### 4. Página pública de Houses
- Navegar para `/sports/houses` em português, inglês e espanhol;
- Verificar a secção de filtros: alterar estado, desporto, país e ativar o toggle de proximidade (detecta o país do browser);
- Garantir que o resumo de Houses (`StatusSummaryItem`, `XpLeaderSummaryCard`, etc.) responde aos filtros aplicados;
- Confirmar a nova secção “Como liderar uma House” e seus passos traduzidos em cada idioma;
- Testar o botão “Repor filtros” e garantir que limpa todos os selects e toggle.

### 5. Notas técnicas
- Mensagens privadas usam `house_private_messages` + notificações (`notifications` table);
- O guardião de XP/permissões está em `lib/private-messages.ts`, compartilhado entre backend, UI e testes (`tests/private-messages-permissions.test.ts`);
- Filtragem pública usa arrays (`DEFAULT_STATUS_FILTERS`) e `filteredHouses` memorizados para alimentar os summaries e o painel da secção.

Use este ficheiro como base para a validação manual antes de avançar para um deploy.
