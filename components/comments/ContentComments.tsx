'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MessageCircle, Flame, ThumbsUp, ThumbsDown, Award } from 'lucide-react';
import type {
  CommentContentType,
  CommentEmojiType,
  CommentListItem,
  CommentQuotaSnapshot,
} from '@/types/comments';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type ContentCommentsProps = {
  contentId: string;
  contentType: CommentContentType;
  houseId?: string | null;
  title?: string;
  className?: string;
};

type CommentApiResponse = {
  success: boolean;
  comments?: CommentListItem[];
  comment?: CommentListItem;
  quotas?: CommentQuotaSnapshot;
  nextCursor?: string | null;
  error?: string;
};

const EMOJI_META: Record<
  CommentEmojiType,
  { icon: typeof ThumbsUp; label: string; accent: string }
> = {
  positive: { icon: ThumbsUp, label: '+1', accent: 'text-emerald-400' },
  fire: { icon: Flame, label: '🔥', accent: 'text-orange-400' },
  negative: { icon: ThumbsDown, label: '-1', accent: 'text-slate-300' },
};

export function ContentComments({
  contentId,
  contentType,
  houseId = null,
  title = 'Comentários privados',
  className,
}: ContentCommentsProps) {
  const { user, getToken } = useAuth();
  const [comments, setComments] = useState<CommentListItem[]>([]);
  const [quotas, setQuotas] = useState<CommentQuotaSnapshot | null>(null);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [reactionLoading, setReactionLoading] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const token = getToken();

  const canView = Boolean(user && token);
  const canComment = Boolean(
    canView && quotas?.comment?.unlocked && (quotas?.comment?.remaining ?? 0) > 0,
  );

  const canReact = useCallback(
    (emoji: CommentEmojiType) =>
      Boolean(
        canView &&
          quotas?.reactions?.[emoji]?.unlocked &&
          (quotas?.reactions?.[emoji]?.remaining ?? 0) > 0,
      ),
    [canView, quotas?.reactions],
  );

  const fetchComments = useCallback(
    async (cursorParam?: string | null, append = false) => {
      if (!token || !user) {
        return;
      }

      const params = new URLSearchParams({
        contentId,
        contentType,
      });

      if (houseId) params.set('houseId', houseId);
      if (cursorParam) params.set('cursor', cursorParam);

      const response = await fetch(`/api/comments?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = (await response.json()) as CommentApiResponse;

      if (!data.success) {
        setError(data.error ?? 'Falha ao carregar comentários.');
        return;
      }

      setError(null);
      setQuotas(data.quotas ?? null);
      setNextCursor(data.nextCursor ?? null);
      if (append) {
        setComments((prev) => [...prev, ...(data.comments ?? [])]);
      } else {
        setComments(data.comments ?? []);
      }
    },
    [contentId, contentType, houseId, token, user],
  );

  useEffect(() => {
    if (!canView) return;

    setLoading(true);
    fetchComments()
      .catch((err) => {
        console.error('fetchComments error:', err);
        setError('Erro inesperado ao carregar comentários.');
      })
      .finally(() => setLoading(false));
  }, [canView, fetchComments]);

  const handleSubmit = async () => {
    if (!token || !user || !body.trim()) return;

    setSubmitLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          contentId,
          contentType,
          houseId,
          body,
        }),
      });

      const data = (await response.json()) as CommentApiResponse;
      if (!data.success || !data.comment) {
        setError(data.error ?? 'Falha ao enviar comentário.');
        setQuotas(data.quotas ?? quotas);
        return;
      }

      setBody('');
      setComments((prev) => [...prev, data.comment!]);
      setQuotas(data.quotas ?? null);
    } catch (err) {
      console.error('handleSubmit error:', err);
      setError('Erro inesperado ao enviar comentário.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const updateCommentInState = useCallback((updated?: CommentListItem | null) => {
    if (!updated) return;
    setComments((prev) =>
      prev.map((comment) => (comment.id === updated.id ? updated : comment)),
    );
  }, []);

  const handleReaction = async (comment: CommentListItem, emoji: CommentEmojiType) => {
    if (!token || !user) return;
    const alreadyReacted = comment.viewerReactions[emoji];
    if (!alreadyReacted && !canReact(emoji)) {
      setError('Limite diário atingido para este emoji.');
      return;
    }

    setReactionLoading(`${comment.id}-${emoji}`);
    setError(null);

    try {
      const response = await fetch(`/api/comments/${comment.id}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          emoji,
          action: alreadyReacted ? 'remove' : 'add',
        }),
      });

      const data = (await response.json()) as CommentApiResponse;
      if (!data.success) {
        setError(data.error ?? 'Falha ao reagir.');
        setQuotas(data.quotas ?? quotas);
        return;
      }

      updateCommentInState(data.comment ?? null);
      setQuotas(data.quotas ?? null);
    } catch (err) {
      console.error('handleReaction error:', err);
      setError('Erro inesperado ao reagir.');
    } finally {
      setReactionLoading(null);
    }
  };

  const loadMore = async () => {
    if (!nextCursor || !token || !user) return;
    setIsFetchingMore(true);
    try {
      await fetchComments(nextCursor, true);
    } finally {
      setIsFetchingMore(false);
    }
  };

  const remainingFire = quotas?.reactions?.fire?.remaining ?? 0;
  const remainingPositive = quotas?.reactions?.positive?.remaining ?? 0;

  const headerSubtitle = useMemo(() => {
    if (!user) {
      return 'Inicia sessão para ver e participar nesta conversa privada.';
    }
    if (!quotas) {
      return 'A preparar o feed privado desta lição...';
    }
    if (!quotas.comment.unlocked) {
      return 'Desbloqueia comentários ao chegar aos 369 XP. Continua a executar o plano diário.';
    }
    return 'Sem feed público: apenas membros autenticados podem interagir com lições e posts.';
  }, [user, quotas]);

  if (!user) {
    return (
      <Card className={cn('border-white/10 bg-[#020b16]', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <MessageCircle className="h-5 w-5 text-cyan-300" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-300">
            Faz login para ler comentários privados e interagir com o conteúdo.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!token) {
    return null;
  }

  return (
    <Card className={cn('border-white/10 bg-[#020b16]', className)}>
      <CardHeader>
        <div className="flex flex-col gap-2">
          <CardTitle className="flex items-center gap-2 text-white">
            <MessageCircle className="h-5 w-5 text-cyan-300" />
            {title}
          </CardTitle>
          <p className="text-sm text-slate-300">{headerSubtitle}</p>
          <div className="flex flex-wrap gap-2 text-xs text-slate-400">
            <Badge variant="outline" className="border-cyan-500/50 text-cyan-200">
              Comentários hoje: {quotas?.comment?.used ?? 0}/{quotas?.comment?.limit ?? 0}
            </Badge>
            <Badge variant="outline" className="border-orange-400/50 text-orange-200">
              Fogo disponível: {remainingFire}/1
            </Badge>
            <Badge variant="outline" className="border-emerald-400/40 text-emerald-200">
              +1 positivos: {remainingPositive}/5
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {error ? <p className="rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}

        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.4em] text-slate-400">Comentar</p>
          {quotas?.comment?.unlocked ? (
            <div className="space-y-3">
              <Textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Partilha o teu progresso ou a tua leitura desta lição."
                className="min-h-[100px] resize-none border-white/10 bg-black/30 text-sm text-white"
                maxLength={2000}
                disabled={submitLoading || !canComment}
              />
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>
                  {body.trim().length}/2000 caracteres ·{' '}
                  {quotas?.comment?.remaining ?? 0} comentários disponíveis hoje
                </span>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!canComment || !body.trim() || submitLoading}
                >
                  {submitLoading ? 'A enviar...' : 'Publicar comentário'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
              <p className="font-medium text-amber-100">Bloqueado</p>
              <p className="text-xs text-amber-200/80">
                Comentários e reações desbloqueiam quando atinges 369 XP totais.
                Continua a completar planos para abrir esta camada privada.
              </p>
            </div>
          )}
        </div>

        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.4em] text-slate-400">
            Conversa privada
          </p>
          {loading ? (
            <p className="text-sm text-slate-400">A carregar comentários...</p>
          ) : comments.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
              Ainda não existem comentários. Sê o primeiro a partilhar a tua análise.
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-2xl border border-white/10 bg-black/30 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {comment.author.full_name ||
                          comment.author.username ||
                          'Membro LEGACY'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(comment.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge className="bg-cyan-500/10 text-cyan-200">
                      {comment.reactionPoints} pts
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-slate-200">{comment.body}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {(Object.keys(EMOJI_META) as CommentEmojiType[]).map((emojiKey) => {
                      const meta = EMOJI_META[emojiKey];
                      const Icon = meta.icon;
                      const isActive = comment.viewerReactions[emojiKey];
                      const disabled =
                        reactionLoading === `${comment.id}-${emojiKey}` ||
                        (!isActive && !canReact(emojiKey));

                      const count =
                        emojiKey === 'positive'
                          ? comment.positiveCount
                          : emojiKey === 'fire'
                          ? comment.fireCount
                          : comment.negativeCount;

                      return (
                        <button
                          key={emojiKey}
                          className={cn(
                            'flex items-center gap-1 rounded-full border px-3 py-1 text-xs',
                            isActive
                              ? 'border-cyan-400/60 bg-cyan-400/10 text-white'
                              : 'border-white/10 text-slate-300 hover:border-white/30',
                            disabled && 'opacity-50',
                          )}
                          disabled={disabled}
                          onClick={() => handleReaction(comment, emojiKey)}
                        >
                          <Icon className={cn('h-4 w-4', meta.accent)} />
                          <span>{meta.label}</span>
                          <span className="text-slate-400">{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          {nextCursor && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={isFetchingMore}
              >
                {isFetchingMore ? 'A carregar...' : 'Ver mais comentários'}
              </Button>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4 text-sm text-purple-100">
          <div className="flex items-center gap-2 font-semibold">
            <Award className="h-4 w-4 text-amber-300" />
            🔥 Comentário da semana
          </div>
          <p className="mt-1 text-xs text-purple-100/80">
            Cada reação positiva vale 1 ponto. Reações 🔥 valem 2 pontos. O comentário
            público com maior pontuação na semana recebe 88 XP e o badge exclusivo.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
