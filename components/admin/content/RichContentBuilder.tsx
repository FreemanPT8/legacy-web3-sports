'use client';

import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowDown,
  ArrowUp,
  Heading,
  Image as ImageIcon,
  Type,
  Video,
  Minus,
  Link as LinkIcon,
  MousePointerClick,
  Trash2,
} from 'lucide-react';

export type ContentBlockType =
  | 'heading'
  | 'subheading'
  | 'paragraph'
  | 'image'
  | 'video'
  | 'button'
  | 'divider';

export interface ContentBlock {
  id: string;
  type: ContentBlockType;
  data: {
    text?: string;
    url?: string;
    alt?: string;
    buttonLabel?: string;
  };
}

interface RichContentBuilderProps {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
}

function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `block-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function RichContentBuilder({ blocks, onChange }: RichContentBuilderProps) {
  const addBlock = useCallback(
    (type: ContentBlockType) => {
      const newBlock: ContentBlock = {
        id: createId(),
        type,
        data: {},
      };

      switch (type) {
        case 'heading':
          newBlock.data.text = 'Section title';
          break;
        case 'subheading':
          newBlock.data.text = 'Subtitle';
          break;
        case 'paragraph':
          newBlock.data.text = 'Your text here...';
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
        default:
          break;
      }

      onChange([...blocks, newBlock]);
    },
    [blocks, onChange],
  );

  const updateBlock = useCallback(
    (id: string, data: Partial<ContentBlock['data']>) => {
      onChange(
        blocks.map((b) =>
          b.id === id ? { ...b, data: { ...b.data, ...data } } : b,
        ),
      );
    },
    [blocks, onChange],
  );

  const deleteBlock = useCallback(
    (id: string) => {
      onChange(blocks.filter((b) => b.id !== id));
    },
    [blocks, onChange],
  );

  const moveBlock = useCallback(
    (id: string, direction: 'up' | 'down') => {
      const index = blocks.findIndex((b) => b.id === id);
      if (index === -1) return;

      const newBlocks = [...blocks];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newBlocks.length) return;

      const [removed] = newBlocks.splice(index, 1);
      newBlocks.splice(targetIndex, 0, removed);

      onChange(newBlocks);
    },
    [blocks, onChange],
  );

  const renderBlockFields = (block: ContentBlock) => {
    const { type, data } = block;

    switch (type) {
      case 'heading':
      case 'subheading':
      case 'paragraph':
        return (
          <div className="space-y-2">
            <Label>
              {type === 'heading'
                ? 'Heading text'
                : type === 'subheading'
                ? 'Subheading text'
                : 'Paragraph text'}
            </Label>
            <Textarea
              rows={type === 'paragraph' ? 4 : 2}
              value={data.text || ''}
              onChange={(e) => updateBlock(block.id, { text: e.target.value })}
              placeholder={
                type === 'paragraph'
                  ? 'Write your paragraph here... (HTML supported: <strong>, <em>, <u>, <a href="...">)'
                  : undefined
              }
            />
            <p className="text-xs text-gray-500">
              You can use basic HTML for <strong>bold</strong>, <em>italic</em>,{' '}
              <u>underline</u> and links.
            </p>
          </div>
        );

      case 'image':
        return (
          <div className="space-y-3">
            <div>
              <Label>Image URL</Label>
              <Input
                value={data.url || ''}
                onChange={(e) => updateBlock(block.id, { url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Alt text (accessibility)</Label>
              <Input
                value={data.alt || ''}
                onChange={(e) => updateBlock(block.id, { alt: e.target.value })}
                placeholder="Describe the image..."
              />
            </div>
          </div>
        );

      case 'video':
        return (
          <div className="space-y-2">
            <Label>Video link (YouTube, Vimeo, etc.)</Label>
            <Input
              value={data.url || ''}
              onChange={(e) => updateBlock(block.id, { url: e.target.value })}
              placeholder="https://youtube.com/..."
            />
            <p className="text-xs text-gray-500">
              We&apos;ll save the link. On the public page you can embed or link this URL.
            </p>
          </div>
        );

      case 'button':
        return (
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Button label</Label>
              <Input
                value={data.buttonLabel || ''}
                onChange={(e) =>
                  updateBlock(block.id, { buttonLabel: e.target.value })
                }
                placeholder="e.g. Join now"
              />
            </div>
            <div>
              <Label>Button URL</Label>
              <Input
                value={data.url || ''}
                onChange={(e) => updateBlock(block.id, { url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
        );

      case 'divider':
        return (
          <div className="py-2">
            <p className="text-xs text-gray-500">
              Horizontal divider. Use it to separate sections.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-dashed border-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Content blocks
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
              <Heading className="h-3 w-3 mr-1" />
              Heading
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => addBlock('subheading')}
            >
              <Type className="h-3 w-3 mr-1" />
              Subheading
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => addBlock('paragraph')}
            >
              <Type className="h-3 w-3 mr-1" />
              Paragraph
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
              <Video className="h-3 w-3 mr-1" />
              Video
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => addBlock('button')}
            >
              <MousePointerClick className="h-3 w-3 mr-1" />
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
          </div>

          {blocks.length === 0 && (
            <p className="text-xs text-gray-500 mt-2">
              No blocks yet. Click a block type above to start building your content.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {blocks.map((block, index) => (
          <Card key={block.id} className="border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3 px-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                {block.type === 'heading' && (
                  <>
                    <Heading className="h-4 w-4" />
                    <span>Heading</span>
                  </>
                )}
                {block.type === 'subheading' && (
                  <>
                    <Type className="h-4 w-4" />
                    <span>Subheading</span>
                  </>
                )}
                {block.type === 'paragraph' && (
                  <>
                    <Type className="h-4 w-4" />
                    <span>Paragraph</span>
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
                    <Video className="h-4 w-4" />
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
                  disabled={index === blocks.length - 1}
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
