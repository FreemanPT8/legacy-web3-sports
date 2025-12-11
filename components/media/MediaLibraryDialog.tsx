'use client';

import Image from 'next/image';
import { useMemo, useState, useId } from 'react';
import { Upload, Link2, Search, RefreshCw, Loader2, ImageIcon } from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { MediaAsset } from '@/types/builder';
import { useMediaLibrary, type MediaLibraryTab } from '@/hooks/useMediaLibrary';

interface MediaLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  library: ReturnType<typeof useMediaLibrary>;
  onSelect: (asset: MediaAsset) => void;
  title?: string;
  description?: string;
  allowUrl?: boolean;
}

const MEDIA_TYPES = [
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
  { value: 'document', label: 'Document' },
  { value: 'audio', label: 'Audio' },
  { value: 'other', label: 'Other' },
] as const;

export function MediaLibraryDialog({
  open,
  onOpenChange,
  library,
  onSelect,
  title = 'Media Library',
  description = 'Upload, search e insere ficheiros para o Legacy Builder.',
  allowUrl = true,
}: MediaLibraryDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadAlt, setUploadAlt] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [folder, setFolder] = useState('uploads');

  const [urlValue, setUrlValue] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
  const [urlType, setUrlType] = useState<MediaAsset['type']>('image');
  const descriptionId = useId();

  const mediaItems = useMemo(() => library.items, [library.items]);
  const recentUploads = useMemo(() => library.allItems.slice(0, 4), [library.allItems]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      library.openLibrary(library.activeTab);
    } else {
      library.closeLibrary();
      resetForms();
    }
    onOpenChange(nextOpen);
  };

  const [assetToDelete, setAssetToDelete] = useState<MediaAsset | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) return;
    const uploaded = await library.uploadAsset({
      file,
      title: uploadTitle,
      alt: uploadAlt,
      tags: uploadTags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      folder,
    });
    if (uploaded) {
      onSelect(uploaded);
      handleOpenChange(false);
    }
  };

  const handleUrlInsert = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!urlValue.trim()) return;
    try {
      // Validate URL
      const parsed = new URL(urlValue.trim());
      const asset: MediaAsset = {
        id: `external_${Date.now()}`,
        url: parsed.toString(),
        thumbnailUrl: parsed.toString(),
        type: urlType,
        title: urlTitle || parsed.hostname,
        alt: urlTitle || parsed.hostname,
      };
      onSelect(asset);
      handleOpenChange(false);
    } catch {
      // Invalid URL - keep field untouched, ideally show error via state
    }
  };

  const resetForms = () => {
    setFile(null);
    setUploadTitle('');
    setUploadAlt('');
    setUploadTags('');
    setFolder('uploads');
    setUrlValue('');
    setUrlTitle('');
    setUrlType('image');
  };

  const handleDeleteConfirm = async () => {
    if (!assetToDelete) return;
    const success = await library.deleteAsset(assetToDelete.id);
    if (success) {
      setAssetToDelete(null);
      setConfirmOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-5xl"
        aria-describedby={description ? descriptionId : undefined}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <p id={descriptionId} className="text-sm text-gray-500">
              {description}
            </p>
          )}
        </DialogHeader>

        <Tabs
          value={library.activeTab}
          onValueChange={(value) => library.setActiveTab(value as MediaLibraryTab)}
          className="space-y-4"
        >
          <TabsList>
            <TabsTrigger value="library">Library</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
            {allowUrl && <TabsTrigger value="url">Insert via URL</TabsTrigger>}
          </TabsList>

          <TabsContent value="library" className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  value={library.searchTerm}
                  onChange={(event) => library.setSearchTerm(event.target.value)}
                  placeholder="Search media..."
                  className="pl-8"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => library.refresh()}
                disabled={library.loading}
              >
                {library.loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>

            {library.error && (
              <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-600">
                {library.error}
              </p>
            )}

            <ScrollArea className="max-h-[420px] rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
              {library.loading ? (
                <div className="flex items-center justify-center py-10 text-sm text-gray-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading media...
                </div>
              ) : mediaItems.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-500">
                  No media files yet. Use the Upload tab to add new items.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {mediaItems.map((asset) => (
                    <button
                        key={asset.id}
                        type="button"
                    onClick={() => {
                      onSelect(asset);
                      handleOpenChange(false);
                    }}
                    className="overflow-hidden rounded-2xl border border-gray-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div className="relative h-36 w-full overflow-hidden bg-gray-50">
                        <button
                          type="button"
                          className="absolute right-2 top-2 z-10 rounded-full bg-black/60 px-2 py-1 text-xs text-white"
                          onClick={(event) => {
                            event.stopPropagation();
                            setAssetToDelete(asset);
                            setConfirmOpen(true);
                          }}
                        >
                          Eliminar
                        </button>
                      {asset.thumbnailUrl || asset.url ? (
                        <Image
                          src={asset.thumbnailUrl || asset.url}
                          alt={asset.title || 'Media asset'}
                          fill
                          className="object-cover"
                          sizes="(max-width: 1024px) 50vw, 320px"
                          unoptimized
                        />
                      ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
                              <ImageIcon className="mr-2 h-4 w-4" />
                              {(asset.type || 'file').toUpperCase()}
                            </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-semibold">
                          {asset.title || 'Untitled asset'}
                        </p>
                        <p className="text-xs uppercase text-gray-500">
                          {asset.type}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
            {recentUploads.length > 0 && (
              <div>
                <h3 className="mt-4 text-xs font-semibold uppercase text-muted-foreground">Recent uploads</h3>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {recentUploads.map((asset) => (
                    <button
                      type="button"
                      key={`recent-${asset.id}`}
                      onClick={() => {
                        onSelect(asset);
                        handleOpenChange(false);
                      }}
                      className="overflow-hidden rounded-xl border border-dashed border-gray-300 bg-white px-2 py-2 text-left text-xs text-gray-600 hover:border-sky-500 focus:outline-none"
                    >
                      <div className="font-semibold text-slate-900">
                        {asset.title || 'Untitled asset'}
                      </div>
                      <div className="text-[11px] uppercase text-gray-400">
                        {asset.type}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload">
            <form className="space-y-4" onSubmit={handleUpload}>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>File</Label>
                  <Input
                    type="file"
                    accept="image/*,video/*,audio/*,.pdf,.zip,.doc,.docx"
                    onChange={(event) => {
                      setFile(event.target.files?.[0] || null);
                      if (event.target.files?.[0]) {
                        setUploadTitle(event.target.files[0].name);
                      }
                    }}
                  />
                </div>
                <div>
                  <Label>Folder</Label>
                  <Input
                    value={folder}
                    onChange={(event) => setFolder(event.target.value)}
                    placeholder="uploads"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={uploadTitle}
                    onChange={(event) => setUploadTitle(event.target.value)}
                    placeholder="Asset title"
                  />
                </div>
                <div>
                  <Label>Alt text</Label>
                  <Input
                    value={uploadAlt}
                    onChange={(event) => setUploadAlt(event.target.value)}
                    placeholder="Describe the asset"
                  />
                </div>
              </div>

              <div>
                <Label>Tags</Label>
                <Input
                  value={uploadTags}
                  onChange={(event) => setUploadTags(event.target.value)}
                  placeholder="design, cover, hero"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={!file || library.uploading}
              >
                {library.uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload file
                  </>
                )}
              </Button>
              {library.uploadProgress != null && (
                <div className="mt-2 space-y-1">
                  <div className="text-xs text-gray-500">
                    Progresso do upload: {library.uploadProgress}%
                  </div>
                  <div className="h-1 rounded-full bg-slate-200">
                    <div
                      className="h-1 rounded-full bg-sky-500 transition-all"
                      style={{ width: `${library.uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </form>
          </TabsContent>

          {allowUrl && (
            <TabsContent value="url">
              <form className="space-y-4" onSubmit={handleUrlInsert}>
                <div>
                  <Label>Media URL</Label>
                  <Input
                    value={urlValue}
                    onChange={(event) => setUrlValue(event.target.value)}
                    placeholder="https://example.com/asset.png"
                    type="url"
                  />
                </div>
                <div>
                  <Label>Title</Label>
                  <Input
                    value={urlTitle}
                    onChange={(event) => setUrlTitle(event.target.value)}
                    placeholder="Display title (optional)"
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select
                    value={urlType}
                    onValueChange={(value) =>
                      setUrlType(value as MediaAsset['type'])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {MEDIA_TYPES.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={!urlValue.trim()}>
                  <Link2 className="mr-2 h-4 w-4" />
                  Insert media
                </Button>
              </form>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar eliminação</DialogTitle>
            <p className="text-sm text-gray-500">
              Tens a certeza que queres eliminar esta imagem do Media Library? Esta ação
              não pode ser desfeita.
            </p>
          </DialogHeader>
          <div className="mt-4 flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setConfirmOpen(false);
                setAssetToDelete(null);
              }}
            >
              Cancelar
            </Button>
            <Button className="bg-red-500 hover:bg-red-600" onClick={handleDeleteConfirm}>
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
