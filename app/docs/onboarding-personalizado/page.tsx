import type { Metadata } from "next";
import Link from "next/link";

const sections = [
  {
    title: "Princípio estratégico",
    description:
      "O Legacy não promete acompanhamento humano constante; promete orientação clara, justa e progressiva. Este guia explica como manter essa promessa em escala.",
    bullets: [
      "Mensagens guiadas por maturidade (XP) com pop-ups oficiais validados pela House.",
      "Governança transparente para proteger Heads, utilizadores e a reputação da plataforma.",
      "Infra-estrutura que substitui promessas vazias por passos concretos com responsabilidade explícita."
    ]
  },
  {
    title: "Sequência oficial de pop-ups",
    description:
      "Cada House pode personalizar a sua sequência, mas todos partem desta estrutura base para garantir consistência no ecossistema.",
    bullets: [
      "Pop-up Legacy inicial (Freeman PT) com boas-vindas e explicação de que o próximo contacto virá do Head.",
      "Triggers por XP e por conclusão de conteúdos (Glossário, Curso 'Começa Aqui', etc.).",
      "Limites automáticos: 1 pop-up/dia, 3/semana, com estado dos envios registado no motor de onboarding."
    ]
  },
  {
    title: "Termo de responsabilidade do Head",
    description:
      "Antes de assumir o cargo, o Head lê e aceita o termo oficial. O aceite regista IP, user-agent e data para auditoria.",
    bullets: [
      "Interesse da House acima do interesse pessoal (sem pressão comercial nem promessas de rendimento).",
      "Respeito pela autonomia dos utilizadores: seguir links, participar em projetos ou contactar Heads é sempre opcional.",
      "Cumprimento dos limites operacionais (frequência, templates, auditoria, anti-spam) com avaliação contínua."
    ]
  },
  {
    title: "Checklist operacional",
    description: "Indicadores mínimos para manter o estatuto de House ativa.",
    bullets: [
      "Zero submissões sem responsável ou, se existirem, plano de resposta em execução.",
      "Limites oficiais comunicados a todos os membros (pop-ups e broadcasts).",
      "Histórico atualizado no painel admin (pausas, reativações, convites, alertas)."
    ]
  },
  {
    title: "Boas práticas para Heads",
    description: "Táticas para entregar valor sem entrar em modo 'suporte 24/7'.",
    bullets: [
      "Começa sempre pelo conteúdo oficial: Glossário, 'Começa Aqui', House Hub.",
      "Usa mensagens assíncronas e CTA conscientes. O contacto humano é opcional e contextual.",
      "Reporta incidentes e feedback negativo no painel para que o motor de alertas possa agir."
    ]
  },
  {
    title: "Próximos passos",
    description: "Confirma a leitura deste guia e regressa ao painel para gerir sequências e convites.",
    bullets: [
      "Rever as Houses atribuídas em /admin/houses.",
      "Atualizar copy/CTAs em /admin/onboarding e testar com o modal integrado.",
      "Monitorizar pedidos pendentes, eventos e métricas na mesma rotina semanal."
    ]
  }
];

export const metadata: Metadata = {
  title: "Guia oficial do Onboarding Personalizado",
  description: "Referência para Heads e Admins aplicarem o plano escalável de onboarding do Legacy."
};

export default function OnboardingDocsPage() {
  return (
    <div className="min-h-screen bg-[#010913] text-white">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-12">
        <header className="space-y-3">
          <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-300">Guia oficial</p>
          <h1 className="text-3xl font-semibold text-[#fdd87c]">Onboarding Personalizado do Legacy</h1>
          <p className="text-sm text-slate-300">
            Este documento resume o plano fundacional (96/100) e esclarece o que cada House deve respeitar antes de editar
            pop-ups ou aceitar novos membros.
          </p>
        </header>

        <div className="grid gap-6">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#020b16] via-[#031726] to-[#000d16] p-6 shadow-[0_25px_80px_rgba(3,10,25,0.55)]"
            >
              <h2 className="text-xl font-semibold text-white">{section.title}</h2>
              <p className="mt-2 text-sm text-slate-300">{section.description}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-200">
                {section.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2">
                    <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-[#fdd87c]" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#04131b]/80 p-6 text-sm text-slate-300">
          <p>
            Precisas de ajuda prática? Regressa ao painel de onboarding para editar pop-ups ou contacta o suporte interno.
          </p>
          <Link
            href="/admin/onboarding"
            className="mt-3 inline-flex items-center text-[#fdd87c] transition hover:text-white"
          >
            Abrir painel de onboarding
          </Link>
        </div>
      </main>
    </div>
  );
}
