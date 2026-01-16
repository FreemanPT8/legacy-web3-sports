# Legacy Onboarding Personalizado

## Visao Geral
- Objetivo: escalar comunicacao por pop-ups sem acompanhamento humano constante, mantendo orientacao justa, progressiva e auditavel.
- Responsaveis: cada Head of House of Sport desenha a narrativa, a sequencia e os triggers da sua House diretamente no Painel Admin.
- Fundamentos: 1 pop-up = 1 decisao util, mensagem nunca parece venda e CTA principal e sempre opcional.

## Arquitetura do Sistema
1. **Painel Admin**
   - Modulo "Comunicacoes" permite criar pop-ups, definir idiomas, CTAs e triggers.
   - Editor com estados rascunho -> pronto -> publicado, versionamento automatico e logs (Head, data, campos alterados).
   - Biblioteca de templates oficiais (5 referencias fundacionais) pronta para duplicar e adaptar.
2. **Motor de triggers**
   - Suporta XP milestones, eventos de conteudo (licoes, cursos, blog posts, assessments) ou combinacoes dos dois.
   - Permite dependencias ("so mostrar depois do tutorial tecnico") e prioridades quando multiplos triggers ficam elegiveis.
3. **Camada de exibicao**
   - Pop-up bloqueia fechar ou navegar durante os 3 primeiros segundos; interface mostra contador e texto "espera 3 segundos - isto e decisivo para a tua House".
   - Depois do bloqueio, o utilizador pode fechar ou ignorar; CTAs continuam opcionais e sem friccao.
4. **Governanca e auditoria**
   - Termo de Responsabilidade tem de ser assinado digitalmente antes do Head poder publicar ou editar.
   - Logs armazenam trigger, idioma, CTA clicado, tempo visivel e se o bloqueio de 3 s foi cumprido.
   - Alertas automaticos disparam se uma House quebrar regras de conformidade, tentar remover o bloqueio ou publicar sem revisao.

## Tipologias de Pop-ups e Triggers
- **XP milestone**: ideal para mensagens estruturais (bem-vindo, autonomia tecnica, desbloqueios DAO1, entrada House Hub). Define XP minimo/maximo e prioridade.
- **Evento de conteudo**: dispara ao concluir licao, curso ou artigo especifico; usado para reforcar sequencia (ex.: "terminaste Glossario, segue para Curso Comeca Aqui").
- **Combinado**: exige XP + evento para temas sensiveis (risco, DAO1) ou gates tecnicos (tutorial Metamask).
- **Dependencias**: qualquer pop-up pode exigir outro como prerequisito. O painel desenha um grafo simples para evitar loops.
- **Idiomas**: copy obrigatoria em PT, EN e ES; fallback automatico para EN se o Head nao preencher uma lingua.

## Workflow no Painel Admin
1. **Conformidade**: Head aceita o Termo (com data e assinatura) -> modulo desbloqueia modo de edicao.
2. **Criar pop-up**: escolher template base, preencher copy multi-idioma, configurar CTA principal/secundario e decidir se ha bloqueio adicional alem dos 3 s.
3. **Definir trigger**: XP, evento de conteudo ou ambos, dependencias e prioridade.
4. **Revisao**: estados rascunho -> pronto -> publicado; regras automatizadas impedem publicar se faltar lingua ou se CTA nao for opcional.
5. **Operacao**: dashboard mostra pop-ups ativos, CTR, tempo medio de visualizacao, taxa de fecho antes dos 3 s, e permite pausar, duplicar ou arquivar mensagens.
6. **Logs**: cada alteracao gera diff e linha auditavel; qualquer tentativa de contornar regras bloqueia a acao e cria alerta para Operacoes.
7. **Sport Pools**: novo painel (`/admin/houses/pools`) centraliza contas que aguardam desporto/House (sem desporto, desporto ainda sem House, ou sugestao de novo desporto). Inclui filtros por estado, desporto e pais, pesquisa por email, ordenacao por recencia/estado, export CSV das entradas filtradas e refresco manual. Ao atribuir/remover um utilizador, o sistema atualiza automaticamente `user_houses`, envia notificacoes internas para Heads e Super Admins e marca essas notificacoes como tratadas assim que a entrada for resolvida. Todos os filtros + a entrada destacada ficam sincronizados com a URL, permitindo partilhar o contexto exacto com operacoes.

## Experiencia do Utilizador
- Modal com temporizador 3 s bloqueando fechar/navegar; indicador discreto explica o motivo.
- CTA principal leva ao proximo passo claro (checklist, tutorial, formulario). CTA secundario ("Conhecer a House", "Explorar recursos") e sempre opcional.
- Sistema regista todas as acoes (CTA principal, CTA secundario, fechar, ignorar) e atualiza o mapa do utilizador.
- Novos triggers entram em fila ("mensagens pendentes") e sao entregues assim que abrir nova janela.
- Conteudo multi-idioma segue preferencia do perfil; se um idioma nao existir, o utilizador recebe a versao EN e o Head recebe alerta para completar a traducao.

## Fluxo recomendado (exemplo base)
> Cada House pode duplicar, remover ou adicionar passos. Este exemplo combina XP e eventos.

| Etapa | Trigger | Foco | CTA | Observacoes |
| --- | --- | --- | --- | --- |
| P1 | XP 0 (primeiro login) | Bem-vindo + 3 passos essenciais | Checklist inicial | Define expectativa sem pressao e apresenta a House. |
| P2 | Evento: Glossario basico concluido | Sequencia correta (perfil > glossario > curso Comeca Aqui) | Seguir caminho recomendado | Mostra itens pendentes e bloqueia conteudos mais avancados ate concluir. |
| P3 | XP 130 **e** Evento: curso Comeca Aqui concluido | Autonomia tecnica | Abrir tutorial Metamask | Gateia features Web3 ate terminar tutorial. |
| P4 | XP 260 **e** Evento: leitura blog DAO1 briefing | Ecosistema Apertum/DAO1 | Formulario DAO1 | Envia pedido de acesso que o Head aprova manualmente. |
| P5 | XP 500 **ou** Evento: curso House finalizado | Integracao House Hub | Abrir House Hub | Liberta broadcast da House e contacto humano opcional. |

## Suporte aos Heads
- **Mapa do utilizador**: timeline com XP atual, pop-ups enviados, triggers proximos, conteudos concluidos e estado de cada CTA.
- **Alertas proativos**: se um trigger perder o conteudo (licao removida ou artigo arquivado), o painel notifica o Head para atualizar.
- **Biblioteca de referencias**: estatisticas de performance por template, exemplos de copy aprovados e boas praticas para XP vs conteudo.
- **Centro de conformidade**: checklist semanal confirma se o Head assinou Termo nos ultimos 90 dias e nao teve incidentes de abuso; em caso negativo, bloqueia novas publicacoes.

## Metricas e Iteracao
- KPIs por House: taxa de clique por pop-up, tempo ate CTA, abandono apos bloqueio 3 s, conclusao de milestones (perfil, glossario, curso, tutorial tecnico, DAO1, House Hub).
- Comparativos XP vs conteudo para descobrir quais triggers geram melhor execucao; painel sugere ajustes com base nesses dados.
- Score de qualidade alvo 95/100; se uma House cair abaixo, o sistema envia alerta, recomenda iteracoes e pode colocar novos pop-ups em revisao obrigatoria.
- Feedback dos membros: micro surveys depois dos principais pop-ups alimentam melhoria continua.

## Proximos Passos Tecnicos
1. Desenhar UX do Painel Admin (CRUD, timeline, preview com temporizador 3 s).
2. Modelar eventos de conteudo e integrar com sistema de XP e tracking existente.
3. Construir middleware de exibicao com bloqueio, fila e logging completo.
4. Implementar auditoria automatizada (validar Termo, idiomas, templates) e canal de alertas para Operacoes.
5. Publicar guia para Heads com sequencias exemplo, boas praticas e checklists de conformidade.
6. Medir piloto com 1-2 Houses antes de abrir para todas; ajustar triggers e UX conforme dados.

## Modelo de Dados Proposto
- `houses`: id, nome, idioma_default, data termo_assinado, head_user_id.
- `popups`: id, house_id, estado (draft/pronto/publicado), template_base, prioridade, bloqueio_padrao (3s), copy_pt/en/es, cta_primary, cta_secondary, created_at, updated_at.
- `popup_triggers`: popup_id, tipo (`xp`, `conteudo`, `combinado`), xp_min, xp_max, conteudo_id, dependencia_popup_id.
- `popup_logs`: popup_id, user_id, trigger_id, exibido_em, bloqueio_aplicado (bool), tempo_ate_fecho, acao (`cta_primary`, `cta_secondary`, `fechou`, `ignorou`).
- `conteudos_eventos`: user_id, conteudo_id, tipo (`licao`, `curso`, `blog`), concluido_em, xp_bruto.
- `head_audits`: head_user_id, termo_aceite_em, violacao_regra (bool), detalhes, resolvido_em.

## Roadmap de Implementacao
1. **Descoberta & alinhamento (Semana 0-1)**
   - Workshops com Heads e produto para confirmar casos de uso e triggers.
   - Definir contrato de eventos de conteudo e fontes (LMS, blog, etc).
2. **MVP Painel & dados (Semana 2-4)**
   - Implementar CRUD de pop-ups com estados e versionamento.
   - Criar APIs para listar/editar pop-ups e armazenar triggers.
   - Integrar assinatura digital do Termo.
3. **Motor e camada de exibicao (Semana 3-6)**
   - Construir serviço que escuta eventos de XP e conteudo, avalia triggers e agenda pop-ups.
   - Implementar modal com bloqueio de 3 s, fila e logging.
4. **Auditoria, alertas e métricas (Semana 5-7)**
   - Dashboards de KPIs, alertas de conformidade e centro de incidentes.
   - Micro surveys pós-pop-up e tracking de CTA.
5. **Piloto controlado (Semana 8-9)**
   - Ativar em 1-2 Houses, recolher feedback qualitativo, ajustar copies e thresholds.
6. **Rollout amplo (Semana 10+)**
   - Documentação final, formação dos restantes Heads, monitorização contínua.

## Auditoria e Segurança
- **Assinatura do Termo**: armazenada com hash e timestamp; alterações exigem revalidação. Sem assinatura válida, o módulo fica somente leitura.
- **Controlo de alterações**: cada publicação de pop-up gera diff e assinatura digital, impedindo edições não auditadas.
- **Alertas automáticos**: e-mails/slack para Operações quando um Head tenta remover bloqueio 3 s ou quando uma House faz mais de 2 broadcasts no mês.
- **Anti-abuso**: se um pop-up apresenta CTR anormalmente alto/baixo ou gera reclamações, o sistema pode pausá-lo automaticamente e solicitar revisão.
- **Privacidade**: logs armazenam apenas dados necessários (IDs e timestamps), seguindo LGPD/GDPR; acessos ao painel são auditados.

## Testes e Qualidade
- **Testes unitários** para motor de triggers (XP e eventos) e fila.
- **Testes E2E** simulando utilizadores em diferentes casas/idiomas, garantindo bloqueio 3 s e CTAs opcionais.
- **Testes de carga** no motor de eventos para assegurar que milhares de triggers simultâneos não duplicam pop-ups.
- **Planos de rollback**: possibilidade de desligar o motor ou reverter para sequência “baseline” caso algum pop-up cause fricção excessiva.
