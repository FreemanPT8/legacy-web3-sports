import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Plano Oficial de Onboarding Legacy',
  description:
    'Guia de referencia para Heads e equipas internas aplicarem o plano de onboarding personalizado do Legacy.',
};

type Section = {
  title: string;
  description: string;
  bullets: string[];
};

const sections: Section[] = [
  {
    title: 'Principio estrategico',
    description:
      'O Legacy nao promete acompanhamento humano constante. Promete orientacao justa, progressiva e transparente.',
    bullets: [
      'Os Heads orientam pelo exemplo: pop-ups validados e CTA conscientes substituem promessas vazias.',
      'Governanca clara protege utilizadores, Heads e a reputacao da plataforma.',
      'Cada passo identifica limites e responsabilidades para manter autonomia e reduzir atrito.',
    ],
  },
  {
    title: 'Sequencia oficial',
    description:
      'Todas as Houses podem adaptar triggers, mas esta base garante consistencia e protecao legal.',
    bullets: [
      'Pop-up inicial enviado pela conta FreemanPT: explica que o proximo contacto vira do Head.',
      'Triggers por XP e por conclusao de conteudos (perfil completo, glossario, curso Comeca Aqui).',
      'Limites automaticos: maximo 1 pop-up por dia e 3 por semana, registados no motor de onboarding.',
    ],
  },
  {
    title: 'Termo do Head',
    description:
      'Antes de assumir o cargo, o Head aceita o termo de responsabilidade com registo de IP e user-agent.',
    bullets: [
      'Colocar o interesse da House acima do interesse pessoal; nada de pressao comercial ou hype.',
      'Respeitar autonomia: seguir links, contactar Heads ou aderir a projetos e sempre opcional.',
      'Cumprir limites operacionais (templates, frequencia, auditoria, anti-spam) e aceitar avaliacao continua.',
    ],
  },
  {
    title: 'Checklist operacional',
    description: 'Indicadores minimos para manter o estatuto de House ativa no ecossistema Legacy.',
    bullets: [
      'Zero submissões sem responsavel ou plano de resposta em execucao.',
      'Sem limites di?rios/semanais: pop-ups disparam por XP ou consumo de conte?do e ficam auditados nos logs.',
      'Heads utilizam o painel admin para gerir governaça, alerts e pedidos CTA.',
    ],
  },
];

const resources = [
  {
    title: 'Painel admin de Houses',
    description: 'Gere pedidos CTA, governaça, feedback e alertas.',
    href: '/admin/houses',
  },
  {
    title: 'Centro de conformidade',
    description: 'Checklist semanal e estado do termo de responsabilidade.',
    href: '/admin/onboarding',
  },
  {
    title: 'Documentacao de migrações',
    description: 'Assegura que as tabelas house_head_terms, house_history e house_feedback estao ativas.',
    href: 'https://github.com/FreemanPT8/legacy-web3-sports/tree/main/supabase/migrations',
  },
];

export default function OnboardingDocsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#010913] via-[#00131d] to-[#000a12] px-4 py-12 text-white">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_35px_80px_rgba(1,14,25,0.55)]">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Manual oficial</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Plano de Onboarding Personalizado</h1>
          <p className="mt-3 text-sm text-slate-200">
            Esta pagina resume o plano oficial aprovado para Houses do Legacy. Utiliza como referencia antes de
            publicar pop-ups, aceitar termos ou ligar CTA publicos.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          {sections.map((section) => (
            <article
              key={section.title}
              className="rounded-3xl border border-white/10 bg-[#020b16]/80 p-5 shadow-[0_25px_60px_rgba(0,0,0,0.55)]"
            >
              <h2 className="text-lg font-semibold text-white">{section.title}</h2>
              <p className="mt-2 text-sm text-slate-300">{section.description}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-100">
                {section.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-300" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#011422]/80 p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Recursos</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {resources.map((resource) => (
              <Link
                key={resource.title}
                href={resource.href}
                target={resource.href.startsWith('http') ? '_blank' : undefined}
                rel={resource.href.startsWith('http') ? 'noreferrer' : undefined}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-300/50 hover:bg-cyan-500/10"
              >
                <p className="text-sm font-semibold text-white">{resource.title}</p>
                <p className="mt-1 text-xs text-slate-300">{resource.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <footer className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-slate-200">
          Este guia resume o plano validado em janeiro de 2026. Atualiza este documento sempre que o motor de
          onboarding ou os termos dos Heads receberem nova versao. Mantem logs atualizados no painel admin para
          garantir conformidade.
        </footer>
      </div>
    </main>
  );
}

