import type { GlobalWelcomeConfig, GlobalWelcomeCopy, OnboardingPopupLanguage } from '@/types/onboarding';

const DEFAULT_GLOBAL_WELCOME_COPY: Record<OnboardingPopupLanguage, GlobalWelcomeCopy> = {
  pt: {
    eyebrow: 'APERTUM LEGACY',
    title: 'Bem-vindo ao Apertum Legacy',
    intro: [
      'Sou o freemanpt.',
      'Entraste na base oficial do Legacy — um espaço para quem quer compreender, não apenas consumir.',
      'Aqui não há promessas fáceis nem atalhos artificiais. Há contexto, consistência e preparação real.',
      'Se és novo, faz isto com calma. A plataforma foi pensada para te guiar passo a passo.',
    ],
    sections: [
      {
        title: 'Como ganhas XP (Experiência)',
        body: 'XP prova compromisso. Ganhas XP quando:',
        bullets: [
          'Consomes blog posts oficiais',
          'Concluis cursos completos',
          'Terminas tópicos e lições',
          'Exploras e lês termos do glossário',
        ],
      },
      {
        title: 'Quem lidera a tua House',
        body:
          'Cada House tem um Head, atribuído com base no desporto e país que escolheste. O papel do Head é orientar, não vender nem prometer resultados.',
      },
      {
        title: 'Queres perceber o sistema de XP?',
        body:
          'Vai à página “Como Funciona o XP” para entenderes como o progresso desbloqueia conteúdo mais profundo.',
      },
      {
        title: 'Mensagens privadas (apenas para comprometidos)',
        body:
          'A partir dos 369 XP, desbloqueias mensagens privadas com o Head ou Moderadores. Isto protege os Heads do ruído e mantém o foco em membros realmente ativos.',
      },
      {
        title: 'Pop-ups são comunicação oficial',
        body: 'A tua House comunica através de pop-ups como este. Lê-os com atenção — fazem parte do teu percurso no Legacy.',
      },
      {
        title: 'Mindset (sem filtros)',
        body: 'Se procuras resultados rápidos sem base, esta não é a tua plataforma. Aqui constroem-se fundamentos primeiro. Quem é consistente, acelera depois.',
      },
    ],
    checklistLabel:
      'Declaro que li, compreendi e aceito a Mensagem Inicial do freemanpt (versão atual), e entendo que o Legacy não é uma empresa e que os Heads de House atuam de forma independente.',
    helper: 'Obrigatório no primeiro acesso.',
    confirmPrimary: 'Ir para “Como Funciona o XP” →',
    confirmSecondary: 'Entrar em Cursos',
    confirmTertiary: 'Continuar na plataforma',
  },
  en: {
    eyebrow: 'APERTUM LEGACY',
    title: 'Welcome to Apertum Legacy',
    intro: [
      'I’m freemanpt.',
      'You’ve entered the official Legacy base — a space for those who want to understand, not just consume.',
      'No hype here. Just context, consistency, and real preparation.',
      'If you’re new, take it step by step. The platform is designed to guide you.',
    ],
    sections: [
      {
        title: 'How you earn XP (Experience)',
        body: 'XP proves commitment. You earn XP when you:',
        bullets: [
          'Consume official blog posts',
          'Complete full courses',
          'Finish topics and lessons',
          'Explore and read glossary terms',
        ],
      },
      {
        title: 'Who runs your House',
        body:
          'Each House has a Head, assigned based on the sport and country you selected. The Head’s role is guidance — not selling, not promising outcomes.',
      },
      {
        title: 'Want to understand the XP system?',
        body: 'Go to the “How XP Works” page to learn how progression unlocks deeper content.',
      },
      {
        title: 'Private messages (for committed members only)',
        body:
          'At 369 XP, you unlock private comments in lessons and blog posts plus private messages with the Head or Moderators. This protects Heads from noise and keeps focus on active members.',
      },
      {
        title: 'Pop-ups are official communication',
        body: 'Your House communicates through pop-ups like this one. Read them carefully — they’re part of your Legacy journey.',
      },
      {
        title: 'Mindset (no filters)',
        body: 'If you’re looking for fast results without foundations, this isn’t your platform. We build first. Those who stay consistent accelerate later.',
      },
    ],
    checklistLabel:
      'I declare that I have read, understood, and accepted freemanpt’s Initial Message (current version), and I understand that Legacy is not a company and that House Heads operate independently.',
    helper: 'Mandatory on first access.',
    confirmPrimary: 'Go to “How XP Works” →',
    confirmSecondary: 'Enter Courses',
    confirmTertiary: 'Continue inside the platform',
  },
  es: {
    eyebrow: 'APERTUM LEGACY',
    title: 'Bienvenido a Apertum Legacy',
    intro: [
      'Soy freemanpt.',
      'Has entrado en la base oficial de Legacy — un espacio para quien quiere comprender, no solo consumir.',
      'Aquí no hay hype. Hay contexto, constancia y preparación real.',
      'Si eres nuevo, ve paso a paso. La plataforma está pensada para guiarte.',
    ],
    sections: [
      {
        title: 'Cómo ganas XP (Experiencia)',
        body: 'XP demuestra compromiso. Ganas XP cuando:',
        bullets: [
          'Consumes posts oficiales del blog',
          'Completas cursos completos',
          'Finalizas temas y lecciones',
          'Exploras y lees términos del glosario',
        ],
      },
      {
        title: 'Quién dirige tu House',
        body:
          'Cada House tiene un Head, asignado según el deporte y país que elegiste. El rol del Head es orientar, no vender ni prometer resultados.',
      },
      {
        title: '¿Quieres entender el sistema de XP?',
        body: 'Ve a la página “Cómo Funciona el XP” para ver cómo el progreso desbloquea contenido más profundo.',
      },
      {
        title: 'Mensajes privados (solo para comprometidos)',
        body:
          'A partir de 369 XP, desbloqueas comentarios en lecciones y posts y mensajes privados con el Head o Moderadores. Esto protege a los Heads del ruido y mantiene el foco en miembros activos.',
      },
      {
        title: 'Los pop-ups son comunicación oficial',
        body: 'Tu House se comunica mediante pop-ups como este. Léelos con atención — forman parte de tu recorrido en Legacy.',
      },
      {
        title: 'Mindset (sin filtros)',
        body: 'Si buscas resultados rápidos sin base, esta no es tu plataforma. Aquí se construyen fundamentos primero. La constancia acelera después.',
      },
    ],
    checklistLabel:
      'Declaro que he leído, entendido y aceptado el Mensaje Inicial de freemanpt (versión actual), y entiendo que Legacy no es una empresa y que los Heads de House actúan de forma independiente.',
    helper: 'Obligatorio en el primer acceso.',
    confirmPrimary: 'Ir a “Cómo Funciona el XP” →',
    confirmSecondary: 'Entrar en Cursos',
    confirmTertiary: 'Continuar en la plataforma',
  },
};

const DEFAULT_GLOBAL_WELCOME_CONFIG: GlobalWelcomeConfig = {
  languages: DEFAULT_GLOBAL_WELCOME_COPY,
  updatedAt: null,
};

export { DEFAULT_GLOBAL_WELCOME_COPY, DEFAULT_GLOBAL_WELCOME_CONFIG };
