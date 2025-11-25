'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import {
  BlockEditor,
  type BlocksByLanguage,
  type LangCode,
  serializeBlocksByLanguage,
} from '@/components/admin/content/BlockEditor';

type PermissionsResponse = {
  success: boolean;
  error?: string;
  permissions?: {
    canManageBlog?: boolean;
    [key: string]: any;
  };
};

type MultiLang = Record<string, string>;

type BlogPost = {
  id: string;
  title: MultiLang;
  excerpt: MultiLang;
  content: MultiLang;
  category?: string | null;
  reading_time?: number | null;
  xp_reward?: number | null;
  xp_threshold?: number | null;
  published?: boolean | null;
  registered_only?: boolean | null;
  author_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

const LANGUAGES: { code: LangCode; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'pt', name: 'Português' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'it', name: 'Italiano' },
  { code: 'de', name: 'Deutsch' },
];

const CATEGORIES = [
  'Blockchain',
  'Web3',
  'NFTs',
  'DeFi',
  'Sports',
  'Education',
  'Technology',
  'Community',
];

function generateBlockId(prefix: string = 'blk') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export default function EditBlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading, getToken } = useAuth();
  const { toast } = useToast();

  const postId = params.postId as string;

  const [loadingPost, setLoadingPost] = useState(true);
  const [saving, setSaving] = useState(false);

  const [post, setPost] = useState<BlogPost | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<LangCode>('en');
  const [blocksByLanguage, setBlocksByLanguage] =
    useState<BlocksByLanguage>({});

  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [canManageBlog, setCanManageBlog] = useState(false);

  // Proteção básica
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

  // Verificar permissões finas (canManageBlog)
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
        const res = await fetch('/api/admin/permissions', {
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

  // Carregar post
  useEffect(() => {
    const fetchPost = async () => {
      if (!user) return;
      setLoadingPost(true);
      try {
        const token = getToken();
        const res = await fetch(`/api/admin/blog/${postId}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const data = await res.json();

        if (!res.ok || !data.success || !data.post) {
          toast({
            title: 'Error loading post',
            description: data.error || 'Failed to load blog post.',
            variant: 'destructive',
          });
          setPost(null);
          setLoadingPost(false);
          return;
        }

        const p: BlogPost = data.post;

        // Garantir objetos multi-língua mínimos
        const safeTitle: MultiLang = {
          en: '',
          pt: '',
          es: '',
          fr: '',
          it: '',
          de: '',
          ...(p.title || {}),
        };

        const safeExcerpt: MultiLang = {
          en: '',
          pt: '',
          es: '',
          fr: '',
          it: '',
          de: '',
          ...(p.excerpt || {}),
        };

        const safeContent: MultiLang = {
          en: '',
          pt: '',
          es: '',
          fr: '',
          it: '',
          de: '',
          ...(p.content || {}),
        };

        setPost({
          ...p,
          title: safeTitle,
          excerpt: safeExcerpt,
          content: safeContent,
        });

        // Inicializar blocos a partir do HTML existente (um bloco HTML por língua)
        const initialBlocks: BlocksByLanguage = {};
        LANGUAGES.forEach(({ code }) => {
          const html = safeContent[code] || '';
          if (html && html.trim()) {
            initialBlocks[code] = [
              {
                id: generateBlockId('html'),
                type: 'html',
                data: { html },
              },
            ];
          } else {
            initialBlocks[code] = [];
          }
        });
        setBlocksByLanguage(initialBlocks);
      } catch (err) {
        console.error('Error loading blog post for editing:', err);
        toast({
          title: 'Network error',
          description: 'Could not load blog post. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoadingPost(false);
      }
    };

    if (user && canManageBlog) {
      fetchPost();
    }
  }, [user, canManageBlog, getToken, postId, toast]);

  const handleSave = async () => {
    if (!user || !canManageBlog || !post) {
      toast({
        title: 'Not al
