import type { OnboardingPopupData } from '@/components/education/OnboardingPopup';

export type HouseOnboardingAnalytics = {
  ctr: number;
  completionRate: number;
  manualApprovals: number;
  blockedAttempts: number;
};

export type HouseOnboardingSequence = {
  house: string;
  sport: string;
  head: string;
  popups: OnboardingPopupData[];
  analytics: HouseOnboardingAnalytics;
};

const BASE_DEMO: Record<string, HouseOnboardingSequence> = {
  LEGACY: {
    house: 'Legacy',
    sport: 'Multisport',
    head: 'Legacy Council',
    analytics: {
      ctr: 0.68,
      completionRate: 0.82,
      manualApprovals: 26,
      blockedAttempts: 4,
    },
    popups: [
      {
        id: 'legacy-welcome',
        house: 'Legacy',
        xpGate: 'XP 0',
        title: 'Bem-vindo à House oficial do Legacy',
        body: 'Esta é a sequência fundacional: 3 passos essenciais, Glossário e o curso Começa Aqui para eliminar atalhos.',
        highlights: [
          'Checklist obrigatório antes de explorar o resto da plataforma.',
          'CTA secundário abre o mapa da House — sem pressão, só orientação.',
        ],
        badgeLabel: 'XP 0 - Mensagem oficial',
        primaryCta: { label: 'Completar checklist essencial', href: '/education/xp' },
        secondaryCta: { label: 'Ver House Guide', href: '/education/houses' },
      },
      {
        id: 'legacy-autonomy',
        house: 'Legacy',
        xpGate: 'XP 130 + curso Começa Aqui',
        title: 'Autonomia técnica: tutorial Metamask seguro',
        body: 'Antes de desbloquear funcionalidades Web3, a House garante que conheces o básico com um tutorial auditado.',
        highlights: [
          'Sem tutorial concluído, requisitar DAO1 fica bloqueado.',
          'Se precisares de ajuda humana, o Head é notificado.',
        ],
        badgeLabel: 'XP 130 - Autonomia',
        primaryCta: { label: 'Abrir tutorial seguro', href: '/education/courses' },
        secondaryCta: { label: 'Falar com a House', href: '/education/houses' },
      },
      {
        id: 'legacy-dao1',
        house: 'Legacy',
        xpGate: 'XP 260 + briefing DAO1',
        title: 'DAO1: acesso oficial com responsabilidade',
        body: 'A DAO1 é porta de entrada do ecossistema Apertum. Aqui tens o formulário oficial da House com avisos de risco.',
        highlights: [
          'Os Heads analisam manualmente cada pedido.',
          'Logs e auditorias ficam guardados automaticamente.',
        ],
        badgeLabel: 'XP 260 - DAO1',
        primaryCta: { label: 'Pedir acesso oficial', href: '/dao1' },
        secondaryCta: { label: 'Ver briefing completo', href: '/blog/dao1' },
      },
    ],
  },
  BASKETBALL: {
    house: 'House of Basketball',
    sport: 'Basketball',
    head: 'Inês Araujo',
    analytics: {
      ctr: 0.74,
      completionRate: 0.77,
      manualApprovals: 14,
      blockedAttempts: 2,
    },
    popups: [
      {
        id: 'basket-start',
        house: 'House of Basketball',
        xpGate: 'XP 0',
        title: 'House of Basketball — começa em 3 passos',
        body: 'Define a posição onde queres evoluir, completa o Glossário específico e desbloqueia o curso Start Here.',
        highlights: [
          'Os três passos demoram menos de 20 minutos.',
          'Sem pressa: foco em consistência e não em hype.',
        ],
        badgeLabel: 'XP 0 - Sequência House',
        primaryCta: { label: 'Começar checklist', href: '/education/xp' },
        secondaryCta: { label: 'Explorar House', href: '/education/houses' },
      },
      {
        id: 'basket-autonomy',
        house: 'House of Basketball',
        xpGate: 'XP 120',
        title: 'Autonomia Web3 para atletas',
        body: 'Aprende a gerir o teu ID digital com o tutorial Metamask guiado. Sem isto, não avançamos para projetos DAO.',
        highlights: [
          'Tutorial passo-a-passo com validação automática.',
          'Heads ficam disponíveis caso apareçam dúvidas.',
        ],
        badgeLabel: 'XP 120 - Gate técnico',
        primaryCta: { label: 'Abrir tutorial seguro', href: '/education/courses' },
        secondaryCta: { label: 'Contactar Head', href: '/education/houses' },
      },
    ],
  },
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchHouseOnboardingData(houseKey: string): Promise<HouseOnboardingSequence> {
  const key = (houseKey || 'LEGACY').toUpperCase();
  await delay(280 + Math.random() * 200);
  const base = BASE_DEMO[key] ?? BASE_DEMO.LEGACY;
  return {
    ...base,
    popups: base.popups.map((popup) => ({ ...popup })),
  };
}
