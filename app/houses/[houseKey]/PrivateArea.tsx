'use client';

import { useEffect, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

type RecommendedContent = {
  id: string;
  title: string;
  triggerLabel: string;
  body: string;
};

type Props = {
  houseKey: string;
  recommendedContent: RecommendedContent[];
  culture: string[];
};

type MembershipResponse = {
  success: boolean;
  isMember: boolean;
  roles: string[];
};

type HouseMessage = {
  id: string;
  title: string;
  body: string;
  badgeLabel: string | null;
  updatedAt: string | null;
};

export function PrivateArea({ houseKey, recommendedContent, culture }: Props) {
  const { user, loading } = useAuth();
  const [membership, setMembership] = useState<MembershipResponse | null>(null);
  const [loadingMembership, setLoadingMembership] = useState(false);
  const [messages, setMessages] = useState<HouseMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (loading || !user) {
      setMembership(null);
      return;
    }
    setLoadingMembership(true);
    fetch(`/api/houses/${houseKey}/membership`, { cache: 'no-store' })
      .then(async (response) => {
        if (response.status === 401) {
          setMembership(null);
          return;
        }
        const data = (await response.json()) as MembershipResponse;
        setMembership(data);
      })
      .catch((error) => {
        console.error('[house membership] failed', error);
        toast({
          title: 'Falha ao verificar acesso',
          description: 'Tenta novamente mais tarde.',
          variant: 'destructive',
        });
      })
      .finally(() => {
        setLoadingMembership(false);
      });
  }, [loading, user, houseKey, toast]);

  useEffect(() => {
    if (!membership?.isMember) {
      setMessages([]);
      return;
    }
    setMessagesLoading(true);
    setMessagesError(null);
    fetch(`/api/houses/${houseKey}/messages?limit=5`, { cache: 'no-store' })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | { success: true; messages: HouseMessage[] }
          | { success: false; error?: string }
          | null;
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || 'Falha ao carregar mensagens.');
        }
        setMessages(payload.messages ?? []);
      })
      .catch((error) => {
        console.error('[house messages] failed', error);
        setMessagesError('NÇœo foi possÇðvel carregar as mensagens.');
        setMessages([]);
      })
      .finally(() => {
        setMessagesLoading(false);
      });
  }, [houseKey, membership?.isMember]);

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 px-4 md:px-8">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#030d18] via-[#021523] to-[#031b27] p-6 shadow-[0_35px_90px_rgba(3,10,25,0.45)] md:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.5em] text-cyan-300">Área Privada</p>
            <h2 className="text-2xl font-semibold text-white">Operação da House</h2>
            <p className="text-sm text-white/70">Conteúdos e mensagens reservadas a membros confirmados.</p>
          </div>
          {!user ? (
            <Button
              className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500]"
              onClick={() => {
                window.location.href = '/login?next=' + encodeURIComponent(`/houses/${houseKey}`);
              }}
            >
              Iniciar sessão
            </Button>
          ) : null}
        </div>
      </div>

      {loadingMembership ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-3xl border border-white/10 bg-[#030d18] text-white/70">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>A verificar acesso...</span>
          </div>
        </div>
      ) : !user ? (
        <div className="rounded-3xl border border-white/10 bg-[#020b16]/70 p-6 text-sm text-white/80">
          Inicia sessão para ver a operação interna desta House.
        </div>
      ) : !membership?.isMember ? (
        <div className="rounded-3xl border border-white/10 bg-[#020b16]/70 p-6 text-sm text-white/80">
          Esta secção é reservada aos membros confirmados da House. Aguarda aprovação ou contacta o Head após completar o onboarding recomendado.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="border-white/10 bg-[#03131d]/90">
            <CardHeader>
              <CardTitle className="text-lg text-white">Conteúdos recomendados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recommendedContent.length ? (
                recommendedContent.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">{item.triggerLabel}</p>
                    <p className="mt-2 text-lg font-semibold text-white">{item.title}</p>
                    <p className="mt-2 text-sm text-white/70">{item.body}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/70">Ainda não existe uma sequência recomendada para esta House.</p>
              )}
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-[#03131d]/90">
            <CardHeader>
              <CardTitle className="text-lg text-white">Mensagens & Cultura</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {culture.length ? (
                <ul className="space-y-3">
                  {culture.map((item, index) => (
                    <li key={index} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/80">
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-white/70">O Head ainda não definiu a cultura interna partilhada.</p>
              )}
              <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
                Novas mensagens oficiais são enviadas via pop-ups e notificações internas. Confirma se tens o onboarding em dia.
              </div>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-[#03131d]/90">
            <CardHeader>
              <CardTitle className="text-lg text-white">Mensagens oficiais recentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-white/80">
              {messagesLoading ? (
                <div className="flex items-center gap-2 text-white/70">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>A carregar mensagens...</span>
                </div>
              ) : messagesError ? (
                <p className="text-rose-200">{messagesError}</p>
              ) : messages.length ? (
                messages.map((message) => (
                  <div key={message.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
                      {message.badgeLabel || 'Pop-up oficial'}
                    </p>
                    <p className="mt-2 text-base font-semibold text-white">{message.title}</p>
                    <p className="mt-2 text-sm text-white/70 line-clamp-3">{message.body}</p>
                    {message.updatedAt ? (
                      <p className="mt-2 text-xs text-white/60">
                        Atualizado{' '}
                        {new Date(message.updatedAt).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                      </p>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-white/70">Sem mensagens recentes. Quando o Head publicar novas instruções elas surgem aqui.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
