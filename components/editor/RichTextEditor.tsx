'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Image from '@tiptap/extension-image';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import { Button } from '@/components/ui/button';
import { MediaLibraryDialog } from '@/components/media/MediaLibraryDialog';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { READ_MORE_MARKER } from '@/lib/read-more';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Asterisk,
  Bold,
  Clipboard,
  Eraser,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
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
import { type Level } from '@tiptap/extension-heading';

interface RichTextEditorProps {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  minRows?: number;
  className?: string;
}

const SPECIAL_CHARACTERS = ['•', '—', '–', '…', '™', '©', '®', '∞'];
const COLOR_SWATCHES = ['#2563EB', '#10B981', '#F97316', '#EF4444', '#A855F7', '#FACC15', '#0EA5E9'];

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
  const mediaLibrary = useMediaLibrary();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5] },
      }),
      Underline,
      Strike,
      TextStyle,
      Color.configure({ types: ['textStyle'] }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'legacy-link',
          rel: 'noreferrer noopener',
          target: '_blank',
        },
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Start writing…',
      }),
      CharacterCount.configure(),
      Image.configure({ HTMLAttributes: { class: 'rounded-2xl border border-slate-200' } }),
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
      editor.chain().focus().toggleHeading({ level }).run();
    },
    [editor],
  );

  const toggleAlign = useCallback(
    (direction: 'left' | 'center' | 'right') => {
      editor?.chain().focus().setTextAlign(direction).run();
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
      if (asset.type === 'image') {
        editor
          .chain()
          .focus()
          .setImage({
            src: asset.url,
            alt: asset.alt || asset.title || '',
          })
          .run();
        return;
      }
      editor.chain().focus().insertContent(`<p><a href="${asset.url}">${asset.title || asset.url}</a></p>`).run();
    },
    [editor],
  );

  const insertReadMore = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertContent(READ_MORE_MARKER).run();
  }, [editor]);

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
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 px-2 py-2 dark:border-slate-800">
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
        <Button
          type="button"
          variant={editor?.isActive('bulletList') ? 'secondary' : 'ghost'}
          size="icon"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          aria-label="Bullet list"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor?.isActive('orderedList') ? 'secondary' : 'ghost'}
          size="icon"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          aria-label="Numbered list"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor?.isActive('blockquote') ? 'secondary' : 'ghost'}
          size="icon"
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          aria-label="Blockquote"
        >
          <Quote className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={editor?.isActive('paragraph') ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => applyHeading('paragraph')}
            aria-label="Paragraph"
          >
            <TextCursor className="h-4 w-4" />
          </Button>
          {([1, 2, 3, 4, 5] as Level[]).map((level) => (
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
              {level === 5 && <Heading5 className="h-4 w-4" />}
            </Button>
          ))}
        </div>
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
          <Button
            type="button"
            variant={editor?.isActive({ textAlign: 'right' }) ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => toggleAlign('right')}
            aria-label="Align right"
          >
            <AlignRight className="h-4 w-4" />
          </Button>
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
      </div>
      {advancedOpen && (
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 px-2 py-2 text-xs text-slate-500 dark:border-slate-800">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            aria-label="Strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </Button>
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
          'min-h-[8rem] px-4 py-3 text-sm leading-relaxed focus:outline-none dark:text-white',
          `min-h-[${minRows * 32}px]`,
        )}
        data-placeholder={placeholder}
        id={id}
      />
      <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2 text-xs text-slate-500 dark:border-slate-800">
        <span>
          {stats.characters.toLocaleString()} chars · {stats.words.toLocaleString()} words
        </span>
        <span>{forcePlainText ? 'Paste as plain text' : 'Rich paste enabled'}</span>
      </div>
    </div>
  );
}
