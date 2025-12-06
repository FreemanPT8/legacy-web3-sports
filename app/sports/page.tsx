'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CryptoTicker } from '@/components/CryptoTicker';
import { Button } from '@/components/ui/button';
import { SafeImage } from '@/app/components/SafeImage';

type PublicHouseStatus = 'IN_DEVELOPMENT' | 'UNDER_CONSTRUCTION' | 'ACTIVE';

interface Sport {
  id: string;
  code: string;
  name: string;
  description: string | null;
  created_at: string | null;
}

interface House {
  id: string;
  name: string;
  avatar_url?: string | null;
  cover_image_url?: string | null;
  country_code: string | null;
  status: PublicHouseStatus;
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
}

interface SportsApiResponse {
  success: boolean;
  sports?: Sport[];
  error?: string;
}

interface HousesApiResponse {
  success: boolean;
  houses?: House[];
  error?: string;
}

export default function SportsPage() {
  const { user } = useAuth();
  const isLegacyTeam = user?.role === 'Admin' || user?.role === 'Super Admin';

  const [sports, setSports] = useState<Sport[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [sportsRes, housesRes] = await Promise.all([
          fetch('/api/sports?locale=pt'),
          fetch('/api/sports/houses?locale=pt'),
        ]);

        const sportsJson: SportsApiResponse = await sportsRes.json();
        const housesJson: HousesApiResponse = await housesRes.json();

        if (!sportsRes.ok || !sportsJson.success) {
          throw new Error(sportsJson.error || 'Erro ao carregar desportos.');
        }

        if (!housesRes.ok || !housesJson.success) {
          throw new Error(
            housesJson.error || 'Erro ao carregar Houses of Sports.'
          );
        }

        setSports(sportsJson.sports || []);
        setHouses(housesJson.houses || []);
      } catch (err: any) {
        console.error('Erro ao carregar sports/houses:', err);
        setError(
          err?.message || 'Erro inesperado ao carregar desportos e Houses.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const housesByStatus = useMemo(() => {
    const base: Record<PublicHouseStatus, House[]> = {
      ACTIVE: [],
      UNDER_CONSTRUCTION: [],
      IN_DEVELOPMENT: [],
    };

    for (const h of houses) {
      base[h.status].push(h);
    }

    return base;
  }, [houses]);

  const visibleInDevelopment = isLegacyTeam ? housesByStatus.IN_DEVELOPMENT : [];

  const totalSports = sports.length;
  const totalHouses =
    housesByStatus.ACTIVE.length +
    housesByStatus.UNDER_CONSTRUCTION.length +
    housesByStatus.IN_DEVELOPMENT.length;

  return (
    <div className="min-h-screen flex flex-col bg-page">
      <CryptoTicker />
      <Header />

      <main className="flex-1">
        {/* HERO CINEMÁTICO · PORTAL LEGACY SPORTS */}
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white py-16 md:py-24 border-b border-slate-900/80">
          {/* halos / luzes */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-40 -right-20 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />
            <div className="absolute -bottom-56 -left-24 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/90 to-transparent" />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-6xl mx-auto grid md:grid-cols-[2.1fr,1.1fr] gap-10 items-start">
              {/* Bloco principal de narrativa */}
              <div className="space-y-6">
                <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-[11px] font-semibold text-blue-50 border border-white/15 tracking-wide uppercase">
                  Portal LEGACY · Desporto, Blockchain & Web3 na Apertum
                </span>

                <h1 className="text-3xl md:text-4xl font-bold leading-tight tracking-tight">
                  O ponto de entrada para o desporto na{' '}
                  <span className="text-cyan-300">Apertum Blockchain</span>.
                </h1>

                <p className="text-sm md:text-base text-blue-100 max-w-xl leading-relaxed">
                  O LEGACY não é mais um curso solto. É um{' '}
                  <strong>portal educativo</strong> que mostra, passo a passo,
                  como a tecnologia Blockchain, a Web3 e a{' '}
                  <strong>Apertum</strong> podem mudar a forma como o desporto
                  organiza comunidades, reputação e oportunidades reais — dentro
                  e fora de campo.
                </p>

                <p className="text-xs md:text-sm text-blue-100/90 max-w-xl leading-relaxed">
                  Se vens do <strong>desporto</strong>, há uma House à tua
                  espera. E se não vens, mas queres compreender o que vai
                  moldar a próxima década de{' '}
                  <strong>finanças, dados e confiança digital</strong>, o
                  caminho também passa por aqui. O objetivo é simples: aprender
                  primeiro, agir depois — com alguém ao teu lado nos primeiros
                  passos.
                </p>

                {user ? (
                  <p className="text-[11px] text-blue-200/90 max-w-xl">
                    Estás autenticado como{' '}
                    <span className="font-semibold">
                      @{user.username ?? 'member'}
                    </span>
                    . A partir daqui podes{' '}
                    <strong>explorar as Houses</strong>, escolher o teu
                    desporto e avançar para um{' '}
                    <strong>onboarding personalizado</strong> dentro do
                    ecossistema LEGACY.
                  </p>
                ) : (
                  <p className="text-[11px] text-blue-200/90 max-w-xl">
                    Ainda não tens conta? Podes{' '}
                    <strong>explorar tudo o que é público</strong> e, quando
                    fizer sentido, criar uma conta gratuita para guardar o teu
                    progresso, acumular XP e aceder a conteúdos reservados.
                  </p>
                )}

                <div className="flex flex-wrap gap-3 pt-2">
                  <Link href="/sports/onboarding">
                    <Button
                      size="lg"
                      className="bg-white text-slate-950 hover:bg-slate-100"
                    >
                      Preencher formulário para onboarding personalizado
                    </Button>
                  </Link>
                  <Link href="/sports/houses">
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-cyan-400/70 text-blue-50 hover:bg-cyan-500/10"
                    >
                      Explorar Houses of Sports
                    </Button>
                  </Link>
                </div>

                {/* Linha do tempo do funil narrativo */}
                <div className="pt-5 border-t border-white/5">
                  <p className="text-[11px] uppercase tracking-wide text-blue-200/80 mb-2">
                    O caminho dentro do LEGACY
                  </p>
                  <div className="flex flex-col md:flex-row gap-3 text-[11px] text-blue-100/90">
                    <FunilStep
                      index={1}
                      label="Descobres o portal LEGACY"
                      detail="Chegas aqui através de conteúdos públicos em redes sociais ou porque alguém considerou importante que tivesses acesso a esta informação."
                    />
                    <FunilStep
                      index={2}
                      label="Preenches o formulário de onboarding personalizado"
                      detail="Percebes que isto pode ser para ti, respondes a um formulário simples e alguém fica com base suficiente para te acompanhar nos primeiros passos."
                    />
                    <FunilStep
                      index={3}
                      label="Avanças para conteúdos privados e começas a acumular XP"
                      detail="Dentro do LEGACY valorizamos a educação e o envolvimento. Cada lição, módulo, curso ou artigo que consomes soma XP à tua conta."
                    />
                    <FunilStep
                      index={4}
                      label="Vês quem mais se educa no Leaderboard"
                      detail="Existe um Leaderboard onde se destacam usernames de pessoas que levam este processo a sério. A questão é simples: será que o teu username vai aparecer lá em breve?"
                    />
                  </div>
                </div>
              </div>

              {/* Card: snapshot cinématico do estado das Houses */}
              <div className="bg-card-custom/95 text-heading rounded-2xl border border-cyan-500/30 px-5 py-5 shadow-[0_0_40px_rgba(34,211,238,0.22)] backdrop-blur">
                <h2 className="text-sm font-semibold mb-4 text-blue-50">
                  Snapshot do ecossistema LEGACY Sports
                </h2>

                {loading ? (
                  <p className="text-xs text-muted-custom">
                    A carregar desportos e Houses…
                  </p>
                ) : (
                  <>
                    <div className="space-y-3 text-xs">
                      <RowStatus
                        colorClass="bg-cyan-400"
                        label="Desportos mapeados"
                        value={totalSports}
                      />
                      <RowStatus
                        colorClass="bg-emerald-400"
                        label="Houses ativas"
                        value={housesByStatus.ACTIVE.length}
                      />
                      <RowStatus
                        colorClass="bg-amber-400"
                        label="Houses em construção"
                        value={housesByStatus.UNDER_CONSTRUCTION.length}
                      />
                      {isLegacyTeam && (
                        <RowStatus
                          colorClass="bg-slate-400"
                          label="Houses em desenvolvimento"
                          value={housesByStatus.IN_DEVELOPMENT.length}
                        />
                      )}
                    </div>

                    <p className="mt-4 text-[11px] text-body leading-relaxed">
                      Cada House representa um desporto num país. No início vale
                      mais educação, clareza e estrutura do que promessas
                      vazias. O LEGACY existe precisamente para isso: tornar
                      esta transição mais segura e consciente.
                    </p>
                  </>
                )}

                <div className="mt-4 text-right">
                  <Link
                    href="/sports/houses"
                    className="inline-flex items-center text-[11px] font-medium text-cyan-300 hover:text-cyan-200"
                  >
                    Ver mapa completo das Houses →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* onda inferior */}
          <div className="absolute bottom-0 left-0 right-0 opacity-50">
            <svg
              viewBox="0 0 1440 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 80C1200 80 1320 70 1380 65L1440 60V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
                fill="#020617"
              />
            </svg>
          </div>
        </section>

        {/* SECÇÃO: PORQUE É QUE ESTA TECNOLOGIA IMPORTA */}
        <section className="py-10 md:py-14 bg-slate-950">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto grid md:grid-cols-[1.7fr,1.3fr] gap-8 items-start">
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-heading">
                  Porque é que Blockchain e Web3 interessam ao desporto (e não
                  só).
                </h2>
                <p className="text-sm text-body leading-relaxed">
                  O ruído à volta de cripto, NFTs e Web3 fez muitas pessoas
                  afastarem-se. O foco do LEGACY vai noutra direção:{' '}
                  <strong>educação sólida</strong>, linguagem simples e decisões
                  conscientes. Nada de modas cegas.
                </p>
                <p className="text-sm text-body leading-relaxed">
                  Na prática, a tecnologia abre portas para{' '}
                  <strong>registos imutáveis</strong> (resultados, carreiras,
                  contributos), novas formas de{' '}
                  <strong>recompensar quem entrega valor</strong> e comunidades
                  que se organizam com mais transparência. Se fores atleta,
                  treinador, dirigente, criador de conteúdo ou curioso por esta
                  nova economia, convém perceber bem o que está em jogo.
                </p>
                <p className="text-xs text-muted-custom leading-relaxed">
                  A Apertum Blockchain é a rede onde tudo isto acontece. O
                  LEGACY existe para te ajudar a navegar este ecossistema sem te
                  perderes, sem pressa e sem drama. Primeiro aprendes. Depois
                  decides quanto queres envolver-te.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-5 text-xs text-body shadow-lg space-y-3">
                <p className="text-[11px] uppercase tracking-wide text-blue-200/80">
                  O que ganhas ao entrar pelo LEGACY
                </p>
                <ul className="space-y-2 list-disc list-inside">
                  <li>
                    Entendes os{' '}
                    <strong>conceitos essenciais de Blockchain e Web3</strong>{' '}
                    sem linguagem de programador.
                  </li>
                  <li>
                    Começas ligado ao teu{' '}
                    <strong>contexto real</strong> (desporto ou não), em vez de
                    andar atrás de promessas fáceis.
                  </li>
                  <li>
                    Constróis um <strong>percurso educativo</strong> com XP,
                    Houses e comunidades que valorizam entrega e não apenas
                    opinião.
                  </li>
                  <li>
                    Tens sempre a opção de{' '}
                    <strong>observar primeiro e agir depois</strong>, sem
                    pressão e no teu ritmo.
                  </li>
                </ul>
                <p className="text-[11px] text-muted-custom">
                  Se sentes que o mundo está a mudar depressa demais, o LEGACY
                  é um sítio para abrandar, compreender e decidir com cabeça.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* HOUSES – VISÃO GERAL E LISTAS */}
        <section className="py-12 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
          <div className="container mx-auto px-4">
            {error && (
              <div className="max-w-4xl mx-auto mb-6 rounded-md border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-100">
                {error}
              </div>
            )}

            <div className="max-w-5xl mx-auto space-y-6 mb-8">
              <div>
                <h2 className="text-2xl font-bold text-heading">
                  Houses of Sports – comunidades por desporto e país.
                </h2>
                <p className="text-sm text-body max-w-3xl mt-2 leading-relaxed">
                  As Houses of Sports são grupos focados num desporto específico
                  num país concreto. No início, funcionam como{' '}
                  <strong>núcleos de aprendizagem e organização</strong> dentro
                  do ecossistema LEGACY e da Apertum. Com o tempo, algumas vão
                  acabar por se destacar das demais devido às iniciativas dos
                  seus membros ou da própria liderança da Casa. Em Web3 a
                  comunidade tem um peso significativo, mas nem todas as
                  comunidades existem para deixar a sua marca.
                </p>
              </div>

              <div className="flex flex-col md:flex-row gap-6 md:items-end md:justify-between">
                <div className="text-xs text-body space-y-1">
                  <p>
                    <span className="font-semibold text-heading">
                      {housesByStatus.ACTIVE.length}
                    </span>{' '}
                    Houses ativas
                  </p>
                  <p>
                    <span className="font-semibold text-heading">
                      {housesByStatus.UNDER_CONSTRUCTION.length}
                    </span>{' '}
                    em construção
                  </p>
                  <p>
                    <span className="font-semibold text-heading">
                      {housesByStatus.IN_DEVELOPMENT.length}
                    </span>{' '}
                    em desenvolvimento
                    {!isLegacyTeam && (
                      <span className="text-[11px] text-muted-custom">
                        {' '}
                        (estado interno da equipa LEGACY)
                      </span>
                    )}
                  </p>
                </div>

                <div className="text-xs text-muted-custom max-w-sm">
                  <p>
                    Se representas um desporto, uma equipa ou uma comunidade
                    séria, a tua House pode nascer aqui. O primeiro passo é
                    sempre o mesmo:{' '}
                    <strong>onboarding personalizado dentro do LEGACY</strong>.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href="/sports/houses">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-600 text-blue-300 hover:bg-blue-950/40"
                      >
                        Ver mapa de Houses
                      </Button>
                    </Link>
                    <Link href="/sports/onboarding">
                      <Button
                        size="sm"
                        className="bg-white text-slate-950 hover:bg-slate-100"
                      >
                        Preencher formulário de onboarding
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Houses em destaque */}
            <div className="max-w-6xl mx-auto space-y-10">
              <HousesSection
                title="Houses ativas"
                description="Comunidades que já estão a receber membros e a organizar a sua base educativa."
                houses={housesByStatus.ACTIVE}
              />
              <HousesSection
                title="Houses em construção"
                description="Casas que já têm liderança definida e estão a preparar a estrutura para abrir portas."
                houses={housesByStatus.UNDER_CONSTRUCTION}
              />
              {isLegacyTeam && (
                <HousesSection
                  title="Houses em desenvolvimento (equipa interna)"
                  description="Desportos e países que estão na fila para ganhar uma House. Pipeline estratégico do LEGACY Sports."
                  houses={visibleInDevelopment}
                />
              )}
            </div>
          </div>
        </section>

        {/* BLOCO FINAL · CHAMADA PARA ONBOARDING */}
        <section className="py-14 bg-gradient-to-b from-slate-900 via-slate-950 to-black border-t border-slate-800">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold text-heading">
                Se sentes que isto pode ser importante para o teu futuro, começa
                pelo primeiro passo.
              </h2>
              <p className="text-sm md:text-base text-body max-w-2xl mx-auto leading-relaxed">
                Não precisas de “perceber tudo” hoje. Precisas de um contexto
                adulto, de uma estrutura séria e de pessoas que saibam do que
                falam. O LEGACY foi desenhado exatamente para isso. O teu
                onboarding marca o início dessa jornada.
              </p>
              <div className="flex flex-wrap gap-3 justify-center pt-2">
                <Link href="/sports/onboarding">
                  <Button
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-500 text-white"
                  >
                    Preencher formulário para onboarding personalizado
                  </Button>
                </Link>
                <Link href="/education">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-slate-600 text-blue-100 hover:bg-slate-900"
                  >
                    Ver a Academy do LEGACY
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function FunilStep({
  index,
  label,
  detail,
}: {
  index: number;
  label: string;
  detail: string;
}) {
  return (
    <div className="flex-1 min-w-[180px]">
      <div className="flex items-center gap-2 mb-1">
        <span className="h-5 w-5 rounded-full border border-cyan-400 text-[11px] flex items-center justify-center text-cyan-200">
          {index}
        </span>
        <span className="font-semibold text-blue-100">{label}</span>
      </div>
      <p className="text-[11px] text-blue-200/90">{detail}</p>
    </div>
  );
}

function RowStatus({
  colorClass,
  label,
  value,
}: {
  colorClass: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-xs text-body">
        <span className={`h-2 w-2 rounded-full ${colorClass}`} />
        {label}
      </span>
      <span className="font-semibold text-heading text-xs">{value}</span>
    </div>
  );
}

function HousesSection({
  title,
  description,
  houses,
}: {
  title: string;
  description: string;
  houses: House[];
}) {
  if (houses.length === 0) return null;

  const subset = houses.slice(0, 6);

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2 mb-3">
        <div>
          <h3 className="text-md font-semibold text-heading">{title}</h3>
          <p className="text-xs text-muted-custom">{description}</p>
        </div>
        <p className="text-[11px] text-muted-custom">
          {houses.length} {houses.length === 1 ? 'House' : 'Houses'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subset.map((house) => {
          const headUsername = house.head?.username
            ? `@${house.head.username}`
            : null;

          const headInitialsSource =
            house.head?.username || house.head?.full_name || house.name;

          const initials = headInitialsSource
            .split(' ')
            .map((p) => p[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();

          return (
            <Link
              key={house.id}
              href={`/sports/houses/${house.id}`}
              className="block"
            >
              <div className="h-full rounded-xl border border-custom bg-card-custom/95 p-4 shadow-sm hover:border-cyan-400/80 hover:shadow-[0_0_22px_rgba(34,211,238,0.32)] transition flex flex-col">
                <div className="mb-3 h-20 rounded-lg border border-custom overflow-hidden bg-slate-900">
                  {house.cover_image_url || house.avatar_url ? (
                    <SafeImage
                      src={house.cover_image_url || house.avatar_url || ''}
                      alt={house.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-r from-slate-800 via-slate-900 to-slate-950" />
                  )}
                </div>

                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3 text-sm font-semibold text-heading min-w-0">
                    <div className="h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center text-[12px] font-semibold text-muted-custom overflow-hidden border border-custom shrink-0">
                      {house.avatar_url || house.cover_image_url ? (
                        <SafeImage
                          src={house.avatar_url || house.cover_image_url || ''}
                          alt={house.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>{initials}</span>
                      )}
                    </div>
                    <span className="truncate">{house.name}</span>
                  </div>

                  {house.country_code && (
                    <span className="text-[10px] font-mono uppercase bg-slate-900 rounded px-2 py-0.5 text-blue-200 border border-slate-700">
                      {house.country_code}
                    </span>
                  )}
                </div>

                {house.sport && (
                  <div className="text-[11px] uppercase text-muted-custom mb-1">
                    {house.sport.name} · {house.sport.code}
                  </div>
                )}

                {headUsername ? (
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-7 w-7 rounded-full bg-slate-900 flex items-center justify-center text-[10px] font-semibold text-muted-custom overflow-hidden border border-custom">
                      {house.head?.avatar_url ? (
                        <SafeImage
                          src={house.head.avatar_url}
                          alt={headUsername}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>{initials}</span>
                      )}
                    </div>
                    <div className="text-xs text-body leading-tight">
                      <div className="font-medium text-heading">
                        Head of House
                      </div>
                      <div className="text-[11px] text-muted-custom">
                        {headUsername}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-custom mb-1">
                    Head of House a definir (username em breve).
                  </p>
                )}

                <p className="text-[11px] text-muted-custom mt-auto">
                  {house.moderators.length > 0
                    ? `${house.moderators.length} moderador(es) já atribuídos.`
                    : 'Sem moderadores definidos ainda.'}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
