import Image from 'next/image';
import { notFound } from 'next/navigation';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { loadHouseProfile, normalizeLocale } from '@/lib/houses/profile';
import { HouseCTAForm } from './CTAForm';
import { PrivateArea } from './PrivateArea';
import { HouseMembersList } from './HouseMembersList';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/30',
  under_construction: 'bg-amber-500/15 text-amber-200 border border-amber-400/30',
  in_development: 'bg-cyan-500/10 text-cyan-200 border border-cyan-400/30',
  paused: 'bg-rose-500/15 text-rose-200 border border-rose-400/30',
};

const SUPPORT_LABELS: Record<string, string> = {
  async: 'Contacto assíncrono (mensagens)',
  sync: 'Contacto síncrono (calls)',
  hybrid: 'Modelo híbrido (mensagens + calls pontuais)',
};

type PageProps = {
  params: { houseKey: string };
  searchParams?: { [key: string]: string | string[] | undefined };
};

export const revalidate = 120;

export default async function HouseProfilePage({ params, searchParams }: PageProps) {
  const locale = normalizeLocale(
    typeof searchParams?.locale === 'string' ? (searchParams.locale as string) : undefined,
  );
  const payload = await loadHouseProfile(params.houseKey, locale);
  if (!payload) {
    notFound();
  }
  const { house } = payload;
  const houseBadgeLabel = `House of ${house.sportCode} ${house.countryCode ?? ''}`.trim();
  const statusStyle = STATUS_COLORS[house.governanceStatus] || STATUS_COLORS[house.status] || STATUS_COLORS.active;
  const supportLabel = SUPPORT_LABELS[house.supportModel.contactMode] ?? 'Modelo definido pela House';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#010913] via-[#02121c] to-[#04131b] text-white">
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-12 md:px-8">
        <section className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#020b16]/90 via-[#021523]/80 to-[#031b27]/80 p-6 shadow-[0_35px_90px_rgba(3,10,25,0.55)] md:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4 max-w-3xl">
              <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">HOUSE PROFILE</p>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold text-[#fdd87c] sm:text-4xl">{house.name}</h1>
                <span className={`rounded-full px-4 py-1 text-xs font-semibold ${statusStyle}`}>
                  {house.governanceStatus === 'active' ? 'Ativa' : house.governanceStatus.replace('_', ' ')}
                </span>
                <Badge variant="outline" className="border-cyan-500/30 text-cyan-200">
                  {house.badge === 'validated' ? 'House validada no Legacy' : 'Pré-visualização'}
                </Badge>
                {house.isExemplar ? (
                  <Badge variant="outline" className="border-[#fdd87c]/60 bg-[#fdd87c]/10 text-[#fdd87c]">
                    House exemplar
                  </Badge>
                ) : null}
              </div>
              <p className="text-slate-200">{house.positioning.subtitle}</p>
              <div className="flex flex-wrap gap-3 text-sm text-slate-300">
                <span>{house.countryCode}</span>
                <Separator orientation="vertical" className="h-4 bg-white/30" />
                <span>{house.sportCode}</span>
              </div>
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <MetricCard label="Participantes totais" value={house.metrics.memberCount.toLocaleString()} />
              <MetricCard label="Membros registados" value={house.metrics.registeredMembers.toLocaleString()} />
              <MetricCard label="XP total" value={`${house.metrics.xpTotal.toLocaleString()} XP`} />
              <MetricCard label="XP Head" value={`${house.metrics.xpBreakdown.head.toLocaleString()} XP`} />
              <MetricCard
                label="XP Moderadores"
                value={`${house.metrics.xpBreakdown.moderators.toLocaleString()} XP`}
              />
              <MetricCard label="XP Membros" value={`${house.metrics.xpBreakdown.members.toLocaleString()} XP`} />
              <MetricCard label="Termos aceites" value={house.metrics.termAcceptances.toLocaleString()} />
              <MetricCard label="Pop-ups prontos" value={house.metrics.onboarding.published.toLocaleString()} />
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">
            REDE DA HOUSE
          </p>
          <Card className="border border-white/10 bg-[#03131b]/80">
            <CardHeader>
              <CardTitle className="text-lg text-white">Membros oficiais</CardTitle>
              <CardDescription className="text-sm text-white/70">
                Transparência sobre quem lidera e participa na {house.name}. Atualizado em tempo real.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HouseMembersList
                roster={house.roster}
                badgeLabel={houseBadgeLabel}
                totalCount={house.metrics.memberCount}
              />
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <Card className="border-white/10 bg-[#020c18]/80">
            <CardHeader>
              <CardTitle className="text-lg text-white">Missão da House</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-200">
              <p className="text-base font-semibold text-white">{house.mission.title}</p>
              {Array.isArray(house.mission.body) ? (
                <ul className="space-y-2 text-sm leading-relaxed">
                  {house.mission.body.map((item: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-300" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>{house.mission.body}</p>
              )}
              {house.limits.length > 0 && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
                  <p className="font-semibold text-rose-200">Limitações</p>
                  <ul className="mt-2 list-disc pl-5 text-rose-100/90">
                    {house.limits.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-[#020c18]/80">
            <CardHeader>
              <CardTitle className="text-lg text-white">Head of House</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {house.head ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="relative h-24 w-24 overflow-hidden rounded-2xl border border-white/10 bg-[#03121a]">
                    {house.head.photoUrl ? (
                      <Image src={house.head.photoUrl} alt={house.head.name} fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-white/70">
                        {house.head.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xl font-semibold text-white">{house.head.name}</p>
                    {house.head.username && <p className="text-sm text-slate-400">@{house.head.username}</p>}
                    {house.head.country && <p className="text-sm text-slate-400">{house.head.country}</p>}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-300">Head a anunciar em breve.</p>
              )}
              <Button asChild variant="outline" className="w-full border-white/20 text-white">
                <a href="#house-private-messages">Enviar mensagem ao Head</a>
              </Button>
              {house.head?.manifesto?.length ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
                  {house.head.manifesto.map((line, index) => (
                    <p key={index} className="mb-2 last:mb-0">
                      {line}
                    </p>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="border-white/10 bg-[#030f1a]/80">
            <CardHeader>
              <CardTitle className="text-lg text-white">Para quem é</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <AudienceList title="Estamos prontos para quem…" items={house.audience.for} />
              <AudienceList title="Não é para quem…" items={house.audience.notFor} variant="negative" />
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-[#030f1a]/80">
            <CardHeader>
              <CardTitle className="text-lg text-white">Como funciona o acompanhamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-200">
              <p className="font-semibold text-white">{supportLabel}</p>
              {house.supportModel.description.length > 0 && (
                <ul className="list-disc space-y-2 pl-5">
                  {house.supportModel.description.map((line, index) => (
                    <li key={index}>{line}</li>
                  ))}
                </ul>
              )}
              {house.supportModel.expectationNotes.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  {house.supportModel.expectationNotes.map((line, index) => (
                    <p key={index} className="text-xs text-white/80">
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="border-white/10 bg-[#03121b]/90">
            <CardHeader>
              <CardTitle className="text-lg text-white">Cultura da House</CardTitle>
            </CardHeader>
            <CardContent>
              {house.culture.length ? (
                <ul className="space-y-3">
                  {house.culture.map((item, index) => (
                    <li key={index} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80">
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-300">Esta House está a preparar a sua cultura interna.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-[#03121b]/90">
            <CardHeader className="space-y-2">
              <CardTitle className="text-lg text-white">Avançar com responsabilidade</CardTitle>
              <p className="text-sm text-white/70">
                Sem pressa e sem promessas. Antes de submeter, confirma que compreendeste os limites desta House.
              </p>
            </CardHeader>
            <CardContent>
              <HouseCTAForm houseKey={house.houseKey} cta={house.cta} />
            </CardContent>
          </Card>
        </section>
      </main>
      <Footer />

      <div className="py-12">
        <PrivateArea
          houseKey={house.houseKey}
          recommendedContent={house.recommendedContent}
          culture={house.culture}
          metrics={house.metrics}
          events={house.events}
          roster={house.roster}
          houseLabel={houseBadgeLabel}
          welcomeMessage={house.welcomeMessage ?? null}
        />
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-center">
      <p className="text-xs uppercase tracking-[0.4em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function AudienceList({
  title,
  items,
  variant = 'default',
}: {
  title: string;
  items: string[];
  variant?: 'default' | 'negative';
}) {
  const accent = variant === 'negative' ? 'bg-rose-500/10 border-rose-500/30 text-rose-100' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-100';
  return (
    <div className={`h-full rounded-2xl border p-4 ${accent}`}>
      <p className="text-sm font-semibold">{title}</p>
      <ul className="mt-3 space-y-2 text-sm">
        {items.length
          ? items.map((item, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full border border-current" />
                <span>{item}</span>
              </li>
            ))
          : (
            <li className="text-white/60">Sem entradas definidas.</li>
            )}
      </ul>
    </div>
  );
}
