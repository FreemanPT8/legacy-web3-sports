'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SafeImage } from '@/app/components/SafeImage';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  HeroDescription,
  HeroEyebrow,
  HeroSection,
  HeroTextColumn,
  HeroTitle,
} from '@/components/sections/HeroSection';
import { Switch } from '@/components/ui/switch';

type HouseStatus = 'IN_DEVELOPMENT' | 'UNDER_CONSTRUCTION' | 'ACTIVE';

const DEFAULT_STATUS_FILTERS: HouseStatus[] = [
  'ACTIVE',
  'UNDER_CONSTRUCTION',
  'IN_DEVELOPMENT',
];

interface House {
  id: string;
  name: string;
  avatar_url?: string | null;
  cover_image_url?: string | null;
  member_count?: number;
  xp_total?: number;
  house_key?: string | null;
  country_code: string | null;
  status: HouseStatus;
  created_at: string | null;
  sport: {
    id: string;
    code: string;
    name: string;
  } | null;
  head: {
    user_id: string;
    username: string | null;
    full_name: string | null;
    role: string | null;
    avatar_url: string | null;
  } | null;
  moderators: {
    user_id: string;
    username: string | null;
    full_name: string | null;
    role: string | null;
    avatar_url: string | null;
  }[];
  xp_breakdown?: {
    head: number;
    moderators: number;
    members: number;
  } | null;
  participant_breakdown?: {
    total: number;
    head: number;
    moderators: number;
    members: number;
  } | null;
}

interface HousesApiResponse {
  success: boolean;
  houses?: House[];
  error?: string;
}

interface HouseLeaderboardEntry {
  houseId: string;
  totalXp: number | string;
  memberCount: number | string;
  status: string;
  xpBreakdown?: {
    head?: number | string;
    moderators?: number | string;
    members?: number | string;
  } | null;
  participantBreakdown?: {
    total?: number | string;
    head?: number | string;
    moderators?: number | string;
    members?: number | string;
  } | null;
}

interface HouseLeaderboardResponse {
  success: boolean;
  leaderboard?: HouseLeaderboardEntry[];
  error?: string;
}

const COPY = {
  pt: {
    heroEyebrow: 'HOUSES OF SPORTS',
    heroTitle: 'Explora as Houses',
    heroIntro:
      'Cada House of Sports é uma comunidade que junta desporto, formação Web3 e networking local. Descobre onde estas Houses já estão ativas, quais estão em construção e as próximas a chegar ao ecossistema LEGACY.',
    heroIntro2:
      'Escolhe a House alinhada com o teu desporto e contexto ou usa este mapa para perceber onde podes liderar uma nova iniciativa.',
    mapLabel: 'Mapa de Houses',
    mapBreakdownPrefix: 'Ativas',
    mapBreakdownMiddle: 'Em construção',
    mapBreakdownSuffix: 'Em desenvolvimento',
    topXpTitle: 'HOUSE COM MAIS XP TOTAL',
    topMembersTitle: 'HOUSE COM MAIS MEMBROS',
    noXpLeader: 'Ainda não existem Houses com XP registada.',
    noMembersLeader: 'Ainda não existem Houses com membros registados.',
    xpAccumulated: 'XP acumulada',
    membersLabel: 'Membros',
    sectionActiveTitle: 'Houses ativas',
    sectionActiveDesc:
      'Comunidades que já estão a receber membros e a testar formatos de aprendizagem, treino e networking.',
    sectionConstructionTitle: 'Houses em construção',
    sectionConstructionDesc:
      'Houses a ganhar forma: definição de equipa, visão interna e primeiros membros próximos da comunidade.',
    sectionDevelopmentTitle: 'Houses em desenvolvimento',
    sectionDevelopmentDescTeam:
      'Visão interna para quem está a desenhar o futuro do mapa de Houses e do ecossistema LEGACY.',
    sectionDevelopmentDescPublic:
      'Houses em fase inicial de desenho e validação internas. Visíveis apenas para a equipa LEGACY.',
    sectionCountSingle: 'House',
    sectionCountPlural: 'Houses',
    loadingTitle: 'A carregar Houses of Sports...',
    loadingDesc:
      'Estamos a buscar o mapa atualizado das Houses. Isto pode demorar alguns segundos.',
    emptyTitle: 'Ainda não existem Houses of Sports visíveis.',
    emptyDesc:
      'A equipa do LEGACY está a preparar a primeira vaga de comunidades. Mantém-te atento ao portal e à Academia.',
    filtersTitle: 'Filtra as Houses',
    filtersSubtitle:
      'Combina estado, desporto, país e proximidade para encontrar a comunidade ideal.',
    filtersStatusLabel: 'Estado',
    filtersSportLabel: 'Desporto',
    filtersSportPlaceholder: 'Todos os desportos',
    filtersCountryLabel: 'País',
    filtersCountryPlaceholder: 'Todos os países',
    filtersProximityLabel: 'Proximidade preferida',
    filtersProximityHint: 'Mostra Houses no teu país ({country}) quando ativado.',
    filtersProximityHintNoLocation: 'Ativa a proximidade para destacar Houses próximas de ti.',
    filtersActiveCount: '{count} Houses em destaque',
    filtersReset: 'Repor filtros',
    errorLoading: 'Erro ao carregar Houses of Sports.',
    headLabel: 'Head of House',
    headPending: 'Head of House a definir.',
    modsLabel: 'Moderadores',
    modsNone: 'Sem moderadores definidos ainda.',
    membersLabelCard: 'Membros',
    xpLabelCard: 'XP Total',
    membersExamplePrefix: ' (ex: ',
    nextStepTitle: 'PRÓXIMO PASSO',
    nextStepBody:
      'Quando te sentires pronto, cria conta. Ligamos o teu perfil automaticamente à melhor House disponível ou mantemos-te em pool até nascer uma comunidade para o teu país e desporto.',
    nextStepPrimary: 'Criar conta no LEGACY',
    nextStepSecondary: 'Começar pela Academia',
    journeyTitle: 'COMO ESTA PÁGINA SE LIGA AO TEU CAMINHO',
    journeyBullet1:
      'Na página de entrada do LEGACY tu entendes o que é o portal e porque é que a Apertum se cruza com desporto.',
    journeyBullet2:
      'Aqui vês onde já existem comunidades a nascer por desporto, país e estado das Houses (ativas, em construção ou em desenvolvimento).',
    journeyBullet3:
      'No passo seguinte, ao criares conta respondes a um formulário simples, mostras quem és e o que procuras. A partir daí a equipa consegue orientar-te com muito mais precisão.',
    journeyFooter:
      'Não precisas de entrar em tudo. A ideia é perceber onde faz sentido colocar a tua energia - como membro, como líder ou simplesmente como alguém que quer aprender com estrutura.',
    leadSectionTitle: 'Como liderar uma House',
    leadSectionSubtitle:
      'Coordena visão, equipa e ação para criar uma comunidade Web3 inspiradora.',
    leadSteps: [
      {
        title: 'Passo 1',
        description: 'Define a missão, o desporto e os indicadores que a tua House vai perseguir.',
      },
      {
        title: 'Passo 2',
        description:
          'Reúne moderadores e membros iniciais que equilibrem experiência e vontade de aprender.',
      },
      {
        title: 'Passo 3',
        description:
          'Partilha rituais e experiências exclusivas que marcam a cultura da tua comunidade.',
      },
    ],
  },
  en: {
    heroEyebrow: 'HOUSES OF SPORTS',
    heroTitle: 'Explore the Houses',
    heroIntro:
      'Each House of Sports is a community that blends sport, Web3 training, and local networking. Discover which Houses are active, which are under construction, and what is coming next in the LEGACY ecosystem.',
    heroIntro2:
      'Choose the House aligned with your sport and context or use this map to see where you could lead a new initiative.',
    mapLabel: 'Houses Map',
    mapBreakdownPrefix: 'Active',
    mapBreakdownMiddle: 'Under construction',
    mapBreakdownSuffix: 'In development',
    topXpTitle: 'HOUSE WITH MOST TOTAL XP',
    topMembersTitle: 'HOUSE WITH MOST MEMBERS',
    noXpLeader: 'There are no Houses with recorded XP yet.',
    noMembersLeader: 'There are no Houses with registered members yet.',
    xpAccumulated: 'XP accumulated',
    membersLabel: 'Members',
    sectionActiveTitle: 'Active Houses',
    sectionActiveDesc:
      'Communities already welcoming members and testing learning, training, and networking formats.',
    sectionConstructionTitle: 'Houses under construction',
    sectionConstructionDesc:
      'Houses taking shape: team definition, internal vision, and first members joining the community.',
    sectionDevelopmentTitle: 'Houses in development',
    sectionDevelopmentDescTeam:
      'Internal view for the team shaping the future Houses map and the LEGACY ecosystem.',
    sectionDevelopmentDescPublic:
      'Early-stage Houses under internal validation. Visible only to the LEGACY team.',
    sectionCountSingle: 'House',
    sectionCountPlural: 'Houses',
    loadingTitle: 'Loading Houses of Sports...',
    loadingDesc:
      'We are fetching the latest Houses map. This may take a few seconds.',
    emptyTitle: 'There are no visible Houses of Sports yet.',
    emptyDesc:
      'The LEGACY team is preparing the first wave of communities. Stay tuned to the portal and the Academy.',
    filtersTitle: 'Find your House',
    filtersSubtitle:
      'Mix status, sport, country, and proximity to narrow down the right community.',
    filtersStatusLabel: 'Status',
    filtersSportLabel: 'Sport',
    filtersSportPlaceholder: 'All sports',
    filtersCountryLabel: 'Country',
    filtersCountryPlaceholder: 'All countries',
    filtersProximityLabel: 'Proximity focus',
    filtersProximityHint: 'Highlight Houses in {country} when enabled.',
    filtersProximityHintNoLocation:
      'Enable proximity to prioritize Houses near your locale.',
    filtersActiveCount: '{count} Houses available',
    filtersReset: 'Reset filters',
    errorLoading: 'Failed to load Houses of Sports.',
    headLabel: 'Head of House',
    headPending: 'Head of House to be defined.',
    modsLabel: 'Moderators',
    modsNone: 'No moderators defined yet.',
    membersLabelCard: 'Members',
    xpLabelCard: 'Total XP',
    membersExamplePrefix: ' (e.g. ',
    nextStepTitle: 'NEXT STEP',
    nextStepBody:
      'When you feel ready, create an account. We automatically connect your profile to the best available House or keep you in the pool until a community exists for your country and sport.',
    nextStepPrimary: 'Create a LEGACY account',
    nextStepSecondary: 'Start with the Academy',
    journeyTitle: 'HOW THIS PAGE CONNECTS TO YOUR PATH',
    journeyBullet1:
      'On the LEGACY entry page you learn what the portal is and why Apertum intersects with sport.',
    journeyBullet2:
      'Here you see where communities already exist by sport, country, and House status (active, under construction, or in development).',
    journeyBullet3:
      'Next, when you create an account you fill a simple form, show who you are and what you seek. From there the team can guide you with much more precision.',
    journeyFooter:
      'You do not need to join everything. The idea is to see where it makes sense to invest your energy - as a member, as a leader, or simply as someone who wants structured learning.',
    leadSectionTitle: 'How to lead a House',
    leadSectionSubtitle:
      'Build momentum by aligning vision, people, and experiences.',
    leadSteps: [
      {
        title: 'Step 1',
        description: 'Clarify the sport, values, and goals that define your House.',
      },
      {
        title: 'Step 2',
        description:
          'Gather your leadership team and recruit members with complementary XP.',
      },
      {
        title: 'Step 3',
        description:
          'Launch shared rituals and learning moments that set the tone.',
      },
    ],
  },
  es: {
    heroEyebrow: 'HOUSES OF SPORTS',
    heroTitle: 'Explora las Houses',
    heroIntro:
      'Cada House of Sports es una comunidad que une deporte, formación Web3 y networking local. Descubre qué Houses están activas, cuáles están en construcción y lo que viene en el ecosistema LEGACY.',
    heroIntro2:
      'Elige la House alineada con tu deporte y contexto o usa este mapa para ver dónde puedes liderar una nueva iniciativa.',
    mapLabel: 'Mapa de Houses',
    mapBreakdownPrefix: 'Activas',
    mapBreakdownMiddle: 'En construcción',
    mapBreakdownSuffix: 'En desarrollo',
    topXpTitle: 'HOUSE CON MÁS XP TOTAL',
    topMembersTitle: 'HOUSE CON MÁS MIEMBROS',
    noXpLeader: 'Aún no existen Houses con XP registrada.',
    noMembersLeader: 'Aún no existen Houses con miembros registrados.',
    xpAccumulated: 'XP acumulada',
    membersLabel: 'Miembros',
    sectionActiveTitle: 'Houses activas',
    sectionActiveDesc:
      'Comunidades que ya reciben miembros y prueban formatos de aprendizaje, entrenamiento y networking.',
    sectionConstructionTitle: 'Houses en construcción',
    sectionConstructionDesc:
      'Houses tomando forma: definición del equipo, visión interna y primeros miembros cerca de la comunidad.',
    sectionDevelopmentTitle: 'Houses en desarrollo',
    sectionDevelopmentDescTeam:
      'Vista interna para quienes están construyendo el futuro mapa de Houses y el ecosistema LEGACY.',
    sectionDevelopmentDescPublic:
      'Houses en fase inicial de diseño y validación interna. Visibles solo para el equipo LEGACY.',
    sectionCountSingle: 'House',
    sectionCountPlural: 'Houses',
    loadingTitle: 'Cargando Houses of Sports...',
    loadingDesc:
      'Estamos buscando el mapa actualizado de Houses. Esto puede tardar algunos segundos.',
    emptyTitle: 'Aún no hay Houses of Sports visibles.',
    emptyDesc:
      'El equipo LEGACY está preparando la primera ola de comunidades. Mantente atento al portal y a la Academia.',
    filtersTitle: 'Encuentra tu House',
    filtersSubtitle:
      'Combina estado, deporte, país y proximidad para acotar la comunidad correcta.',
    filtersStatusLabel: 'Estado',
    filtersSportLabel: 'Deporte',
    filtersSportPlaceholder: 'Todos los deportes',
    filtersCountryLabel: 'País',
    filtersCountryPlaceholder: 'Todos los países',
    filtersProximityLabel: 'Proximidad activa',
    filtersProximityHint: 'Muestra Houses en {country} cuando está activo.',
    filtersProximityHintNoLocation:
      'Activa la proximidad para priorizar Houses cercanas a ti.',
    filtersActiveCount: '{count} Houses disponibles',
    filtersReset: 'Reiniciar filtros',
    errorLoading: 'No se pudieron cargar las Houses of Sports.',
    headLabel: 'Head of House',
    headPending: 'Head of House por definir.',
    modsLabel: 'Moderadores',
    modsNone: 'Aún no hay moderadores definidos.',
    membersLabelCard: 'Miembros',
    xpLabelCard: 'XP total',
    membersExamplePrefix: ' (ej: ',
    nextStepTitle: 'PRÓXIMO PASO',
    nextStepBody:
      'Cuando estés listo, crea una cuenta. Conectamos tu perfil automáticamente a la mejor House disponible o te dejamos en la pool hasta que exista una comunidad para tu país y deporte.',
    nextStepPrimary: 'Crear cuenta en LEGACY',
    nextStepSecondary: 'Empezar por la Academia',
    journeyTitle: 'CÓMO ESTA PÁGINA SE CONECTA A TU CAMINO',
    journeyBullet1:
      'En la página de entrada de LEGACY entiendes qué es el portal y por qué Apertum se cruza con el deporte.',
    journeyBullet2:
      'Aquí ves dónde ya existen comunidades por deporte, país y estado de House (activas, en construcción o en desarrollo).',
    journeyBullet3:
      'Luego, al crear una cuenta respondes a un formulario sencillo, muestras quién eres y lo que buscas. Desde ahí el equipo puede orientarte con más precisión.',
    journeyFooter:
      'No necesitas entrar en todo. La idea es entender dónde tiene sentido poner tu energía - como miembro, como líder o como alguien que quiere aprender con estructura.',
    leadSectionTitle: 'Cómo liderar una House',
    leadSectionSubtitle:
      'Diseña visión, equipo y acciones que inspiren a la comunidad.',
    leadSteps: [
      {
        title: 'Paso 1',
        description: 'Define la misión, el deporte y la propuesta de valor de tu House.',
      },
      {
        title: 'Paso 2',
        description:
          'Reúne moderadores y miembros fundadores con XP diverso y ganas de liderar.',
      },
      {
        title: 'Paso 3',
        description:
          'Lanza experiencias y rituales que marquen la cultura de tu comunidad.',
      },
    ],
  },
} as const;

const STATUS_LABELS: Record<HouseStatus, Record<'pt' | 'en' | 'es', string>> = {
  ACTIVE: {
    pt: 'Ativa',
    en: 'Active',
    es: 'Activa',
  },
  UNDER_CONSTRUCTION: {
    pt: 'Em construção',
    en: 'Under construction',
    es: 'En construcción',
  },
  IN_DEVELOPMENT: {
    pt: 'Em desenvolvimento',
    en: 'In development',
    es: 'En desarrollo',
  },
};

const LOCALE_MAP: Record<'pt' | 'en' | 'es', string> = {
  pt: 'pt-PT',
  en: 'en-US',
  es: 'es-ES',
};

const STATUS_BADGE_CLASSES: Record<HouseStatus, string> = {
  ACTIVE:
    'inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-200',
  UNDER_CONSTRUCTION:
    'inline-flex items-center rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-medium text-amber-200',
  IN_DEVELOPMENT:
    'inline-flex items-center rounded-full border border-slate-400/40 bg-slate-500/10 px-2.5 py-0.5 text-[10px] font-medium text-slate-200',
};

const numeric = (value: unknown, fallback = 0) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const normalizeBreakdown = (
  source?: {
    head?: unknown;
    moderators?: unknown;
    members?: unknown;
  } | null,
) => {
  if (!source) return null;
  return {
    head: numeric(source.head, 0),
    moderators: numeric(source.moderators, 0),
    members: numeric(source.members, 0),
  };
};

const normalizeParticipants = (
  source?: {
    total?: unknown;
    head?: unknown;
    moderators?: unknown;
    members?: unknown;
  } | null,
) => {
  if (!source) return null;
  return {
    total: numeric(source.total, 0),
    head: numeric(source.head, 0),
    moderators: numeric(source.moderators, 0),
    members: numeric(source.members, 0),
  };
};

export default function HousesPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const localeKey = (language === 'pt' || language === 'es' || language === 'en') ? language : 'en';
  const copy = useMemo(() => COPY[localeKey], [localeKey]);
  const locale = LOCALE_MAP[localeKey];
  const isLegacyTeam = user?.role === 'Admin' || user?.role === 'Super Admin';

  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilters, setStatusFilters] = useState<HouseStatus[]>(DEFAULT_STATUS_FILTERS);
  const [selectedSport, setSelectedSport] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const localeFromBrowser = navigator.language || 'en-US';
    const [, country] = localeFromBrowser.split('-');
    if (country) {
      setDetectedCountry(country.toUpperCase());
    }
  }, []);

  useEffect(() => {
    const fetchHouses = async () => {
      setLoading(true);
      setError(null);

      try {
        const [housesRes, leaderboardRes] = await Promise.all([
          fetch(`/api/sports/houses?locale=${encodeURIComponent(localeKey)}`),
          fetch('/api/leaderboard/houses?limit=500'),
        ]);

        const housesJson: HousesApiResponse = await housesRes.json();
        if (!housesRes.ok || !housesJson.success) {
          throw new Error(housesJson.error || copy.errorLoading);
        }

        let leaderboardMap = new Map<string, HouseLeaderboardEntry>();
        if (leaderboardRes.ok) {
          const leaderboardJson: HouseLeaderboardResponse = await leaderboardRes.json();
          if (leaderboardJson.success && Array.isArray(leaderboardJson.leaderboard)) {
            leaderboardMap = new Map(
              leaderboardJson.leaderboard.map((entry) => [entry.houseId, entry]),
            );
          }
        }

        const enhancedHouses = (housesJson.houses || []).map((house) => {
          const leaderboardEntry = leaderboardMap.get(house.id);
          const xpBreakdown =
            normalizeBreakdown(leaderboardEntry?.xpBreakdown) ||
            normalizeBreakdown(house.xp_breakdown) || {
              head: 0,
              moderators: 0,
              members: 0,
            };
          const participantBreakdown =
            normalizeParticipants(leaderboardEntry?.participantBreakdown) ||
            normalizeParticipants(house.participant_breakdown);

          return {
            ...house,
            xp_total: numeric(leaderboardEntry?.totalXp ?? house.xp_total, 0),
            member_count: numeric(leaderboardEntry?.memberCount ?? house.member_count, 0),
            xp_breakdown: xpBreakdown,
            participant_breakdown: participantBreakdown,
          };
        });

        setHouses(enhancedHouses);
      } catch (err: any) {
        console.error('Erro ao carregar Houses:', err);
        setError(err?.message || copy.errorLoading);
      } finally {
        setLoading(false);
      }
    };

    fetchHouses();
  }, [copy.errorLoading, localeKey]);

  const toggleStatusFilter = (status: HouseStatus) => {
    setStatusFilters((prev) => {
      if (prev.includes(status)) {
        if (prev.length === 1) return prev;
        return prev.filter((current) => current !== status);
      }
      return [...prev, status];
    });
  };

  const resetFilters = () => {
    setStatusFilters(DEFAULT_STATUS_FILTERS);
    setSelectedSport('all');
    setSelectedCountry('all');
    setNearbyOnly(false);
  };

  const sportOptions = useMemo(() => {
    const map = new Map<string, string>();
    houses.forEach((house) => {
      if (house.sport) {
        map.set(house.sport.id, house.sport.name);
      }
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [houses]);

  const countryOptions = useMemo(() => {
    const codes = Array.from(
      new Set(
        houses
          .map((house) => house.country_code?.toUpperCase() || '')
          .filter(Boolean),
      ),
    );
    return codes.sort((a, b) => a.localeCompare(b));
  }, [houses]);

  const filteredHouses = useMemo(() => {
    const normalizedStatus = new Set(statusFilters);
    return houses.filter((house) => {
      if (!normalizedStatus.has(house.status)) {
        return false;
      }
      if (selectedSport !== 'all' && house.sport?.id !== selectedSport) {
        return false;
      }
      if (selectedCountry !== 'all') {
        const countryCode = house.country_code?.toUpperCase() || '';
        if (countryCode !== selectedCountry) {
          return false;
        }
      }
      if (nearbyOnly && detectedCountry) {
        const countryCode = house.country_code?.toUpperCase() || '';
        if (countryCode !== detectedCountry) {
          return false;
        }
      }
      return true;
    });
  }, [
    houses,
    statusFilters,
    selectedSport,
    selectedCountry,
    nearbyOnly,
    detectedCountry,
  ]);

  const {
    active,
    underConstruction,
    inDevelopment,
    xpLeader,
    membersLeader,
    totals,
  } = useMemo(() => {
    const active: House[] = [];
    const underConstruction: House[] = [];
    const inDevelopment: House[] = [];

    for (const h of filteredHouses) {
      if (h.status === 'ACTIVE') active.push(h);
      else if (h.status === 'UNDER_CONSTRUCTION') underConstruction.push(h);
      else inDevelopment.push(h);
    }

    const totals = {
      total: filteredHouses.length,
      active: active.length,
      underConstruction: underConstruction.length,
      inDevelopment: inDevelopment.length,
    };

    const sortByXpThenMembers = (list: House[]) =>
      list
        .slice()
        .sort((a, b) => {
          const xpDiff = (b.xp_total ?? 0) - (a.xp_total ?? 0);
          if (xpDiff !== 0) return xpDiff;
          const memberDiff = (b.member_count ?? 0) - (a.member_count ?? 0);
          if (memberDiff !== 0) return memberDiff;
          return (a.name || '').localeCompare(b.name || '');
        });

    const sortByMembersThenXp = (list: House[]) =>
      list
        .slice()
        .sort((a, b) => {
          const memberDiff = (b.member_count ?? 0) - (a.member_count ?? 0);
          if (memberDiff !== 0) return memberDiff;
          const xpDiff = (b.xp_total ?? 0) - (a.xp_total ?? 0);
          if (xpDiff !== 0) return xpDiff;
          return (a.name || '').localeCompare(b.name || '');
        });

    const housesWithXp = filteredHouses.filter((house) => (house.xp_total ?? 0) > 0);
    const xpPool = housesWithXp.length > 0 ? housesWithXp : filteredHouses;
    const xpLeader = xpPool.length > 0 ? sortByXpThenMembers(xpPool)[0] ?? null : null;

    const housesWithMembers = filteredHouses.filter((house) => (house.member_count ?? 0) > 0);
    const membersPool = housesWithMembers.length > 0 ? housesWithMembers : filteredHouses;
    const membersLeader =
      membersPool.length > 0 ? sortByMembersThenXp(membersPool)[0] ?? null : null;

    return {
      active,
      underConstruction,
      inDevelopment,
      xpLeader,
      membersLeader,
      totals,
    };
  }, [filteredHouses]);

  const visibleInDevelopment = isLegacyTeam ? inDevelopment : [];
  const totalSummaryValue = totals.total.toLocaleString(locale);
  const statusBreakdownDescription = `${copy.mapBreakdownPrefix}: ${totals.active} · ${copy.mapBreakdownMiddle}: ${totals.underConstruction} · ${copy.mapBreakdownSuffix}: ${totals.inDevelopment}`;

  return (
    <div className="min-h-screen bg-[#000c12] text-white flex flex-col">
      <Header />

      <main className="flex-1 bg-[#000c12]">
        {/* HERO / INTRO */}
        <div className="px-6 py-12 md:py-16">
          <HeroSection>
            <HeroTextColumn className="mx-auto max-w-5xl space-y-6">
              <div className="space-y-4">
                <HeroEyebrow>{copy.heroEyebrow}</HeroEyebrow>
                <HeroTitle className="text-3xl md:text-4xl">{copy.heroTitle}</HeroTitle>
                <HeroDescription className="max-w-3xl text-slate-200 md:text-base">
                  {copy.heroIntro}
                </HeroDescription>
                <HeroDescription className="max-w-3xl text-slate-200 md:text-base">
                  {copy.heroIntro2}
                </HeroDescription>
              </div>

              <div className="grid gap-4 rounded-2xl border border-white/10 bg-[#04131b]/80 p-4 shadow-[0_20px_60px_rgba(3,10,25,0.65)] md:grid-cols-3 md:p-6">
                <StatusSummaryItem
                  label={copy.mapLabel}
                  value={totalSummaryValue}
                  description={statusBreakdownDescription}
                />
                <XpLeaderSummaryCard house={xpLeader} copy={copy} locale={locale} />
                <MembersLeaderSummaryCard house={membersLeader} copy={copy} locale={locale} />
              </div>

              <div className="grid gap-6 border-t border-white/10 pt-6 md:grid-cols-[1.8fr,1.2fr]">
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-200">
                    {copy.journeyTitle}
                  </h2>
                  <ul className="space-y-2 text-sm text-slate-200">
                    <li>
                      {copy.journeyBullet1}
                    </li>
                    <li>
                      {copy.journeyBullet2}
                    </li>
                    <li>
                      {copy.journeyBullet3}
                    </li>
                  </ul>
                  <p className="text-xs text-slate-200">
                    {copy.journeyFooter}
                  </p>
                </div>

                <div className="space-y-3 rounded-2xl border border-white/10 bg-[#04131b]/80 p-4 shadow-[0_20px_60px_rgba(3,10,25,0.65)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200">
                    {copy.nextStepTitle}
                  </p>
                  <p className="text-sm text-slate-200">
                    {copy.nextStepBody}
                  </p>
                  <div className="flex flex-wrap gap-3 pt-1">
                    <Button
                      asChild
                      size="sm"
                      className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_25px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
                    >
                      <Link href="/signup">{copy.nextStepPrimary}</Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="border-white/40 text-white hover:bg-white/10"
                    >
                      <Link href="/education/courses">{copy.nextStepSecondary}</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </HeroTextColumn>
          </HeroSection>
        </div>

        {/* LISTAS DE HOUSES */}
        <section className="relative px-6 py-12 md:py-16">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#021c27]" />
          </div>
          <div className="relative mx-auto max-w-6xl space-y-10">
            <FilterPanel
              copy={copy}
              localeKey={localeKey}
              statusFilters={statusFilters}
              toggleStatus={toggleStatusFilter}
              resetFilters={resetFilters}
              selectedSport={selectedSport}
              setSelectedSport={setSelectedSport}
              sportOptions={sportOptions}
              selectedCountry={selectedCountry}
              setSelectedCountry={setSelectedCountry}
              countryOptions={countryOptions}
              nearbyOnly={nearbyOnly}
              setNearbyOnly={setNearbyOnly}
              detectedCountry={detectedCountry}
              filteredCount={totals.total}
            />
            {error && (
              <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#04131b] px-6 py-10 text-center shadow-[0_20px_60px_rgba(3,10,25,0.65)]">
                <p className="text-sm font-medium text-white">
                  {copy.loadingTitle}
                </p>
                <p className="text-xs text-slate-200">
                  {copy.loadingDesc}
                </p>
              </div>
            ) : houses.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#04131b] px-6 py-10 text-center shadow-[0_20px_60px_rgba(3,10,25,0.65)]">
                <p className="text-sm font-medium text-white">
                  {copy.emptyTitle}
                </p>
                <p className="text-xs text-slate-200">
                  {copy.emptyDesc}
                </p>
              </div>
            ) : (
              <>
                <HousesSection
                  title={copy.sectionActiveTitle}
                  description={copy.sectionActiveDesc}
                  houses={active}
                  copy={copy}
                  locale={locale}
                />

                <HousesSection
                  title={copy.sectionConstructionTitle}
                  description={copy.sectionConstructionDesc}
                  houses={underConstruction}
                  copy={copy}
                  locale={locale}
                />

                <HousesSection
                  title={copy.sectionDevelopmentTitle}
                  description={
                    isLegacyTeam
                      ? copy.sectionDevelopmentDescTeam
                      : copy.sectionDevelopmentDescPublic
                  }
                  houses={visibleInDevelopment}
                  copy={copy}
                  locale={locale}
                />
              </>
            )}
          </div>
        </section>
        <LeadSection copy={copy} />
      </main>

      <Footer />
    </div>
  );
}

type CopyType = (typeof COPY)[keyof typeof COPY];

function StatusSummaryItem(props: {
  label: string;
  value: string | number;
  description: string;
}) {
  const { label, value, description } = props;

  return (
    <div className="rounded-xl border border-white/10 bg-[#04131b] p-4 shadow-[0_15px_45px_rgba(3,10,25,0.55)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-cyan-200">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-200">{description}</p>
    </div>
  );
}

function XpLeaderSummaryCard({
  house,
  copy,
  locale,
}: {
  house: House | null;
  copy: CopyType;
  locale: string;
}) {
  if (!house) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#04131b] p-4 shadow-[0_15px_45px_rgba(3,10,25,0.55)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-cyan-200">
          {copy.topXpTitle}
        </p>
        <p className="mt-2 text-sm text-slate-200">
          {copy.noXpLeader}
        </p>
      </div>
    );
  }

  const xpTotal = (house.xp_total ?? 0).toLocaleString(locale);

  return (
    <div className="rounded-xl border border-white/10 bg-[#04131b] p-4 shadow-[0_15px_45px_rgba(3,10,25,0.55)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-cyan-200">
        {copy.topXpTitle}
      </p>
      <p className="mt-2 text-base font-semibold text-white">{house.name}</p>
      <div className="mt-3 flex items-baseline gap-2">
        <p className="text-2xl font-bold text-white">{xpTotal}</p>
        <span className="text-[11px] uppercase tracking-wide text-slate-400">
          {copy.xpAccumulated}
        </span>
      </div>
    </div>
  );
}

function MembersLeaderSummaryCard({
  house,
  copy,
  locale,
}: {
  house: House | null;
  copy: CopyType;
  locale: string;
}) {
  if (!house) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#04131b] p-4 shadow-[0_15px_45px_rgba(3,10,25,0.55)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-cyan-200">
          {copy.topMembersTitle}
        </p>
        <p className="mt-2 text-sm text-slate-200">
          {copy.noMembersLeader}
        </p>
      </div>
    );
  }

  const memberCount = (house.member_count ?? 0).toLocaleString(locale);
  const xpTotal = (house.xp_total ?? 0).toLocaleString(locale);

  return (
    <div className="rounded-xl border border-white/10 bg-[#04131b] p-4 shadow-[0_15px_45px_rgba(3,10,25,0.55)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-cyan-200">
        {copy.topMembersTitle}
      </p>
      <p className="mt-2 text-base font-semibold text-white">{house.name}</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-white">{memberCount}</p>
          <span className="text-[11px] uppercase tracking-wide text-slate-400">
            {copy.membersLabel}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-white">{xpTotal}</p>
          <span className="text-[11px] uppercase tracking-wide text-slate-400">
            {copy.xpAccumulated}
          </span>
        </div>
      </div>
    </div>
  );
}

function HousesSection({
  title,
  description,
  houses,
  copy,
  locale,
}: {
  title: string;
  description: string;
  houses: House[];
  copy: CopyType;
  locale: string;
}) {
  if (!houses || houses.length === 0) return null;

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-md font-semibold text-[#fdd87c]">{title}</h3>
          <p className="text-xs text-slate-200">{description}</p>
        </div>
        <p className="text-[11px] text-slate-300">
          {houses.length} {houses.length === 1 ? copy.sectionCountSingle : copy.sectionCountPlural}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {houses.map((house) => {
          const headDisplay =
            house.head?.username ? `@${house.head.username}` : house.head?.full_name?.trim() || null;
          const firstModerator = house.moderators?.[0];
          const moderatorExample =
            firstModerator?.username
              ? `@${firstModerator.username}`
              : firstModerator?.full_name?.trim() || null;

          const headLine = headDisplay
            ? `${copy.headLabel}: ${headDisplay}`
            : copy.headPending;

          const renderTitle = () => {
            if (!house.sport?.name) return house.name;

            const houseNameLower = house.name.toLowerCase();
            const sportNameLower = house.sport.name.toLowerCase();
            const sportIndex = houseNameLower.indexOf(sportNameLower);

            if (sportIndex === -1) return house.name;

            const before = house.name.slice(0, sportIndex);
            const sportText = house.name.slice(
              sportIndex,
              sportIndex + house.sport.name.length,
            );
            const after = house.name.slice(
              sportIndex + house.sport.name.length,
            );

            return (
              <>
                {before}
                <span className="text-[#fdd87c]">{sportText}</span>
                {after}
              </>
            );
          };

          return (
            <Link key={house.id} href={`/sports/houses/${house.id}`}>
              <div className="flex h-full flex-col rounded-xl border border-white/10 bg-[#04131b] p-4 shadow-[0_20px_60px_rgba(3,10,25,0.55)] transition hover:border-cyan-400/70 hover:shadow-[0_0_22px_rgba(34,211,238,0.32)]">
                <div className="-mx-4 -mt-4 mb-3 h-40 overflow-hidden rounded-t-xl border-b border-white/10 bg-[#000c12] sm:h-48">
                  {house.cover_image_url || house.avatar_url ? (
                    <SafeImage
                      src={house.cover_image_url || house.avatar_url || ''}
                      alt={house.name}
                      className="h-full w-full object-cover"
                      width={3750}
                      height={875}
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-r from-slate-800 via-slate-900 to-slate-950" />
                  )}
                </div>

                <div className="mb-2 flex flex-col gap-1">
                  <p className="truncate text-base font-semibold text-white">
                    {renderTitle()}
                  </p>
                  <p className="text-[11px] text-slate-200">{headLine}</p>
                </div>

                <div className="space-y-2 text-[11px] text-slate-400">
                  {house.moderators.length > 0 ? (
                    <p>
                      {copy.modsLabel}:{' '}
                      <span className="text-white">
                        {house.moderators.length}
                        {moderatorExample ? `${copy.membersExamplePrefix}${moderatorExample})` : ''}
                      </span>
                    </p>
                  ) : (
                    <p>{copy.modsNone}</p>
                  )}
                </div>

                <div className="mt-auto pt-3">
                  <div className="flex items-center justify-between rounded-lg border border-white/10 bg-[#020b16] px-3 py-2 text-xs text-slate-200">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">
                        {copy.membersLabelCard}
                      </p>
                      <p className="text-sm font-semibold text-white">
                        {(house.member_count ?? 0).toLocaleString(locale)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">
                        {copy.xpLabelCard}
                      </p>
                      <p className="text-sm font-semibold text-white">
                        {(house.xp_total ?? 0).toLocaleString(locale)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

type FilterPanelProps = {
  copy: CopyType;
  localeKey: 'pt' | 'en' | 'es';
  statusFilters: HouseStatus[];
  toggleStatus: (status: HouseStatus) => void;
  resetFilters: () => void;
  selectedSport: string;
  setSelectedSport: (value: string) => void;
  sportOptions: { id: string; name: string }[];
  selectedCountry: string;
  setSelectedCountry: (value: string) => void;
  countryOptions: string[];
  nearbyOnly: boolean;
  setNearbyOnly: (value: boolean) => void;
  detectedCountry: string | null;
  filteredCount: number;
};

function FilterPanel({
  copy,
  localeKey,
  statusFilters,
  toggleStatus,
  resetFilters,
  selectedSport,
  setSelectedSport,
  sportOptions,
  selectedCountry,
  setSelectedCountry,
  countryOptions,
  nearbyOnly,
  setNearbyOnly,
  detectedCountry,
  filteredCount,
}: FilterPanelProps) {
  const proximityHint = detectedCountry
    ? copy.filtersProximityHint.replace('{country}', detectedCountry)
    : copy.filtersProximityHintNoLocation;

  const filteredLabel = copy.filtersActiveCount.replace(
    '{count}',
    filteredCount.toLocaleString(),
  );

  return (
    <section className="rounded-3xl border border-white/10 bg-[#02111c]/80 p-6 shadow-[0_35px_90px_rgba(0,0,0,0.45)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">
            {copy.filtersTitle}
          </p>
          <p className="text-sm text-slate-200">{copy.filtersSubtitle}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="border-white/20 px-4 text-xs uppercase tracking-[0.35em] text-white"
          onClick={resetFilters}
        >
          {copy.filtersReset}
        </Button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
            {copy.filtersStatusLabel}
          </p>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_STATUS_FILTERS.map((status) => {
              const active = statusFilters.includes(status);
              const label = STATUS_LABELS[status][localeKey];
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => toggleStatus(status)}
                  className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.4em] transition ${
                    active
                      ? 'border-cyan-400 bg-cyan-500/20 text-white'
                      : 'border-white/10 text-slate-200'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
            {copy.filtersSportLabel}
          </p>
          <Select
            value={selectedSport}
            onValueChange={(value) => setSelectedSport(value)}
          >
            <SelectTrigger className="rounded-xl border border-white/10 bg-[#020b16] text-white">
              <SelectValue placeholder={copy.filtersSportPlaceholder} />
            </SelectTrigger>
            <SelectContent className="bg-[#02121c] text-white">
              <SelectItem value="all">
                {copy.filtersSportPlaceholder}
              </SelectItem>
              {sportOptions.map((sport) => (
                <SelectItem key={sport.id} value={sport.id}>
                  {sport.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
            {copy.filtersCountryLabel}
          </p>
          <Select
            value={selectedCountry}
            onValueChange={(value) => setSelectedCountry(value)}
          >
            <SelectTrigger className="rounded-xl border border-white/10 bg-[#020b16] text-white">
              <SelectValue placeholder={copy.filtersCountryPlaceholder} />
            </SelectTrigger>
            <SelectContent className="bg-[#02121c] text-white">
              <SelectItem value="all">
                {copy.filtersCountryPlaceholder}
              </SelectItem>
              {countryOptions.map((country) => (
                <SelectItem key={country} value={country}>
                  {country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Switch checked={nearbyOnly} onCheckedChange={setNearbyOnly} />
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                {copy.filtersProximityLabel}
              </p>
              <p className="text-[11px] text-slate-500">
                {proximityHint}
              </p>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs uppercase tracking-[0.4em] text-slate-400">
        {filteredLabel}
      </p>
    </section>
  );
}

function LeadSection({ copy }: { copy: CopyType }) {
  return (
    <section className="px-6 py-12 md:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#030d18] via-[#021523] to-[#031b27] p-8 shadow-[0_35px_90px_rgba(0,0,0,0.45)]">
          <div className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">
                {copy.leadSectionTitle}
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-white">
                {copy.leadSectionSubtitle}
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {copy.leadSteps.map((step) => (
                <div
                  key={step.title}
                  className="rounded-2xl border border-white/10 bg-[#04131b]/70 p-4 text-sm text-white/80"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-cyan-200">
                    {step.title}
                  </p>
                  <p className="mt-3 text-sm text-slate-200">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
