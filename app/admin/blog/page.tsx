// app/admin/blog/page.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileText,
  Plus,
  Eye,
  Edit,
  Trash2,
  Calendar,
  User,
  Loader2,
  Zap,
  History,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { SafeImage } from '@/app/components/SafeImage';

type BlogPost = {
  id: string;
  title: any;
  excerpt: any;
  status?: string;
  category?: string | null;
  author?: string | null;
  author_id?: string | null;
  author_name?: string | null;
  created_at: string | null;
  image_url?: string | null;
  views?: number | null;
  published?: boolean | null;
  registered_only?: boolean | null;
  xp_total_distributed?: number;
  xp_creator_distributed?: number;
};

type XpHistoryEntry = {
  id: string;
  xp: number;
  completedAt: string;
  user: {
    id: string;
    name: string;
  };
};

type PermissionsResponse = {
  success: boolean;
  error?: string;
  permissions?: {
    canManageBlog?: boolean;
    [key: string]: any;
  };
};

type PostsResponse = {
  success: boolean;
  error?: string;
  posts?: BlogPost[];
};

// Converte texto localizado em string
function resolveLocalizedText(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const preferredOrder = ['en', 'pt', 'es', 'fr', 'it', 'de'];
    for (const key of preferredOrder) {
      const candidate = (value as any)[key];
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate;
      }
    }
    const fallback = Object.values(value as any).find(
      (x) => typeof x === 'string' && x.trim().length > 0,
    );
    if (typeof fallback === 'string') {
      return fallback;
    }
    return '';
  }
  return String(value);
}

const getAuthorMeta = (post: BlogPost) => {
  const label =
    (post.author_name || post.author || 'Admin').trim() || 'Admin';
  const value = post.author_id || `name:${label.toLowerCase()}`;
  return { label, value };
};

type SupportedCopyLang = 'en' | 'pt' | 'es';

type BlogCopy = {
  locale: string;
  loadingAdmin: string;
  hero: {
    badge: string;
    title: string;
    description: string;
    xpLabel: string;
    xpDescription: string;
    trendLabel: string;
    trendDescription: string;
    focusButtonActive: string;
    focusButtonInactive: string;
  };
  stats: {
    total: string;
    published: string;
    draft: string;
    xp: string;
    views: string;
  };
  topLists: {
    viewsTitle: string;
    viewsEmpty: string;
    xpTitle: string;
    xpEmpty: string;
    viewsSuffix: string;
    xpSuffix: string;
  };
  filters: {
    title: string;
    description: string;
    statusLabel: string;
    categoryLabel: string;
    authorLabel: string;
    authorAllLabel: string;
    orderLabel: string;
    categoryPlaceholder: string;
    authorPlaceholder: string;
    newPost: string;
    statusOptions: {
      all: string;
      published: string;
      draft: string;
    };
    sortOptions: {
      recent: string;
      views: string;
      xp: string;
    };
  };
  actions: {
    badge: string;
    title: string;
    description: string;
    publishButton: string;
    saveDraftButton: string;
    reviewButton: string;
    topViewsCardTitle: string;
    topViewsEmpty: string;
    topViewsButton: string;
    topXpCardTitle: string;
    topXpEmpty: string;
    topXpButton: string;
    draftSavedTitle: string;
    draftSavedDescription: string;
  };
  list: {
    loading: string;
    emptyTitle: string;
    emptySubtitle: string;
    emptyButton: string;
  };
  table: {
    listTitle: string;
    untitledPost: string;
    noExcerpt: string;
    viewsSuffix: string;
    viewButton: string;
    editButton: string;
    badges: {
      creator: string;
      membersOnly: string;
      xpLabel: string;
      xpCreatorLabel: string;
      xpHistory: string;
    };
    statusLabels: {
      published: string;
      draft: string;
    };
  };
  prompts: {
    deleteConfirm: string;
  };
  toasts: {
    loadPostsErrorTitle: string;
    loadPostsErrorDescription: string;
    networkErrorTitle: string;
    networkErrorDescription: string;
    deleteErrorTitle: string;
    deleteErrorDescription: string;
    deleteSuccessTitle: string;
    deleteSuccessDescription: string;
    deleteNetworkErrorDescription: string;
  };
  history: {
    buttonLabel: string;
    dialogTitle: string;
    dialogDescription: string;
    loading: string;
    empty: string;
    error: string;
    loadMore: string;
    entriesLabel: string;
  };
};

const BLOG_COPY: Record<SupportedCopyLang, BlogCopy> = {
  en: {
    locale: 'en-US',
    loadingAdmin: 'Loading blog admin...',
    hero: {
      badge: 'LEGACY ADMIN - BLOG',
      title: 'Blog Management',
      description:
        'Centralized management of posts, XP and blog analytics. Filter, review and keep the LEGACY story updated.',
      xpLabel: 'Weekly XP goal',
      xpDescription: 'Goal: publish 3+ articles awarding at least 200 XP each.',
      trendLabel: 'Trend monitored',
      trendDescription: 'in the last 7 days',
      focusButtonActive: 'Focus mode on',
      focusButtonInactive: 'Enable focus mode',
    },
    stats: {
      total: 'Total posts',
      published: 'Published',
      draft: 'Draft',
      xp: 'XP distributed',
      views: 'Views (total)',
    },
    topLists: {
      viewsTitle: 'Top posts by views',
      viewsEmpty: 'No views yet.',
      xpTitle: 'Top posts by XP',
      xpEmpty: 'No XP distributed yet.',
      viewsSuffix: 'views',
      xpSuffix: 'XP',
    },
    filters: {
      title: 'Filters',
      description: 'Combine status, category, author and ordering.',
      statusLabel: 'Status',
      categoryLabel: 'Category',
      authorLabel: 'Author',
      authorAllLabel: 'All authors',
      orderLabel: 'Order by',
      categoryPlaceholder: 'e.g. News',
      authorPlaceholder: 'name or username',
      newPost: 'New Post',
      statusOptions: {
        all: 'All',
        published: 'Published',
        draft: 'Draft',
      },
      sortOptions: {
        recent: 'Most recent',
        views: 'Views',
        xp: 'XP distributed',
      },
    },
    actions: {
      badge: 'New',
      title: 'Priority content actions',
      description:
        'Publish, prepare drafts or trigger reviews while keeping XP impact in sight.',
      publishButton: 'Publish now (earn XP)',
      saveDraftButton: 'Save draft',
      reviewButton: 'Review performance',
      topViewsCardTitle: 'Top post by views',
      topViewsEmpty: 'No posts with tracked views yet.',
      topViewsButton: 'Open post',
      topXpCardTitle: 'XP impact',
      topXpEmpty: 'No posts with distributed XP yet.',
      topXpButton: 'View',
      draftSavedTitle: 'Draft saved',
      draftSavedDescription:
        'The draft was stored temporarily so you can continue later.',
    },
    list: {
      loading: 'Loading posts...',
      emptyTitle: 'No blog posts found',
      emptySubtitle:
        'Adjust filters or create your first blog post to get started.',
      emptyButton: 'Create Post',
    },
    table: {
      listTitle: 'All posts ({{count}})',
      untitledPost: 'Untitled post',
      noExcerpt: 'No excerpt',
      viewsSuffix: 'views',
      viewButton: 'View',
      editButton: 'Edit',
      badges: {
        creator: 'Creator',
        membersOnly: 'Members only',
        xpLabel: 'XP:',
        xpCreatorLabel: 'Creator XP:',
        xpHistory: 'XP history',
      },
      statusLabels: {
        published: 'published',
        draft: 'draft',
      },
    },
    prompts: {
      deleteConfirm:
        'Are you sure you want to permanently delete this blog post?',
    },
    toasts: {
      loadPostsErrorTitle: 'Error loading posts',
      loadPostsErrorDescription: 'Failed to load blog posts.',
      networkErrorTitle: 'Network error',
      networkErrorDescription:
        'Could not load posts. Please try again.',
      deleteErrorTitle: 'Error deleting post',
      deleteErrorDescription: 'Failed to delete blog post.',
      deleteSuccessTitle: 'Post deleted',
      deleteSuccessDescription: 'The blog post was deleted successfully.',
      deleteNetworkErrorDescription:
        'Could not delete blog post. Please try again.',
    },
    history: {
      buttonLabel: 'XP history',
      dialogTitle: 'XP history',
      dialogDescription: 'Tracked XP earned in this post.',
      loading: 'Loading XP history...',
      empty: 'No XP entries yet.',
      error: 'Failed to load XP history.',
      loadMore: 'Load more',
      entriesLabel: 'entries loaded',
    },
  },
  pt: {
    locale: 'pt-PT',
    loadingAdmin: 'A carregar area de blog...',
    hero: {
      badge: 'LEGACY ADMIN - BLOG',
      title: 'Gestao do Blog',
      description:
        'Gestao centralizada de posts, XP e metricas do blog. Filtra, reve e mantem viva a narrativa LEGACY.',
      xpLabel: 'Meta semanal de XP',
      xpDescription: 'Meta: publicar +3 artigos com 200+ XP cada.',
      trendLabel: 'Tendencia monitorizada',
      trendDescription: 'nos ultimos 7 dias',
      focusButtonActive: 'Modo foco ativo',
      focusButtonInactive: 'Ativar modo foco',
    },
    stats: {
      total: 'Total de posts',
      published: 'Publicados',
      draft: 'Rascunhos',
      xp: 'XP distribuido',
      views: 'Visualizacoes (total)',
    },
    topLists: {
      viewsTitle: 'Top posts por visualizacoes',
      viewsEmpty: 'Ainda sem visualizacoes.',
      xpTitle: 'Top posts por XP',
      xpEmpty: 'Ainda sem XP distribuido.',
      viewsSuffix: 'visualizacoes',
      xpSuffix: 'XP',
    },
    filters: {
      title: 'Filtros',
      description: 'Combina estado, categoria, autor e ordenacao.',
      statusLabel: 'Estado',
      categoryLabel: 'Categoria',
      authorLabel: 'Autor',
      authorAllLabel: 'Todos os autores',
      orderLabel: 'Ordenar por',
      categoryPlaceholder: 'ex: Noticias',
      authorPlaceholder: 'nome ou username',
      newPost: 'Novo post',
      statusOptions: {
        all: 'Todos',
        published: 'Publicado',
        draft: 'Rascunho',
      },
      sortOptions: {
        recent: 'Mais recente',
        views: 'Visualizacoes',
        xp: 'XP distribuido',
      },
    },
    actions: {
      badge: 'Novo',
      title: 'Acoes prioritarias de conteudo',
      description:
        'Publica, prepara rascunhos ou dispara revisoes mantendo o foco no impacto de XP.',
      publishButton: 'Publicar agora (ganha XP)',
      saveDraftButton: 'Guardar rascunho',
      reviewButton: 'Rever desempenho',
      topViewsCardTitle: 'Top post por visualizacoes',
      topViewsEmpty: 'Sem posts com visualizacoes registadas.',
      topViewsButton: 'Abrir post',
      topXpCardTitle: 'Impacto de XP',
      topXpEmpty: 'Ainda nao ha posts com XP distribuido.',
      topXpButton: 'Ver',
      draftSavedTitle: 'Rascunho guardado',
      draftSavedDescription:
        'O rascunho foi guardado temporariamente para continuares mais tarde.',
    },
    list: {
      loading: 'A carregar posts...',
      emptyTitle: 'Sem posts de blog',
      emptySubtitle:
        'Ajusta os filtros ou cria o primeiro artigo para comecar.',
      emptyButton: 'Criar post',
    },
    table: {
      listTitle: 'Todos os posts ({{count}})',
      untitledPost: 'Post sem titulo',
      noExcerpt: 'Sem excerto',
      viewsSuffix: 'visualizacoes',
      viewButton: 'Ver',
      editButton: 'Editar',
      badges: {
        creator: 'Autor',
        membersOnly: 'So para membros',
        xpLabel: 'XP:',
        xpCreatorLabel: 'XP do autor:',
        xpHistory: 'Histórico de XP',
      },
      statusLabels: {
        published: 'publicado',
        draft: 'rascunho',
      },
    },
    prompts: {
      deleteConfirm: 'Tens a certeza de que queres apagar este post do blog?',
    },
    toasts: {
      loadPostsErrorTitle: 'Erro ao carregar posts',
      loadPostsErrorDescription: 'Nao foi possivel carregar os posts do blog.',
      networkErrorTitle: 'Erro de rede',
      networkErrorDescription:
        'Nao conseguimos carregar os posts. Tenta novamente.',
      deleteErrorTitle: 'Erro ao apagar post',
      deleteErrorDescription: 'Nao foi possivel apagar o post.',
      deleteSuccessTitle: 'Post apagado',
      deleteSuccessDescription: 'O post foi removido com sucesso.',
      deleteNetworkErrorDescription:
        'Nao foi possivel apagar o post. Tenta novamente.',
    },
    history: {
      buttonLabel: 'Histórico de XP',
      dialogTitle: 'Histórico de XP',
      dialogDescription: 'XP registado para este artigo.',
      loading: 'A carregar histórico de XP...',
      empty: 'Ainda não existem registos de XP.',
      error: 'Falha ao carregar o histórico de XP.',
      loadMore: 'Ver mais',
      entriesLabel: 'registos carregados',
    },
  },
  es: {
    locale: 'es-ES',
    loadingAdmin: 'Cargando administracion del blog...',
    hero: {
      badge: 'LEGACY ADMIN - BLOG',
      title: 'Gestion del Blog',
      description:
        'Gestion centralizada de publicaciones, XP y metricas del blog. Filtra, revisa y mantiene viva la narrativa de LEGACY.',
      xpLabel: 'Meta semanal de XP',
      xpDescription:
        'Meta: publicar 3+ articulos con al menos 200 XP cada uno.',
      trendLabel: 'Tendencia monitorizada',
      trendDescription: 'en los ultimos 7 dias',
      focusButtonActive: 'Modo foco activo',
      focusButtonInactive: 'Activar modo foco',
    },
    stats: {
      total: 'Total de posts',
      published: 'Publicados',
      draft: 'Borradores',
      xp: 'XP distribuido',
      views: 'Visualizaciones (total)',
    },
    topLists: {
      viewsTitle: 'Top posts por visualizaciones',
      viewsEmpty: 'Aun sin visualizaciones.',
      xpTitle: 'Top posts por XP',
      xpEmpty: 'Aun sin XP distribuido.',
      viewsSuffix: 'visualizaciones',
      xpSuffix: 'XP',
    },
    filters: {
      title: 'Filtros',
      description: 'Combina estado, categoria, autor y ordenacion.',
      statusLabel: 'Estado',
      categoryLabel: 'Categoria',
      authorLabel: 'Autor',
      authorAllLabel: 'Todos los autores',
      orderLabel: 'Ordenar por',
      categoryPlaceholder: 'ej: Noticias',
      authorPlaceholder: 'nombre o usuario',
      newPost: 'Nuevo post',
      statusOptions: {
        all: 'Todos',
        published: 'Publicado',
        draft: 'Borrador',
      },
      sortOptions: {
        recent: 'Mas reciente',
        views: 'Visualizaciones',
        xp: 'XP distribuido',
      },
    },
    actions: {
      badge: 'Nuevo',
      title: 'Acciones prioritarias de contenido',
      description:
        'Publica, prepara borradores o lanza revisiones manteniendo el impacto de XP.',
      publishButton: 'Publicar ahora (ganar XP)',
      saveDraftButton: 'Guardar borrador',
      reviewButton: 'Revisar rendimiento',
      topViewsCardTitle: 'Top post por visualizaciones',
      topViewsEmpty: 'Sin posts con visualizaciones registradas.',
      topViewsButton: 'Abrir post',
      topXpCardTitle: 'Impacto de XP',
      topXpEmpty: 'Aun no hay posts con XP distribuido.',
      topXpButton: 'Ver',
      draftSavedTitle: 'Borrador guardado',
      draftSavedDescription:
        'El borrador se guardo temporalmente para continuar despues.',
    },
    list: {
      loading: 'Cargando posts...',
      emptyTitle: 'No hay posts del blog',
      emptySubtitle:
        'Ajusta los filtros o crea la primera publicacion para empezar.',
      emptyButton: 'Crear post',
    },
    table: {
      listTitle: 'Todos los posts ({{count}})',
      untitledPost: 'Post sin titulo',
      noExcerpt: 'Sin extracto',
      viewsSuffix: 'visualizaciones',
      viewButton: 'Ver',
      editButton: 'Editar',
      badges: {
        creator: 'Autor',
        membersOnly: 'Solo miembros',
        xpLabel: 'XP:',
        xpCreatorLabel: 'XP del autor:',
        xpHistory: 'Historial de XP',
      },
      statusLabels: {
        published: 'publicado',
        draft: 'borrador',
      },
    },
    prompts: {
      deleteConfirm:
        'Seguro que quieres eliminar este post del blog de forma permanente?',
    },
    toasts: {
      loadPostsErrorTitle: 'Error al cargar posts',
      loadPostsErrorDescription:
        'No se pudieron cargar los posts del blog.',
      networkErrorTitle: 'Error de red',
      networkErrorDescription:
        'No pudimos cargar los posts. Intentalo de nuevo.',
      deleteErrorTitle: 'Error al eliminar post',
      deleteErrorDescription: 'No se pudo eliminar el post.',
      deleteSuccessTitle: 'Post eliminado',
      deleteSuccessDescription: 'El post se elimino correctamente.',
      deleteNetworkErrorDescription:
        'No se pudo eliminar el post. Intentalo de nuevo.',
    },
    history: {
      buttonLabel: 'Historial de XP',
      dialogTitle: 'Historial de XP',
      dialogDescription: 'XP registrado en este artículo.',
      loading: 'Cargando historial de XP...',
      empty: 'Aún no hay registros de XP.',
      error: 'No se pudo cargar el historial de XP.',
      loadMore: 'Ver más',
      entriesLabel: 'registros cargados',
    },
  },
};

export default function AdminBlogPage() {
  const router = useRouter();
  const { user, loading, getToken } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const copy = BLOG_COPY[language as SupportedCopyLang];
  const formatNumber = (value: number) => value.toLocaleString(copy.locale);

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [canManageBlog, setCanManageBlog] = useState(false);

  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [authorFilter, setAuthorFilter] = useState<'all' | string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'views' | 'xp'>('recent');
  const [focusMode, setFocusMode] = useState(false);
  const [xpHistoryOpen, setXpHistoryOpen] = useState(false);
  const [xpHistoryPost, setXpHistoryPost] = useState<{ id: string; title: string } | null>(null);
  const [xpHistoryEntries, setXpHistoryEntries] = useState<XpHistoryEntry[]>([]);
  const [xpHistoryLoading, setXpHistoryLoading] = useState(false);
  const [xpHistoryError, setXpHistoryError] = useState<string | null>(null);
  const [xpHistoryHasMore, setXpHistoryHasMore] = useState(false);
  const [xpHistoryPage, setXpHistoryPage] = useState(0);
  const HISTORY_PAGE_SIZE = 25;

  const authorOptions = useMemo(() => {
    const map = new Map<string, { value: string; label: string }>();
    posts.forEach((post) => {
      const meta = getAuthorMeta(post);
      if (!map.has(meta.value)) {
        map.set(meta.value, meta);
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label, copy.locale),
    );
  }, [posts, copy.locale]);

  const isSuperAdmin = user?.role === 'Super Admin';
  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString(copy.locale, {
      dateStyle: 'short',
      timeStyle: 'short',
    });

  const fetchXpHistory = useCallback(
    async (postId: string, page = 0, append = false) => {
      setXpHistoryLoading(true);
      setXpHistoryError(null);
      try {
        const token = getToken();
        const params = new URLSearchParams({
          limit: HISTORY_PAGE_SIZE.toString(),
          offset: String(page * HISTORY_PAGE_SIZE),
        });
        const response = await fetch(
          `/api/admin/blog/${postId}/xp-history?${params.toString()}`,
          {
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          },
        );
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to load XP history');
        }
        const entries: XpHistoryEntry[] = data.entries || [];
        setXpHistoryEntries((prev) =>
          append ? [...prev, ...entries] : entries,
        );
        setXpHistoryHasMore(Boolean(data.hasMore));
        setXpHistoryPage(page);
      } catch (error: any) {
        setXpHistoryError(
          error?.message || 'Failed to load XP history',
        );
      } finally {
        setXpHistoryLoading(false);
      }
    },
    [getToken],
  );

  const handleOpenHistory = useCallback(
    (post: BlogPost) => {
      const title =
        resolveLocalizedText(post.title) || copy.table.untitledPost;
      setXpHistoryPost({ id: post.id, title });
      setXpHistoryEntries([]);
      setXpHistoryHasMore(false);
      setXpHistoryError(null);
      setXpHistoryPage(0);
      setXpHistoryOpen(true);
      void fetchXpHistory(post.id, 0, false);
    },
    [copy.table.untitledPost, fetchXpHistory],
  );

  const handleLoadMoreHistory = () => {
    if (!xpHistoryPost) return;
    const nextPage = xpHistoryPage + 1;
    void fetchXpHistory(xpHistoryPost.id, nextPage, true);
  };

  const handleCloseHistory = () => {
    setXpHistoryOpen(false);
    setXpHistoryPost(null);
    setXpHistoryEntries([]);
    setXpHistoryError(null);
    setXpHistoryHasMore(false);
    setXpHistoryPage(0);
  };

  // ProteAAo bAsica
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'Super Admin' && user.role !== 'Admin') {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // Buscar permissAes
  useEffect(() => {
    if (loading || !user) return;

    if (user.role === 'Super Admin') {
      setCanManageBlog(true);
      setPermissionsLoaded(true);
      return;
    }

    const fetchPermissions = async () => {
      try {
        const token = getToken();
        const res = await fetch('/api/admin/permissions/self', {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const data: PermissionsResponse = await res.json();

        if (!res.ok || !data.success || !data.permissions) {
          console.error('Error loading permissions for current user:', data);
          setCanManageBlog(false);
          setPermissionsLoaded(true);
          return;
        }

        setCanManageBlog(!!data.permissions.canManageBlog);
        setPermissionsLoaded(true);
      } catch (err) {
        console.error('Unexpected error fetching permissions:', err);
        setCanManageBlog(false);
        setPermissionsLoaded(true);
      }
    };

    fetchPermissions();
  }, [user, loading, getToken]);

  // Buscar posts (admin)
  useEffect(() => {
    const fetchPosts = async () => {
      setLoadingData(true);
      try {
        const token = getToken();
        const response = await fetch('/api/admin/blog', {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const data: PostsResponse = await response.json();
        if (response.ok && data.success) {
          setPosts(data.posts || []);
        } else {
          console.error('Error loading posts:', data);
          toast({
            title: copy.toasts.loadPostsErrorTitle,
            description: data.error || copy.toasts.loadPostsErrorDescription,
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Failed to fetch posts:', error);
        toast({
          title: copy.toasts.networkErrorTitle,
          description: copy.toasts.networkErrorDescription,
          variant: 'destructive',
        });
      } finally {
        setLoadingData(false);
      }
    };

    if (user && (user.role === 'Super Admin' || user.role === 'Admin')) {
      fetchPosts();
    }
  }, [user, toast, getToken, copy]);

  // Apagar post
  const handleDelete = async (postId: string) => {
    if (!user || !canManageBlog || !isSuperAdmin) return;

    const confirmed = window.confirm(copy.prompts.deleteConfirm);
    if (!confirmed) return;

    try {
      const token = getToken();
      const res = await fetch(`/api/admin/blog/${postId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        console.error('Error deleting blog post:', data);
        toast({
          title: copy.toasts.deleteErrorTitle,
          description: data.error || copy.toasts.deleteErrorDescription,
          variant: 'destructive',
        });
        return;
      }

      setPosts((prev) => prev.filter((p) => p.id !== postId));

      toast({
        title: copy.toasts.deleteSuccessTitle,
        description: copy.toasts.deleteSuccessDescription,
      });
    } catch (err) {
      console.error('Network error deleting blog post:', err);
      toast({
        title: copy.toasts.networkErrorTitle,
        description: copy.toasts.deleteNetworkErrorDescription,
        variant: 'destructive',
      });
    }
  };

  if (
    loading ||
    !user ||
    (user.role !== 'Super Admin' && user.role !== 'Admin') ||
    !permissionsLoaded
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#000c12] text-white">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-300" />
          <p className="mt-4 text-slate-200">{copy.loadingAdmin}</p>
        </div>
      </div>
    );
  }

  const publishedPosts = posts.filter(
    (p: any) => p.status === 'published' || p.published,
  );
  const draftPosts = posts.filter(
    (p: any) => p.status === 'draft' || !p.published,
  );
  const xpTotalAll = posts.reduce(
    (acc, p: any) => acc + (p.xp_total_distributed || 0),
    0,
  );
  const totalViewsAll = posts.reduce(
    (acc, p: any) => acc + (p.views || 0),
    0,
  );

  const topByViews = [...posts]
    .filter((p) => (p.views || 0) > 0)
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 3);

  const topByXP = [...posts]
    .filter((p) => (p.xp_total_distributed || 0) > 0)
    .sort(
      (a, b) =>
        (b.xp_total_distributed || 0) - (a.xp_total_distributed || 0),
    )
    .slice(0, 3);

  const filteredPosts = [...posts]
    .filter((p) => {
      const st = p.status || (p.published ? 'published' : 'draft');
      if (statusFilter !== 'all' && st !== statusFilter) return false;
      if (
        categoryFilter.trim() &&
        !(p.category || '')
          .toLowerCase()
          .includes(categoryFilter.toLowerCase())
      ) {
        return false;
      }
      if (authorFilter !== 'all') {
        const meta = getAuthorMeta(p);
        if (meta.value !== authorFilter) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'views') return (b.views || 0) - (a.views || 0);
      if (sortBy === 'xp')
        return (
          (b.xp_total_distributed || 0) - (a.xp_total_distributed || 0)
        );
      // recent
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });

  return (
    <>
      <div className="min-h-screen w-full space-y-8 bg-gradient-to-b from-[#020b16] via-[#00141f] to-[#000c12] px-4 py-6 text-white md:px-8">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-[#020b16] via-[#00141f] to-[#021c27] px-6 py-10 shadow-[0_35px_90px_rgba(3,10,25,0.65)]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-10 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-5xl space-y-4">
          <p className="text-xs uppercase tracking-[0.6em] text-cyan-200">
            {copy.hero.badge}
          </p>
          <h1 className="text-3xl font-semibold text-[#fdd87c] md:text-4xl">
            {copy.hero.title}
          </h1>
          <p className="text-sm text-slate-100 md:text-base">
            {copy.hero.description}
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-[#021824]/80 px-4 py-3 text-sm text-white shadow-[0_25px_70px_rgba(3,10,25,0.55)]">
              <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-200">
                {copy.hero.xpLabel}
              </p>
              <p className="text-xl font-semibold">
                {formatNumber(xpTotalAll)} XP
              </p>
              <p className="text-xs text-slate-300">
                {copy.hero.xpDescription}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#021824]/80 px-4 py-3 text-xs text-white shadow-[0_25px_70px_rgba(3,10,25,0.55)]">
              <div className="flex items-center gap-2 text-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                {copy.hero.trendLabel}
              </div>
              <p className="text-lg font-semibold">
                {formatNumber(totalViewsAll)} {copy.topLists.viewsSuffix}
              </p>
              <p className="text-xs text-slate-300">
                {copy.hero.trendDescription}
              </p>
            </div>
            <Button
              variant="outline"
              className="flex items-center justify-center gap-2 border-white/40 text-white hover:bg-white/10"
              onClick={() => setFocusMode((prev) => !prev)}
            >
              <Zap className="h-4 w-4" />
              {focusMode
                ? copy.hero.focusButtonActive
                : copy.hero.focusButtonInactive}
            </Button>
          </div>
        </div>
      </section>

      {/* CONTEUDO PRINCIPAL */}
      <section
        className={`pb-2 ${
          focusMode
            ? 'bg-slate-950/80 shadow-inner shadow-blue-900/50 transition-all duration-300'
            : ''
        }`}
      >
        <div className="max-w-6xl mx-auto space-y-6">
          {/* STAT CARDS */}
          <div className="grid gap-4 md:grid-cols-5 mb-2">
            <Card className="bg-[#04131b] border border-white/10">
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium text-white">
                  {copy.stats.total}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-white">
                <div className="text-2xl font-bold">
                  {formatNumber(posts.length)}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#04131b] border border-white/10">
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium text-white">
                  {copy.stats.published}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold text-emerald-400">
                  {formatNumber(publishedPosts.length)}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#04131b] border border-white/10">
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium text-white">
                  {copy.stats.draft}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold text-amber-400">
                  {formatNumber(draftPosts.length)}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#04131b] border border-white/10">
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium text-white">
                  {copy.stats.xp}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold text-blue-400">
                  {formatNumber(xpTotalAll)}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#04131b] border border-white/10">
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium text-white">
                  {copy.stats.views}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold text-purple-400">
                  {formatNumber(totalViewsAll)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* TOP LISTS */}
          {posts.length > 0 && (
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-[#04131b] border border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    {copy.topLists.viewsTitle}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-slate-200">
                  {topByViews.length === 0 ? (
                    <p className="text-sm text-slate-300">
                      {copy.topLists.viewsEmpty}
                    </p>
                  ) : (
                    topByViews.map((p, idx) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between text-sm border border-slate-800 rounded-md px-3 py-2 bg-slate-950/60"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">#{idx + 1}</Badge>
                          <span className="font-semibold truncate max-w-[200px]">
                            {resolveLocalizedText(p.title) || copy.table.untitledPost}
                          </span>
                        </div>
                        <div className="text-slate-300">
                          {formatNumber(p.views || 0)} {copy.topLists.viewsSuffix}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="bg-[#04131b] border border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    {copy.topLists.xpTitle}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-slate-200">
                  {topByXP.length === 0 ? (
                    <p className="text-sm text-slate-300">
                      {copy.topLists.xpEmpty}
                    </p>
                  ) : (
                    topByXP.map((p, idx) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between text-sm border border-slate-800 rounded-md px-3 py-2 bg-slate-950/60"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">#{idx + 1}</Badge>
                          <span className="font-semibold truncate max-w-[200px]">
                            {resolveLocalizedText(p.title) || copy.table.untitledPost}
                          </span>
                        </div>
                        <div className="text-slate-300">
                          {formatNumber(p.xp_total_distributed || 0)} {copy.topLists.xpSuffix}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* FILTROS + BOTAO NOVO POST */}
          <Card className="bg-[#04131b] border border-white/10">
            <CardHeader className="pb-0 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <CardTitle className="text-sm text-white">
                  {copy.filters.title}
                </CardTitle>
                <CardDescription className="text-slate-300">
                  {copy.filters.description}
                </CardDescription>
              </div>
              <Button
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={!canManageBlog}
                onClick={() => {
                  if (!canManageBlog) return;
                  router.push('/admin/blog/create');
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                {copy.filters.newPost}
              </Button>
            </CardHeader>
            <CardContent className="pt-4 grid md:grid-cols-4 gap-4 text-slate-200">
              <div className="space-y-1">
                <p className="text-xs text-slate-300">
                  {copy.filters.statusLabel}
                </p>
                <select
                  className="w-full rounded-md border border-white/10 bg-[#000c12] px-3 py-2 text-sm text-white shadow-sm focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as 'all' | 'published' | 'draft')
                  }
                >
                  <option value="all">{copy.filters.statusOptions.all}</option>
                  <option value="published">
                    {copy.filters.statusOptions.published}
                  </option>
                  <option value="draft">
                    {copy.filters.statusOptions.draft}
                  </option>
                </select>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-300">
                  {copy.filters.categoryLabel}
                </p>
                <input
                  className="w-full rounded-md border border-white/10 bg-[#000c12] px-3 py-2 text-sm text-white placeholder:text-xs placeholder:text-slate-400 shadow-sm focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  placeholder={copy.filters.categoryPlaceholder}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-300">
                  {copy.filters.authorLabel}
                </p>
                <select
                  className="w-full rounded-md border border-white/10 bg-[#000c12] px-3 py-2 text-sm text-white shadow-sm focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  value={authorFilter}
                  onChange={(e) => setAuthorFilter(e.target.value)}
                >
                  <option value="all">{copy.filters.authorAllLabel}</option>
                  {authorOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-300">
                  {copy.filters.orderLabel}
                </p>
                <select
                  className="w-full rounded-md border border-white/10 bg-[#000c12] px-3 py-2 text-sm text-white shadow-sm focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as 'recent' | 'views' | 'xp')
                  }
                >
                  <option value="recent">
                    {copy.filters.sortOptions.recent}
                  </option>
                  <option value="views">
                    {copy.filters.sortOptions.views}
                  </option>
                  <option value="xp">{copy.filters.sortOptions.xp}</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* ACTION PANEL */}
        <Card className="border border-white/10 bg-[#04131b] shadow-lg shadow-black/30">
            <CardHeader className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Badge className="border border-cyan-400/40 bg-cyan-400/10 text-cyan-200">
                  {copy.actions.badge}
                </Badge>
                <CardTitle className="text-white">
                  {copy.actions.title}
                </CardTitle>
              </div>
              <CardDescription className="text-slate-300">
                {copy.actions.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <Button
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                  onClick={() => {
                    if (!canManageBlog) return;
                    router.push('/admin/blog/create');
                  }}
                  disabled={!canManageBlog}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {copy.actions.publishButton}
                </Button>
                <Button
                  className="flex-1 border border-white/30 bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#000c12] text-white hover:text-cyan-300 disabled:opacity-60"
                  onClick={() => {
                    if (!canManageBlog) return;
                    toast({
                      title: copy.actions.draftSavedTitle,
                      description: copy.actions.draftSavedDescription,
                    });
                  }}
                  disabled={!canManageBlog}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {copy.actions.saveDraftButton}
                </Button>
                <Button
                  className="flex-1 border border-white/30 text-white hover:text-cyan-300"
                  onClick={() => {
                    if (!canManageBlog) return;
                    router.push('/admin/blog');
                  }}
                  disabled={!canManageBlog}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {copy.actions.reviewButton}
                </Button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 text-xs">
                <div className="rounded-2xl border border-white/10 bg-[#04131b] p-3 text-slate-200">
                  <p className="text-[11px] uppercase tracking-wide text-slate-300">
                    {copy.actions.topViewsCardTitle}
                  </p>
                  {topByViews[0] ? (
                    <>
                      <p className="text-sm font-semibold text-white truncate">
                        {(resolveLocalizedText(topByViews[0].title) ||
                          copy.table.untitledPost).slice(0, 45)}
                      </p>
                      <p className="text-[11px] text-purple-200">
                        {formatNumber(topByViews[0].views || 0)}{' '}
                        {copy.topLists.viewsSuffix}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 w-full border-white/30 text-white hover:text-cyan-300"
                        onClick={() =>
                          router.push(`/blog/${topByViews[0].id}`)
                        }
                      >
                        {copy.actions.topViewsButton}
                      </Button>
                    </>
                  ) : (
                    <p className="text-[11px] text-slate-300">
                      {copy.actions.topViewsEmpty}
                    </p>
                  )}
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#04131b] p-3 text-slate-200">
                  <p className="text-[11px] uppercase tracking-wide text-slate-300">
                    {copy.actions.topXpCardTitle}
                  </p>
                  {topByXP[0] ? (
                    <>
                      <p className="text-sm font-semibold text-white truncate">
                        {(resolveLocalizedText(topByXP[0].title) ||
                          copy.table.untitledPost).slice(0, 45)}
                      </p>
                      <p className="text-[11px] text-emerald-200">
                        {formatNumber(topByXP[0].xp_total_distributed || 0)}{' '}
                        {copy.topLists.xpSuffix}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 w-full border-white/30 text-white hover:text-cyan-300"
                        onClick={() => router.push(`/admin/blog/${topByXP[0].id}`)}
                      >
                        {copy.actions.topXpButton}
                      </Button>
                    </>
                  ) : (
                    <p className="text-[11px] text-slate-300">
                      {copy.actions.topXpEmpty}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* LISTA / ESTADO */}
          {loadingData ? (
            <Card className="bg-[#04131b] border border-white/10">
              <CardContent className="text-center py-12 text-slate-200">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
                <p className="mt-4 text-slate-300">{copy.list.loading}</p>
              </CardContent>
            </Card>
          ) : filteredPosts.length === 0 ? (
            <Card className="bg-[#04131b] border border-white/10">
              <CardContent className="text-center py-12 text-slate-200">
                <FileText className="h-16 w-16 text-slate-700 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-white">
                  {copy.list.emptyTitle}
                </h3>
                <p className="text-slate-300 mb-6">
                  {copy.list.emptySubtitle}
                </p>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={!canManageBlog}
                  onClick={() => {
                    if (!canManageBlog) return;
                    router.push('/admin/blog/create');
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {copy.list.emptyButton}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-[#04131b] border border-white/10 shadow-lg shadow-purple-950/40">
              <CardHeader>
                <CardTitle className="text-white">
                  {copy.table.listTitle.replace(
                    '{{count}}',
                    formatNumber(filteredPosts.length),
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-slate-200">
                <div className="space-y-4">
                  {filteredPosts.map((post) => {
                    const title =
                      resolveLocalizedText(post.title) ||
                      copy.table.untitledPost;
                    const excerpt =
                      resolveLocalizedText(post.excerpt) ||
                      copy.table.noExcerpt;
                    const views = post.views ?? 0;
                    const statusKey = (
                      post.status || (post.published ? 'published' : 'draft')
                    ) as 'published' | 'draft';
                    const statusLabel =
                      copy.table.statusLabels[statusKey] || statusKey;
                    const isPublished = statusKey === 'published';
                    const isCreator = user && post.author_id === user.id;
                    const xpTotal = post.xp_total_distributed || 0;
                    const xpCreator = post.xp_creator_distributed || 0;
                    return (
                      <div
                        key={post.id}
                        className="flex flex-col gap-4 rounded-xl border border-white/10 bg-[#04131b] p-4 transition-all md:flex-row md:items-center md:justify-between hover:border-cyan-300/70"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3">
                            {post.image_url && post.image_url.trim() !== '' && (
                              <div className="h-20 w-28 flex-shrink-0 overflow-hidden rounded-md border border-white/10 bg-slate-900">
                                <SafeImage
                                  src={post.image_url ?? ''}
                                  alt={title}
                                  className="w-full h-full object-cover"
                                  width={160}
                                  height={120}
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <Badge
                                className={
                                  isPublished
                                    ? 'bg-emerald-600'
                                    : 'bg-amber-600'
                                }
                              >
                                {statusLabel}
                              </Badge>
                                {post.category && (
                                  <Badge variant="outline">
                                    {post.category}
                                  </Badge>
                                )}
                                {isCreator && (
                                  <Badge variant="outline">
                                    {copy.table.badges.creator}
                                  </Badge>
                                )}
                                {xpTotal > 0 && (
                                  <div className="flex items-center gap-1">
                                    <Badge variant="outline" className="gap-1">
                                      {copy.table.badges.xpLabel}{' '}
                                      {formatNumber(xpTotal)}
                                    </Badge>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 border border-white/20 text-white hover:bg-white/10"
                                      onClick={() => handleOpenHistory(post)}
                                    >
                                      <History className="h-3.5 w-3.5" />
                                      <span className="sr-only">
                                        {copy.history.buttonLabel}
                                      </span>
                                    </Button>
                                  </div>
                                )}
                                {xpCreator > 0 && (
                                  <Badge variant="outline" className="gap-1">
                                    {copy.table.badges.xpCreatorLabel}{' '}
                                    {formatNumber(xpCreator)}
                                  </Badge>
                                )}
                                {post.registered_only && (
                                  <Badge variant="outline">
                                    {copy.table.badges.membersOnly}
                                  </Badge>
                                )}
                              </div>
                              <h3 className="text-lg font-semibold truncate text-white">
                                {title}
                              </h3>
                              <p className="text-sm text-slate-300 line-clamp-2 mb-2">
                                {excerpt}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-slate-300 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {post.author_name || post.author || 'Admin'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {post.created_at
                                    ? new Date(
                                        post.created_at,
                                      ).toLocaleDateString()
                                    : '-'}
                                </span>
                                {views > 0 && (
                                  <span>
                                    {formatNumber(views)}{' '}
                                    {copy.table.viewsSuffix}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-0 md:ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-white/30 text-white hover:text-cyan-300"
                            onClick={() => router.push(`/blog/${post.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {copy.table.viewButton}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-white/30 text-white hover:text-cyan-300 disabled:opacity-60 disabled:cursor-not-allowed"
                            disabled={!canManageBlog}
                            onClick={() => router.push(`/admin/blog/${post.id}`)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            {copy.table.editButton}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-white/30 text-rose-300 hover:text-rose-400 disabled:opacity-60 disabled:cursor-not-allowed"
                            disabled={!canManageBlog || !isSuperAdmin}
                            onClick={() => handleDelete(post.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
      </div>

      <Dialog
        open={xpHistoryOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseHistory();
          } else {
            setXpHistoryOpen(true);
          }
        }}
      >
        <DialogContent className="max-w-2xl border border-white/10 bg-[#020b16] text-white">
          <DialogHeader className="space-y-1">
            <DialogTitle>{copy.history.dialogTitle}</DialogTitle>
            <DialogDescription className="text-slate-300">
              {xpHistoryPost
                ? `${copy.history.dialogDescription} "${xpHistoryPost.title}".`
                : copy.history.dialogDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {xpHistoryLoading && xpHistoryEntries.length === 0 && (
              <div className="flex items-center justify-center py-8 text-sm text-slate-300">
                {copy.history.loading}
              </div>
            )}
            {xpHistoryError && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {xpHistoryError || copy.history.error}
              </div>
            )}
            {!xpHistoryLoading &&
              xpHistoryEntries.length === 0 &&
              !xpHistoryError && (
                <div className="rounded-xl border border-white/10 bg-[#04131b]/70 px-4 py-6 text-center text-sm text-slate-300">
                  {copy.history.empty}
                </div>
              )}
            {xpHistoryEntries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-2xl border border-white/10 bg-[#021824]/80 px-4 py-3 shadow-[0_10px_30px_rgba(3,10,25,0.45)]"
              >
                <div className="flex items-center justify-between text-sm">
                  <p className="font-semibold text-white">{entry.user.name}</p>
                  <p className="text-xs text-slate-400">
                    {formatDateTime(entry.completedAt)}
                  </p>
                </div>
                <p className="mt-2 text-sm font-semibold text-[#fdd87c]">
                  +{formatNumber(entry.xp)} XP
                </p>
              </div>
            ))}
          </div>
          {(xpHistoryHasMore || xpHistoryEntries.length > 0) && (
            <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
              <span>
                {formatNumber(xpHistoryEntries.length)} {copy.history.entriesLabel}
              </span>
              {xpHistoryHasMore && (
                <Button
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                  onClick={handleLoadMoreHistory}
                  disabled={xpHistoryLoading}
                >
                  {xpHistoryLoading ? copy.history.loading : copy.history.loadMore}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
