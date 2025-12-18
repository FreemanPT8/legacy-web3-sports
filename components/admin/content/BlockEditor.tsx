'use client';

import { useCallback, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import {
  Heading as HeadingIcon,
  Type as ParagraphIcon,
  List as ListIcon,
  Quote as QuoteIcon,
  Image as ImageIcon,
  Video as VideoIcon,
  Link as LinkIcon,
  Minus,
  Code2,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
} from 'lucide-react';

import { LANGUAGES, type LangCode } from '@/types/builder';

export type BlockType =
  | 'heading'
  | 'subheading'
  | 'paragraph'
  | 'list'
  | 'quote'
  | 'image'
  | 'video'
  | 'button'
  | 'divider'
  | 'html';

export type BlockData = {
  text?: string;
  items?: string[];
  url?: string;
  alt?: string;
  buttonLabel?: string;
  html?: string;
};

export interface Block {
  id: string;
  type: BlockType;
  data: BlockData;
}

export type BlocksByLanguage = Partial<Record<LangCode, Block[]>>;

export interface BlockEditorProps {
  value: BlocksByLanguage;
  onChange: (value: BlocksByLanguage) => void;
  initialLanguage?: LangCode;
  className?: string;
}

/**
 * Gera um ID estável para blocos. Usa crypto.randomUUID quando possível.
 */
function createId(prefix: string = 'blk') {
  if (
    typeof crypto !== 'undefined' &&
    typeof (crypto as { randomUUID?: () => string }).randomUUID === 'function'
  ) {
    return (crypto as { randomUUID: () => string }).randomUUID();
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Serializa uma lista de blocos para HTML simples, clean e sem dependências externas.
 * Mantemos isto aqui para ser usado tanto em Lições como em Blog.
 */
export function serializeBlocksToHtml(blocks: Block[]): string {
  const parts: string[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case 'heading': {
        const text = (block.data.text || '').toString().trim();
        if (text) parts.push(`<h2>${text}</h2>`);
        break;
      }
      case 'subheading': {
        const text = (block.data.text || '').toString().trim();
        if (text) parts.push(`<h3>${text}</h3>`);
        break;
      }
      case 'paragraph': {
        const text = (block.data.text || '').toString().trim();
        if (text) parts.push(`<p>${text}</p>`);
        break;
      }
      case 'list': {
        const rawItems = block.data.items;
        const items = Array.isArray(rawItems)
          ? rawItems.map((i) => String(i || '').trim())
          : [];
        const cleaned = items.filter((i) => i.length > 0);
        if (cleaned.length > 0) {
          parts.push(
            `<ul>${cleaned.map((item) => `<li>${item}</li>`).join('')}</ul>`,
          );
        }
        break;
      }
      case 'quote': {
        const text = (block.data.text || '').toString().trim();
        const author = (block.data.alt || '').toString().trim(); // usamos alt como "author" aqui
        if (text) {
          parts.push(
            `<blockquote><p>${text}</p>${
              author ? `<footer>${author}</footer>` : ''
            }</blockquote>`,
          );
        }
        break;
      }
      case 'image': {
        const url = (block.data.url || '').toString().trim();
        const alt = (block.data.alt || '').toString().trim();
        if (url) {
          parts.push(
            `<figure><img src="${url}" alt="${alt}"/>${
              alt ? `<figcaption>${alt}</figcaption>` : ''
            }</figure>`,
          );
        }
        break;
      }
      case 'video': {
        const url = (block.data.url || '').toString().trim();
        if (url) {
          parts.push(
            `<div class="video-container"><iframe src="${url}" frameborder="0" allowfullscreen></iframe></div>`,
          );
        }
        break;
      }
      case 'button': {
        const label = (block.data.buttonLabel || '').toString().trim();
        const url = (block.data.url || '').toString().trim();
        if (label && url) {
          parts.push(
            `<p><a href="${url}" class="btn btn-primary">${label}</a></p>`,
          );
        }
        break;
      }
      case 'divider': {
        parts.push('<hr />');
        break;
      }
      case 'html': {
        const html = (block.data.html || '').toString();
        if (html.trim()) parts.push(html);
        break;
      }
      default:
        break;
    }
  }

  return parts.join('\n\n');
}

/**
 * Serializa blocos por língua → HTML por língua.
 */
export function serializeBlocksByLanguage(
  blocksByLang: BlocksByLanguage,
): Record<string, string> {
  const result: Record<string, string> = {};
  (LANGUAGES as readonly { code: LangCode; name: string }[]).forEach(
    ({ code }) => {
      const blocks = blocksByLang[code] || [];
      result[code] = serializeBlocksToHtml(blocks);
    },
  );
  return result;
}

/**
 * BlockEditor – editor visual multi-língua baseado em blocos.
 * Não faz fetch nem lida com Supabase; é puramente UI + estado de blocos.
 */
export function BlockEditor({
  value,
  onChange,
  initialLanguage = 'en',
  className,
}: BlockEditorProps) {
  const [currentLanguage, setCurrentLanguage] =
    useState<LangCode>(initialLanguage);

  const currentLangLabel =
    LANGUAGES.find((l) => l.code === currentLanguage)?.name ||
    currentLanguage;

  const blocksForCurrentLang: Block[] = useMemo(
    () => value[currentLanguage] || [],
    [value, currentLanguage],
  );

  const setBlocksForCurrentLang = useCallback(
    (blocks: Block[]) => {
      onChange({
        ...(value || {}),
        [currentLanguage]: blocks,
      });
    },
    [currentLanguage, onChange, value],
  );

  const addBlock = useCallback(
    (type: BlockType) => {
      const newBlock: Block = {
        id: createId(type),
        type,
        data: {},
      };

      switch (type) {
        case 'heading':
          newBlock.data.text = 'Section title';
          break;
        case 'subheading':
          newBlock.data.text = 'Subheading text';
          break;
        case 'paragraph':
          newBlock.data.text = 'Write your text here...';
          break;
        case 'list':
          newBlock.data.items = [''];
          break;
        case 'quote':
          newBlock.data.text = 'Important quote or key concept';
          newBlock.data.alt = ''; // usamos alt como "author"
          break;
        case 'image':
          newBlock.data.url = '';
          newBlock.data.alt = '';
          break;
        case 'video':
          newBlock.data.url = '';
          break;
        case 'button':
          newBlock.data.buttonLabel = 'Click here';
          newBlock.data.url = '';
          break;
        case 'divider':
        case 'html':
        default:
          break;
      }

      setBlocksForCurrentLang([...blocksForCurrentLang, newBlock]);
    },
    [blocksForCurrentLang, setBlocksForCurrentLang],
  );

  const updateBlock = useCallback(
    (id: string, data: Partial<BlockData>) => {
      setBlocksForCurrentLang(
        blocksForCurrentLang.map((b) =>
          b.id === id ? { ...b, data: { ...b.data, ...data } } : b,
        ),
      );
    },
    [blocksForCurrentLang, setBlocksForCurrentLang],
  );

  const moveBlock = useCallback(
    (id: string, direction: 'up' | 'down') => {
      const index = blocksForCurrentLang.findIndex((b) => b.id === id);
      if (index === -1) return;

      const newBlocks = [...blocksForCurrentLang];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newBlocks.length) return;

      const [removed] = newBlocks.splice(index, 1);
      newBlocks.splice(targetIndex, 0, removed);

      setBlocksForCurrentLang(newBlocks);
    },
    [blocksForCurrentLang, setBlocksForCurrentLang],
  );

  const deleteBlock = useCallback(
    (id: string) => {
      setBlocksForCurrentLang(
        blocksForCurrentLang.filter((b) => b.id !== id),
      );
    },
    [blocksForCurrentLang, setBlocksForCurrentLang],
  );

  const renderBlockFields = (block: Block) => {
    const { type, data } = block;

    switch (type) {
      case 'heading':
      case 'subheading':
      case 'paragraph':
        return (
          <div className="space-y-2">
            <Label className="text-xs">
              {type === 'heading'
                ? 'Heading text'
                : type === 'subheading'
                ? 'Subheading text'
                : 'Paragraph text'}
            </Label>
            <Textarea
              rows={type === 'paragraph' ? 4 : 2}
              className="text-sm"
              value={data.text || ''}
              onChange={(e) =>
                updateBlock(block.id, { text: e.target.value })
              }
              placeholder={
                type === 'paragraph'
                  ? 'Write your paragraph here... (basic HTML allowed)'
                  : undefined
              }
            />
            {type === 'paragraph' && (
              <p className="text-[11px] text-gray-500">
                You can use basic HTML tags like{' '}
                {'<strong>, <em>, <u>, <a href=\"...\">'}.
              </p>
            )}
          </div>
        );

      case 'list':
        return (
          <div className="space-y-2">
            <Label className="text-xs">List items</Label>
            {(Array.isArray(data.items) ? data.items : ['']).map(
              (item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 mt-1"
                >
                  <Input
                    className="flex-1 text-sm"
                    value={item}
                    onChange={(e) => {
                      const items = Array.isArray(data.items)
                        ? [...data.items]
                        : [''];
                      items[idx] = e.target.value;
                      updateBlock(block.id, { items });
                    }}
                    placeholder={`Item ${idx + 1}`}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => {
                      const items = Array.isArray(data.items)
                        ? [...data.items]
                        : [''];
                      items.splice(idx, 1);
                      updateBlock(block.id, {
                        items: items.length ? items : [''],
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ),
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-1"
              onClick={() => {
                const items = Array.isArray(data.items)
                  ? [...data.items]
                  : [''];
                items.push('');
                updateBlock(block.id, { items });
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add item
            </Button>
          </div>
        );

      case 'quote':
        return (
          <div className="space-y-2">
            <div>
              <Label className="text-xs">Quote text</Label>
              <Textarea
                rows={3}
                className="text-sm"
                value={data.text || ''}
                onChange={(e) =>
                  updateBlock(block.id, { text: e.target.value })
                }
                placeholder="Important quote, definition or key idea..."
              />
            </div>
            <div>
              <Label className="text-xs">Author (optional)</Label>
              <Input
                className="text-sm"
                value={data.alt || ''}
                onChange={(e) =>
                  updateBlock(block.id, { alt: e.target.value })
                }
                placeholder="Name of the person or source"
              />
            </div>
          </div>
        );

      case 'image':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Image URL</Label>
              <Input
                className="text-sm"
                value={data.url || ''}
                onChange={(e) =>
                  updateBlock(block.id, { url: e.target.value })
                }
                placeholder="https://..."
              />
            </div>
            <div>
              <Label className="text-xs">Alt text / caption</Label>
              <Input
                className="text-sm"
                value={data.alt || ''}
                onChange={(e) =>
                  updateBlock(block.id, { alt: e.target.value })
                }
                placeholder="Short description for the image"
              />
            </div>
          </div>
        );

      case 'video':
        return (
          <div className="space-y-2">
            <Label className="text-xs">
              Video URL (YouTube, Vimeo, Loom, etc.)
            </Label>
            <Input
              className="text-sm"
              value={data.url || ''}
              onChange={(e) =>
                updateBlock(block.id, { url: e.target.value })
              }
              placeholder="https://youtube.com/..."
            />
            <p className="text-[11px] text-gray-500">
              We will save the link. On the public page you can render an
              embedded player for this URL.
            </p>
          </div>
        );

      case 'button':
        return (
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Button label</Label>
              <Input
                className="text-sm"
                value={data.buttonLabel || ''}
                onChange={(e) =>
                  updateBlock(block.id, {
                    buttonLabel: e.target.value,
                  })
                }
                placeholder="e.g. Start exercise"
              />
            </div>
            <div>
              <Label className="text-xs">Button URL</Label>
              <Input
                className="text-sm"
                value={data.url || ''}
                onChange={(e) =>
                  updateBlock(block.id, { url: e.target.value })
                }
                placeholder="https://..."
              />
            </div>
          </div>
        );

      case 'divider':
        return (
          <div className="py-2">
            <p className="text-[11px] text-gray-500">
              Horizontal divider used to separate sections visually.
            </p>
          </div>
        );

      case 'html':
        return (
          <div className="space-y-2">
            <Label className="text-xs">Raw HTML block</Label>
            <Textarea
              rows={8}
              className="font-mono text-xs"
              value={data.html || ''}
              onChange={(e) =>
                updateBlock(block.id, { html: e.target.value })
              }
              placeholder="<p>Custom HTML here...</p>"
            />
            <p className="text-[11px] text-gray-500">
              Use with care. This HTML will be injected directly in the
              public page content.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={className}>
      {/* Tabs de línguas */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Language for content blocks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((lang) => (
              <Badge
                key={lang.code}
                variant={
                  currentLanguage === lang.code ? 'default' : 'outline'
                }
                className="cursor-pointer"
                onClick={() => setCurrentLanguage(lang.code as LangCode)}
              >
                {lang.name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Toolbar de blocos */}
      <Card className="border-dashed border-2 mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Content blocks ({currentLangLabel})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => addBlock('heading')}
            >
              <HeadingIcon className="h-3 w-3 mr-1" />
              Heading
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => addBlock('subheading')}
            >
              <ParagraphIcon className="h-3 w-3 mr-1" />
              Subheading
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => addBlock('paragraph')}
            >
              <ParagraphIcon className="h-3 w-3 mr-1" />
              Paragraph
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => addBlock('list')}
            >
              <ListIcon className="h-3 w-3 mr-1" />
              List
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => addBlock('quote')}
            >
              <QuoteIcon className="h-3 w-3 mr-1" />
              Quote
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => addBlock('image')}
            >
              <ImageIcon className="h-3 w-3 mr-1" />
              Image
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => addBlock('video')}
            >
              <VideoIcon className="h-3 w-3 mr-1" />
              Video
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => addBlock('button')}
            >
              <LinkIcon className="h-3 w-3 mr-1" />
              Button
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => addBlock('divider')}
            >
              <Minus className="h-3 w-3 mr-1" />
              Divider
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => addBlock('html')}
            >
              <Code2 className="h-3 w-3 mr-1" />
              HTML
            </Button>
          </div>

          {blocksForCurrentLang.length === 0 && (
            <p className="text-xs text-gray-500 mt-2">
              No blocks yet. Click a block type above to start building your
              content for {currentLangLabel}.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Lista de blocos */}
      <div className="space-y-3">
        {blocksForCurrentLang.map((block, index) => (
          <Card key={block.id} className="border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3 px-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                {block.type === 'heading' && (
                  <>
                    <HeadingIcon className="h-4 w-4" />
                    <span>Heading</span>
                  </>
                )}
                {block.type === 'subheading' && (
                  <>
                    <ParagraphIcon className="h-4 w-4" />
                    <span>Subheading</span>
                  </>
                )}
                {block.type === 'paragraph' && (
                  <>
                    <ParagraphIcon className="h-4 w-4" />
                    <span>Paragraph</span>
                  </>
                )}
                {block.type === 'list' && (
                  <>
                    <ListIcon className="h-4 w-4" />
                    <span>List</span>
                  </>
                )}
                {block.type === 'quote' && (
                  <>
                    <QuoteIcon className="h-4 w-4" />
                    <span>Quote</span>
                  </>
                )}
                {block.type === 'image' && (
                  <>
                    <ImageIcon className="h-4 w-4" />
                    <span>Image</span>
                  </>
                )}
                {block.type === 'video' && (
                  <>
                    <VideoIcon className="h-4 w-4" />
                    <span>Video</span>
                  </>
                )}
                {block.type === 'button' && (
                  <>
                    <LinkIcon className="h-4 w-4" />
                    <span>Button</span>
                  </>
                )}
                {block.type === 'divider' && (
                  <>
                    <Minus className="h-4 w-4" />
                    <span>Divider</span>
                  </>
                )}
                {block.type === 'html' && (
                  <>
                    <Code2 className="h-4 w-4" />
                    <span>HTML</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => moveBlock(block.id, 'up')}
                  disabled={index === 0}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => moveBlock(block.id, 'down')}
                  disabled={index === blocksForCurrentLang.length - 1}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteBlock(block.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {renderBlockFields(block)}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
