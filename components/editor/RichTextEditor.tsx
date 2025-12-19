'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Image from '@tiptap/extension-image';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MediaLibraryDialog } from '@/components/media/MediaLibraryDialog';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { READ_MORE_MARKER } from '@/lib/read-more';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignJustify,
  Asterisk,
  Bold,
  Clipboard,
  Eraser,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  ImagePlus,
  Italic,
  Link2,
  MousePointerClick,
  Minus,
  MoveHorizontal,
  MoreHorizontal,
  Palette,
  Quote,
  Redo,
  Slash,
  Strikethrough,
  TextCursor,
  Underline as UnderlineIcon,
  Undo,
  Unlink,
} from 'lucide-react';
import type { MediaAsset } from '@/types/builder';
const SPECIAL_CHARACTERS = ['*', '-', '--', '"', "'", '?', '!', '(c)', '(r)'];
type Level = 1 | 2 | 3 | 4;
const HEADING_LEVELS: Level[] = [1, 2, 3, 4];

interface RichTextEditorProps {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  minRows?: number;
  className?: string;
}
const COLOR_SWATCHES = ['#2563EB', '#10B981', '#F97316', '#EF4444', '#A855F7', '#FACC15', '#0EA5E9'];
type ImageAlignment = 'left' | 'center' | 'right';
type ImageSize = 'sm' | 'md' | 'lg' | 'xl';

const alignmentClassMap: Record<ImageAlignment, string> = {
  left: 'float-left mr-4 my-2',
  center: 'mx-auto my-4 block',
  right: 'float-right ml-4 my-2',
};

const sizeClassMap: Record<ImageSize, string> = {
  sm: 'max-w-[220px]',
  md: 'max-w-[360px]',
  lg: 'max-w-[520px]',
  xl: 'max-w-full',
};

const LegacyImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      alignment: {
        default: 'center',
        parseHTML: (element) =>
          (element.getAttribute('data-alignment') as ImageAlignment) || 'center',
        renderHTML: (attributes) => {
          const alignment =
            (attributes.alignment as ImageAlignment) ?? 'center';
          const size = (attributes.size as ImageSize) ?? 'lg';
          const base = 'legacy-editor-image rounded-2xl border border-slate-200';
          const className = [base, alignmentClassMap[alignment], sizeClassMap[size]]
            .filter(Boolean)
            .join(' ');

          return [
            'img',
            {
              ...attributes,
              class: className,
              'data-alignment': alignment,
              'data-size': size,
            },
          ];
        },
      },
      size: {
        default: 'lg',
        parseHTML: (element) =>
          (element.getAttribute('data-size') as ImageSize) || 'lg',
      },
    };
  },
});

export function RichTextEditor({
  id,
  value,
  onChange,
  placeholder,
  minRows = 8,
  className,
}: RichTextEditorProps) {
  const [forcePlainText, setForcePlainText] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [specialCharsVisible, setSpecialCharsVisible] = useState(false);
  const [defaultImageAlignment, setDefaultImageAlignment] =
    useState<ImageAlignment>('center');
  const [defaultImageSize, setDefaultImageSize] = useState<ImageSize>('lg');
  const [imageSizePopoverOpen, setImageSizePopoverOpen] = useState(false);
  const [ctaPopoverOpen, setCtaPopoverOpen] = useState(false);
  const [ctaConfig, setCtaConfig] = useState({
    text: 'Quero fazer onboarding',
    href: '/sports/onboarding',
    textColor: '#001014',
    bg: '#06b6d4',
    hover: '#0ea5e9',
  });
  const mediaLibrary = useMediaLibrary();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: HEADING_LEVELS },
        bulletList: false,
        orderedList: false,
        listItem: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        underline: false,
      }),
      BulletList.configure({
        keepMarks: true,
        keepAttributes: false,
      }),
      OrderedList.configure({
        keepMarks: true,
        keepAttributes: false,
      }),
      ListItem.configure({
        HTMLAttributes: {
          class: 'legacy-list-item',
        },
      }),
      Underline,
      Strike,
      TextStyle,
      Color.configure({ types: ['textStyle'] }),
      TextAlign.configure({
        types: ['paragraph', 'heading', 'listItem', 'bulletList', 'orderedList'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'legacy-link',
          rel: 'noreferrer noopener',
          target: '_blank',
        },
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Start writing...',
      }),
      CharacterCount.configure(),
      LegacyImage,
      HorizontalRule.configure({ HTMLAttributes: { class: 'legacy-hr' } }),
    ],
    content: value || '',
    editorProps: {
      handlePaste(view, event) {
        if (!forcePlainText) return false;
        const text = event.clipboardData?.getData('text/plain');
        if (!text) return false;
        event.preventDefault();
        view.dispatch(view.state.tr.insertText(text, view.state.selection.from, view.state.selection.to));
        return true;
      },
    },
    onUpdate({ editor: next }) {
      onChange(next.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current !== (value || '')) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  const applyHeading = useCallback(
    (level: Level | 'paragraph') => {
      if (!editor) return;
      if (level === 'paragraph') {
        editor.chain().focus().setParagraph().run();
        return;
      }
      if (editor.isActive('heading', { level })) {
        editor.chain().focus().setParagraph().run();
        return;
      }

      const applied = editor.chain().focus().setHeading({ level }).run();
      if (applied) return;

      editor
        .chain()
        .focus()
        .insertContent({
          type: 'heading',
          attrs: { level },
          content: [
            {
              type: 'text',
              text: editor.isEmpty ? 'Heading' : '',
            },
          ],
        } as any)
        .run();
    },
    [editor],
  );

  const toggleAlign = useCallback(
    (direction: 'left' | 'center' | 'right' | 'justify') => {
      editor?.chain().focus().setTextAlign(direction).run();
    },
    [editor],
  );

  const toggleList = useCallback(
    (variant: 'bullet' | 'ordered') => {
      if (!editor) return;

      const toggled =
        variant === 'bullet'
          ? editor.chain().focus().toggleBulletList().run()
          : editor.chain().focus().toggleOrderedList().run();

      if (toggled) return;

      const listNode = {
        type: variant === 'bullet' ? 'bulletList' : 'orderedList',
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: 'List item',
                  },
                ],
              },
            ],
          },
        ],
      };

      editor.chain().focus().insertContent(listNode as any).run();
    },
    [editor],
  );

  const insertLink = useCallback(() => {
    if (!editor) return;
    const current = editor.getAttributes('link').href || '';
    const url = window.prompt('Enter the URL', current || 'https://');
    if (url === null) return;
    if (!url.trim()) {
      editor.commands.unsetLink();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  }, [editor]);

  const openMedia = useCallback(
    (asset: MediaAsset) => {
      if (!editor) return;
      const normalizedType = asset.type?.toLowerCase();
      const urlToUse = asset.url || asset.thumbnailUrl || '';
      const baseUrl = urlToUse.split('?')[0] || '';
      const looksLikeImage = /\.(png|jpg|jpeg|gif|webp|svg|avif|bmp)$/i.test(baseUrl);
      const nonImageTypes = ['video', 'audio', 'document', 'other'];

      const isImageAsset =
        normalizedType === 'image' ||
        (looksLikeImage && !nonImageTypes.includes(normalizedType || '')) ||
        (!normalizedType && looksLikeImage);

      if (isImageAsset && urlToUse) {
        const imagePayload: Record<string, unknown> = {
          src: urlToUse,
          alt: asset.alt || asset.title || '',
          alignment: defaultImageAlignment,
          size: defaultImageSize,
        };
        editor.chain().focus().setImage(imagePayload as any).run();
        return;
      }

      const linkTarget = asset.url || urlToUse;
      editor
        .chain()
        .focus()
        .insertContent(`<p><a href="${linkTarget}">${asset.title || linkTarget}</a></p>`)
        .run();
    },
    [editor, defaultImageAlignment, defaultImageSize],
  );

  const insertReadMore = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertContent(READ_MORE_MARKER).run();
  }, [editor]);

  const setImageAlignment = useCallback(
    (next: ImageAlignment) => {
      setDefaultImageAlignment(next);
      if (!editor?.isActive('image')) return;
      editor.chain().focus().updateAttributes('image', { alignment: next }).run();
    },
    [editor],
  );

  const setImageSize = useCallback(
    (next: ImageSize) => {
      setDefaultImageSize(next);
      if (!editor?.isActive('image')) return;
      editor.chain().focus().updateAttributes('image', { size: next }).run();
    },
    [editor],
  );

  const insertCTAButton = useCallback(() => {
    if (!editor) return;
    const safeText = ctaConfig.text.trim() || 'Quero fazer onboarding';
    const safeHref = ctaConfig.href.trim() || '/sports/onboarding';
    const finalHtml = `<p><a class="legacy-cta-button" href="${safeHref}" target="_blank" rel="noopener" style="--legacy-cta-bg:${ctaConfig.bg};--legacy-cta-hover:${ctaConfig.hover};--legacy-cta-text:${ctaConfig.textColor};">${safeText}</a></p>`;
    editor.chain().focus().insertContent(finalHtml).run();
    setCtaPopoverOpen(false);
  }, [editor, ctaConfig]);

  const setImageSize = useCallback(
    (next: ImageSize) => {
      setDefaultImageSize(next);
      if (!editor?.isActive('image')) return;
      editor.chain().focus().updateAttributes('image', { size: next }).run();
    },
    [editor],
  );

  const stats = useMemo(
    () => ({
      characters: editor?.storage.characterCount.characters ?? 0,
      words: editor?.storage.characterCount.words ?? 0,
    }),
    [editor],
  );

  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950',
        className,
      )}
    >
      <div className="legacy-editor-toolbar flex flex-wrap items-center gap-1 border-b border-slate-200 px-2 py-2 dark:border-slate-800">
        <Button
          type="button"
          variant={editor?.isActive('bold') ? 'secondary' : 'ghost'}
          size="icon"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          aria-label="Bold"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor?.isActive('italic') ? 'secondary' : 'ghost'}
          size="icon"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          aria-label="Italic"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor?.isActive('underline') ? 'secondary' : 'ghost'}
          size="icon"
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          aria-label="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor?.isActive('strike') ? 'secondary' : 'ghost'}
          size="icon"
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          aria-label="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-1 border-l border-slate-200 pl-2 dark:border-slate-800">
          <Button
            type="button"
            variant={editor?.isActive('bulletList') ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => toggleList('bullet')}
            aria-label="Bullet list"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={editor?.isActive('orderedList') ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => toggleList('ordered')}
            aria-label="Numbered list"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1 border-l border-slate-200 pl-2 dark:border-slate-800">
          <Button
            type="button"
            variant={editor?.isActive('paragraph') ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => applyHeading('paragraph')}
            aria-label="Paragraph"
          >
            <TextCursor className="h-4 w-4" />
          </Button>
          {HEADING_LEVELS.map((level) => (
            <Button
              key={`heading-${level}`}
              type="button"
              variant={editor?.isActive('heading', { level }) ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => applyHeading(level)}
              aria-label={`Heading ${level}`}
            >
              {level === 1 && <Heading1 className="h-4 w-4" />}
              {level === 2 && <Heading2 className="h-4 w-4" />}
              {level === 3 && <Heading3 className="h-4 w-4" />}
              {level === 4 && <Heading4 className="h-4 w-4" />}
            </Button>
          ))}
        </div>
        <Button
          type="button"
          variant={editor?.isActive('blockquote') ? 'secondary' : 'ghost'}
          size="icon"
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          aria-label="Blockquote"
        >
          <Quote className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={insertLink} aria-label="Insert link">
          <Link2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor?.chain().focus().unsetLink().run()}
          aria-label="Remove link"
        >
          <Unlink className="h-4 w-4" />
        </Button>
        <div className="border-l border-slate-200 px-2 dark:border-slate-800">
          <Button
            type="button"
            variant={editor?.isActive({ textAlign: 'left' }) ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => toggleAlign('left')}
            aria-label="Align left"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={editor?.isActive({ textAlign: 'center' }) ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => toggleAlign('center')}
            aria-label="Align center"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <div className="inline-flex">
            <Button
              type="button"
              variant={editor?.isActive({ textAlign: 'right' }) ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => toggleAlign('right')}
              aria-label="Align right"
            >
              <AlignRight className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={editor?.isActive({ textAlign: 'justify' }) ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => toggleAlign('justify')}
              aria-label="Align justify"
            >
              <AlignJustify className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setAdvancedOpen((prev) => !prev)}
          aria-label="Show more controls"
        >
          <Slash className="h-4 w-4" />
        </Button>
        <Popover open={ctaPopoverOpen} onOpenChange={setCtaPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Insert onboarding CTA"
            >
              <MousePointerClick className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <div>
              <Label className="text-xs uppercase text-slate-500">Texto do botão</Label>
              <Input
                value={ctaConfig.text}
                onChange={(event) =>
                  setCtaConfig((prev) => ({ ...prev, text: event.target.value }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs uppercase text-slate-500">Destino</Label>
              <Input
                value={ctaConfig.href}
                onChange={(event) =>
                  setCtaConfig((prev) => ({ ...prev, href: event.target.value }))
                }
                className="mt-1"
                placeholder="/sports/onboarding"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <label className="flex flex-col text-xs uppercase text-slate-500">
                Texto
                <input
                  type="color"
                  value={ctaConfig.textColor}
                  onChange={(event) =>
                    setCtaConfig((prev) => ({ ...prev, textColor: event.target.value }))
                  }
                  className="mt-1 h-8 w-full cursor-pointer rounded border border-slate-200"
                />
              </label>
              <label className="flex flex-col text-xs uppercase text-slate-500">
                Fundo
                <input
                  type="color"
                  value={ctaConfig.bg}
                  onChange={(event) =>
                    setCtaConfig((prev) => ({ ...prev, bg: event.target.value }))
                  }
                  className="mt-1 h-8 w-full cursor-pointer rounded border border-slate-200"
                />
              </label>
              <label className="flex flex-col text-xs uppercase text-slate-500">
                Hover
                <input
                  type="color"
                  value={ctaConfig.hover}
                  onChange={(event) =>
                    setCtaConfig((prev) => ({ ...prev, hover: event.target.value }))
                  }
                  className="mt-1 h-8 w-full cursor-pointer rounded border border-slate-200"
                />
              </label>
            </div>
            <Button className="w-full" onClick={insertCTAButton}>
              Inserir botão
            </Button>
          </PopoverContent>
        </Popover>
      </div>
      {advancedOpen && (
        <div className="legacy-editor-toolbar flex flex-wrap items-center gap-1 border-b border-slate-200 px-2 py-2 text-xs text-slate-500 dark:border-slate-800">
          <Button
            type="button"
            variant={forcePlainText ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setForcePlainText((prev) => !prev)}
            aria-label="Paste as text"
          >
            <Clipboard className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={() => editor?.chain().focus().setHorizontalRule().run()} aria-label="Insert hr">
            <Minus className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()} aria-label="Clear formatting">
            <Eraser className="h-4 w-4" />
          </Button>
          <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="icon">
                <Palette className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="grid grid-cols-4 gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-slate-950">
              {COLOR_SWATCHES.map((color) => (
                <button
                  key={color}
                  className="h-8 w-8 rounded-full border border-slate-300"
                  style={{ backgroundColor: color }}
                  onClick={() => editor?.chain().focus().setColor(color).run()}
                />
              ))}
            </PopoverContent>
          </Popover>
          <Button type="button" variant="ghost" size="icon" onClick={() => setSpecialCharsVisible((prev) => !prev)} aria-label="Insert character">
            <Asterisk className="h-4 w-4" />
          </Button>
          {specialCharsVisible && (
            <div className="flex flex-wrap gap-1 border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">
              {SPECIAL_CHARACTERS.map((char) => (
                <Button key={char} type="button" variant="ghost" size="sm" onClick={() => editor?.chain().focus().insertContent(char).run()}>
                  {char}
                </Button>
              ))}
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={insertReadMore}
            aria-label="Insert Read More marker"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1 border-l border-slate-200 pl-2 dark:border-slate-800">
            {(['left', 'center', 'right'] as ImageAlignment[]).map((alignment) => (
              <Button
                key={`image-align-${alignment}`}
                type="button"
                variant={
                  editor?.isActive('image', { alignment }) ||
                  defaultImageAlignment === alignment
                    ? 'secondary'
                    : 'ghost'
                }
                size="icon"
                onClick={() => setImageAlignment(alignment)}
                aria-label={`Image ${alignment}`}
              >
                {alignment === 'left' && <AlignLeft className="h-4 w-4" />}
                {alignment === 'center' && <AlignCenter className="h-4 w-4" />}
                {alignment === 'right' && <AlignRight className="h-4 w-4" />}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-1 border-l border-slate-200 pl-2 dark:border-slate-800">
            {(['sm', 'md', 'lg', 'xl'] as ImageSize[]).map((size) => (
              <Button
                key={`image-size-${size}`}
                type="button"
                variant={
                  editor?.isActive('image', { size }) || defaultImageSize === size
                    ? 'secondary'
                    : 'ghost'
                }
                size="icon"
                onClick={() => setImageSize(size)}
                aria-label={`Image size ${size.toUpperCase()}`}
                className="text-[11px] font-semibold"
              >
                {size.toUpperCase()}
              </Button>
            ))}
          </div>
          <Popover open={imageSizePopoverOpen} onOpenChange={setImageSizePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={!editor?.isActive('image')}
                aria-label="Resize image"
              >
                <MoveHorizontal className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-lg dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Dimensão da imagem
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(['sm', 'md', 'lg', 'xl'] as ImageSize[]).map((size) => (
                  <Button
                    key={`img-size-${size}`}
                    type="button"
                    variant={
                      editor?.isActive('image', { size }) || defaultImageSize === size
                        ? 'secondary'
                        : 'outline'
                    }
                    onClick={() => setImageSize(size)}
                  >
                    {size.toUpperCase()}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon" onClick={() => mediaLibrary.openLibrary('library')} aria-label="Add media">
            <ImagePlus className="h-4 w-4" />
          </Button>
          <MediaLibraryDialog
            open={mediaLibrary.isOpen}
            onOpenChange={(open) => {
              if (!open) mediaLibrary.closeLibrary();
            }}
            library={mediaLibrary}
            onSelect={openMedia}
            allowUrl
          />
        </div>
      )}
      <EditorContent
        editor={editor}
        className={cn(
          'legacy-editor-content prose prose-slate prose-sm min-h-[8rem] px-4 py-3 leading-relaxed focus:outline-none dark:prose-invert',
          `min-h-[${minRows * 32}px]`,
        )}
        data-placeholder={placeholder}
        id={id}
      />
      <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2 text-xs text-slate-500 dark:border-slate-800">
        <span>
          {stats.characters.toLocaleString()} chars | {stats.words.toLocaleString()} words
        </span>
        <span>{forcePlainText ? 'Paste as plain text' : 'Rich paste enabled'}</span>
      </div>
    </div>
  );
}
