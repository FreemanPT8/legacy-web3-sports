'use client';

import Image from 'next/image';
import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBuilderState } from '@/hooks/useBuilderState';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { Library, ImagePlus, Sparkles } from 'lucide-react';
import type {
  LangCode,
  BlogBuilderState,
  BuilderState,
} from '@/types/builder';
import { LANGUAGES } from '@/types/builder';
import { MediaLibraryDialog } from '@/components/media/MediaLibraryDialog';
import { useAutoTranslate } from '@/hooks/useAutoTranslate';
import { useToast } from '@/hooks/use-toast';

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

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');

export function BlogBasicsStep() {
  const { state, patchState, setCoverImage } = useBuilderState();
  const blogState = state as BlogBuilderState;
  const [language, setLanguage] = useState<LangCode>('en');
  const [slugTouched, setSlugTouched] = useState(false);
  const mediaLibrary = useMediaLibrary();
  const { translate, isTranslating } = useAutoTranslate();
  const { toast } = useToast();

  const applyPatch = (patch: Partial<BlogBuilderState>) =>
    patchState(patch as Partial<BuilderState>);

  const currentLangLabel =
    LANGUAGES.find((lang) => lang.code === language)?.name || language;

  const titleValue = blogState.title[language] ?? '';
  const excerptValue = blogState.longDescription[language] ?? '';

  const suggestedSlug = useMemo(() => slugify(titleValue), [titleValue]);
  const remainingLanguages = LANGUAGES.map((lang) => lang.code).filter(
    (code) => code !== language,
  );

  const handleTranslateField = async (
    field: 'title' | 'longDescription',
    value: string,
  ) => {
    if (!value.trim()) {
      toast({
        title: 'Sem conteúdo',
        description: 'Escreve algo primeiro antes de traduzir.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const translations = await translate(
        value,
        language,
        remainingLanguages,
      );

      applyPatch({
        [field]: {
          ...blogState[field],
          ...translations,
        } as BlogBuilderState[typeof field],
      });

      toast({
        title: 'Traduções aplicadas',
        description: 'Atualizámos as restantes línguas automaticamente.',
      });
    } catch (error) {
      console.error('Blog translation error:', error);
      toast({
        title: 'Erro na tradução',
        description:
          error instanceof Error
            ? error.message
            : 'Não foi possível traduzir este conteúdo.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((lang) => (
              <Badge
                key={lang.code}
                variant={language === lang.code ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setLanguage(lang.code as LangCode)}
              >
                {lang.name}
              </Badge>
            ))}
          </div>

          <div>
            <Label>Title ({currentLangLabel})</Label>
            <Input
              value={titleValue}
              onChange={(event) => {
                const value = event.target.value;
                applyPatch({
                  title: {
                    ...blogState.title,
                    [language]: value,
                  },
                });
                if (!slugTouched && value.trim().length > 0) {
                  applyPatch({ slug: slugify(value) });
                }
              }}
              placeholder="Write an irresistible title"
              className="text-lg font-semibold"
            />
            <p className="mt-1 text-xs text-gray-500">
              {titleValue.length} characters
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              disabled={isTranslating || remainingLanguages.length === 0}
              onClick={() => handleTranslateField('title', titleValue)}
            >
              <Sparkles className="mr-2 h-4 w-4 text-cyan-400" />
              Traduzir título
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Slug</Label>
              <Input
                value={blogState.slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  applyPatch({ slug: slugify(event.target.value) });
                }}
                placeholder={suggestedSlug || 'legacy-blog-post'}
              />
              {!slugTouched && suggestedSlug && (
                <p className="mt-1 text-xs text-gray-500">
                  Suggested: {suggestedSlug}
                </p>
              )}
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={blogState.category}
                onValueChange={(value) => applyPatch({ category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Excerpt ({currentLangLabel})</Label>
            <RichTextEditor
              value={excerptValue}
              onChange={(next) =>
                applyPatch({
                  longDescription: {
                    ...blogState.longDescription,
                    [language]: next,
                  },
                })
              }
              placeholder="Short summary used on cards and SEO."
              minRows={4}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isTranslating || remainingLanguages.length === 0}
            onClick={() => handleTranslateField('longDescription', excerptValue)}
          >
            <Sparkles className="mr-2 h-4 w-4 text-cyan-400" />
            Traduzir excerto
          </Button>

          <CoverImageSection
            imageUrl={blogState.coverImage?.url || ''}
            onRemove={() => applyPatch({ coverImage: null })}
            mediaLibrary={mediaLibrary}
            onPick={(asset) => {
              setCoverImage(asset);
              mediaLibrary.closeLibrary();
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Publishing & XP</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Estimated reading time (minutes)</Label>
              <Input
                type="number"
                min={1}
                value={blogState.readingTimeMinutes}
                onChange={(event) =>
                  applyPatch({
                    readingTimeMinutes: Math.max(
                      1,
                      Number(event.target.value) || 1,
                    ),
                  })
                }
              />
            </div>
            <div>
              <Label>XP reward</Label>
              <Input
                type="number"
                min={0}
                value={blogState.xp.reward}
                onChange={(event) =>
                  applyPatch({
                    xp: {
                      ...blogState.xp,
                      reward: Number(event.target.value) || 0,
                    },
                  })
                }
              />
            </div>
            <div>
              <Label>XP required to unlock</Label>
              <Input
                type="number"
                min={0}
                value={blogState.xp.threshold}
                onChange={(event) =>
                  applyPatch({
                    xp: {
                      ...blogState.xp,
                      threshold: Number(event.target.value) || 0,
                    },
                  })
                }
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ToggleRow
              label="Published"
              description="Visible to everyone once enabled."
              checked={blogState.published}
              onCheckedChange={(checked) => applyPatch({ published: checked })}
            />
            <ToggleRow
              label="Registered users only"
              description="Restrict post to logged-in members."
              checked={blogState.registeredOnly}
              onCheckedChange={(checked) =>
                applyPatch({ registeredOnly: checked })
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CoverImageSection({
  imageUrl,
  onRemove,
  onPick,
  mediaLibrary,
}: {
  imageUrl: string;
  onRemove: () => void;
  onPick: (asset: any) => void;
  mediaLibrary: ReturnType<typeof useMediaLibrary>;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const asset = await mediaLibrary.uploadAsset({
      file,
      title: file.name,
    });
    if (asset) {
      onPick(asset);
    }
    event.target.value = '';
  };

  return (
    <div className="space-y-3">
      <Label>Cover image</Label>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => mediaLibrary.openLibrary('library')}
        >
          <Library className="mr-2 h-4 w-4" />
          Choose from media library
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={mediaLibrary.uploading}
        >
          <ImagePlus className="mr-2 h-4 w-4" />
          {mediaLibrary.uploading ? 'Uploading...' : 'Upload image'}
        </Button>
        {imageUrl && (
          <Button type="button" variant="ghost" onClick={onRemove}>
            Remove image
          </Button>
        )}
      </div>
      {imageUrl ? (
        <div className="relative mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-slate-900/40 aspect-[16/9]">
          <Image
            src={imageUrl}
            alt="Blog cover"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 480px"
            unoptimized
          />
        </div>
      ) : (
        <p className="text-xs text-gray-500">
          Recommended 1600x900 image. Supports JPG, PNG, WEBP.
        </p>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <MediaLibraryDialog
        open={mediaLibrary.isOpen}
        onOpenChange={(open) =>
          open
            ? mediaLibrary.openLibrary(mediaLibrary.activeTab)
            : mediaLibrary.closeLibrary()
        }
        title="Select cover image"
        description="Pick an existing image, upload a new one, or paste an external URL."
        library={mediaLibrary}
        onSelect={(asset) => {
          onPick(asset);
          mediaLibrary.closeLibrary();
        }}
      />
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
