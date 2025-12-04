import { useState, useCallback, useId, useRef } from 'react';
import { Bold, Italic, List, Quote, Heading2, Link2, Minus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minRows?: number;
  className?: string;
}

const TOOLBAR_ACTIONS = [
  { key: 'bold', icon: Bold, label: 'Bold', surround: '**' },
  { key: 'italic', icon: Italic, label: 'Italic', surround: '_' },
  { key: 'heading', icon: Heading2, label: 'Heading', prefix: '## ' },
  { key: 'quote', icon: Quote, label: 'Quote', prefix: '> ' },
  { key: 'list', icon: List, label: 'Bullet list', prefix: '- ' },
  { key: 'hr', icon: Minus, label: 'Divider', block: '---' },
  { key: 'link', icon: Link2, label: 'Link', template: '[text](https://)' },
];

export function RichTextEditor({
  id,
  value,
  onChange,
  placeholder,
  minRows = 6,
  className,
}: RichTextEditorProps) {
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const generatedId = useId();
  const textareaId = id || generatedId;

  const handleAction = useCallback(
    (actionKey: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const { selectionStart, selectionEnd } = textarea;
      const selected = value.slice(selectionStart, selectionEnd);
      const action = TOOLBAR_ACTIONS.find((item) => item.key === actionKey);
      if (!action) return;

      let nextValue = value;
      if (action.surround) {
        nextValue =
          value.slice(0, selectionStart) +
          action.surround +
          selected +
          action.surround +
          value.slice(selectionEnd);
        onChange(nextValue);
        setTimeout(() => {
          textarea.focus();
          const offset = action.surround.length;
          textarea.setSelectionRange(selectionStart + offset, selectionEnd + offset);
        }, 0);
        return;
      }

      if (action.prefix) {
        const prefix = selected ? action.prefix : `${action.prefix}${selected}`;
        nextValue =
          value.slice(0, selectionStart) +
          prefix +
          value
            .slice(selectionStart, selectionEnd)
            .split('\n')
            .map((line, index) => (index === 0 ? line : `${action.prefix}${line}`))
            .join('\n') +
          value.slice(selectionEnd);
        onChange(nextValue);
        setTimeout(() => textarea.focus(), 0);
        return;
      }

      if (action.block) {
        const blockText = `${value ? '\n' : ''}${action.block}\n`;
        nextValue =
          value.slice(0, selectionEnd) + blockText + value.slice(selectionEnd);
        onChange(nextValue);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(selectionEnd + blockText.length, selectionEnd + blockText.length);
        }, 0);
        return;
      }

      if (action.template) {
        nextValue =
          value.slice(0, selectionStart) +
          action.template +
          value.slice(selectionEnd);
        onChange(nextValue);
        setTimeout(() => {
          textarea.focus();
          const cursor = selectionStart + action.template.indexOf('https://');
          textarea.setSelectionRange(cursor, cursor + 'https://'.length);
        }, 0);
      }
    },
    [value, onChange],
  );

  return (
    <div
      className={cn(
        'rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950',
        isFocused && 'ring-2 ring-blue-500',
        className,
      )}
    >
      <div className="flex flex-wrap gap-1 border-b border-gray-200 px-3 py-2 dark:border-gray-800">
        {TOOLBAR_ACTIONS.map((action) => (
          <Button
            key={action.key}
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-600 hover:text-blue-600 dark:text-gray-300"
            onClick={() => handleAction(action.key)}
            aria-label={action.label}
          >
            <action.icon className="h-4 w-4" />
          </Button>
        ))}
      </div>
      <textarea
        id={textareaId}
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={minRows}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="min-h-[120px] w-full resize-y bg-transparent px-4 py-3 text-sm outline-none dark:text-gray-100"
      />
    </div>
  );
}
