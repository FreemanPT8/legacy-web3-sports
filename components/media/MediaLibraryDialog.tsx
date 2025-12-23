'use client';

import Image from 'next/image';
import { useMemo, useState, useId, useEffect } from 'react';
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

const LIBRARY_PAGE_SIZE = 50;

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

  const [page, setPage] = useState(1);
  const mediaItems = useMemo(() => library.items, [library.items]);
  const totalPages = Math.max(1, Math.ceil(mediaItems.length / LIBRARY_PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [totalPages, page]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * LIBRARY_PAGE_SIZE;
    return mediaItems.slice(start, start + LIBRARY_PAGE_SIZE);
  }, [mediaItems, page]);

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

  const inputClasses =
    'bg-[#03121a] border border-white/10 text-white placeholder:text-slate-400';
  const dropZoneClasses =
    'flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-[#03121a] p-4 text-center text-sm text-slate-300';
  const secondaryButtonClasses =
    'border-white/30 text-white hover:text-cyan-300 hover:border-cyan-300/60';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-5xl border border-white/10 bg-[#000c12] text-white"
        aria-describedby={description ? descriptionId : undefined}
      >
        <DialogHeader>
          <DialogTitle className="text-white">{title}</DialogTitle>
          {description && (
            <p id={descriptionId} className="text-sm text-slate-300">
              {description}
            </p>
          )}
        </DialogHeader>

        <Tabs
          value={library.activeTab}
          onValueChange={(value) => library.setActiveTab(value as MediaLibraryTab)}
          className="space-y-4"
        >
          <TabsList className="flex flex-wrap gap-2 border border-white/10 bg-[#05212b] p-2">
            <TabsTrigger
              value="library"
              className="flex-1 rounded-xl border border-transparent px-4 py-2 text-sm text-slate-300 data-[state=active]:border-white/20 data-[state=active]:bg-[#000c12] data-[state=active]:text-white"
            >
              Library
            </TabsTrigger>
            <TabsTrigger
              value="upload"
              className="flex-1 rounded-xl border border-transparent px-4 py-2 text-sm text-slate-300 data-[state=active]:border-white/20 data-[state=active]:bg-[#000c12] data-[state=active]:text-white"
            >
              Upload
            </TabsTrigger>
            {allowUrl && (
              <TabsTrigger
                value="url"
                className="flex-1 rounded-xl border border-transparent px-4 py-2 text-sm text-slate-300 data-[state=active]:border-white/20 data-[state=active]:bg-[#000c12] data-[state=active]:text-white"
              >
                Insert via URL
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="library" className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  value={library.searchTerm}
                  onChange={(event) => library.setSearchTerm(event.target.value)}
                  placeholder="Search media..."
                  className={`pl-8 ${inputClasses}`}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={secondaryButtonClasses}
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
              <p className="rounded-md border border-rose-400/40 bg-rose-500/10 p-2 text-sm text-rose-100">
                {library.error}
              </p>
            )}

            <ScrollArea className="max-h-[520px] rounded-2xl border border-white/10 bg-[#03121a] p-4">
              {library.loading ? (
                <div className="flex items-center justify-center py-10 text-sm text-slate-300">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading media...
                </div>
              ) : mediaItems.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">
                  No media files yet. Use the Upload tab to add new items.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {paginatedItems.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => {
                        onSelect(asset);
                        handleOpenChange(false);
                      }}
                      className="overflow-hidden rounded-2xl border border-white/10 bg-[#05212b] text-left shadow-lg shadow-black/30 transition hover:-translate-y-0.5 hover:border-cyan-400/60 focus:outline-none"
                    >
                      <div className="relative h-36 w-full overflow-hidden rounded-t-2xl bg-[#03121a]">
                        <button
                          type="button"
                          className="absolute right-2 top-2 z-10 rounded-full border border-white/20 bg-black/60 px-2 py-1 text-[11px] text-white"
                          onClick={(event) => {
                            event.stopPropagation();
                            setAssetToDelete(asset);
                            setConfirmOpen(true);
                          }}
                        >
                          Eliminar
                        </button>
                        {asset.thumbnailUrl || asset.url ? (
                          <div
                            className="h-full w-full bg-cover bg-center"
                            style={{
                              backgroundImage: `url("${
                                asset.thumbnailUrl || asset.url
                              }")`,
                            }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                            <ImageIcon className="mr-2 h-4 w-4" />
                            {(asset.type || 'file').toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-semibold text-white">
                          {asset.title || 'Untitled asset'}
                        </p>
                        <p className="text-xs uppercase text-slate-400">
                          {asset.type}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
            {mediaItems.length > LIBRARY_PAGE_SIZE && (
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#03121a] px-4 py-2 text-sm text-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={secondaryButtonClasses}
                  disabled={page === 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  Previous
                </Button>
                <p>
                  Page {page} of {totalPages}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={secondaryButtonClasses}
                  disabled={page === totalPages}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  Next
                </Button>
              </div>
            )}
            {recentUploads.length > 0 && (
              <div>
                <h3 className="mt-4 text-xs font-semibold uppercase text-slate-400">
                  Recent uploads
                </h3>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {recentUploads.map((asset) => (
                    <button
                      type="button"
                      key={`recent-${asset.id}`}
                      onClick={() => {
                        onSelect(asset);
                        handleOpenChange(false);
                      }}
                      className="overflow-hidden rounded-xl border border-dashed border-white/20 bg-[#03121a] px-3 py-2 text-left text-xs text-slate-200 hover:border-cyan-400/60 focus:outline-none"
                    >
                      <div className="font-semibold text-white">
                        {asset.title || 'Untitled asset'}
                      </div>
                      <div className="text-[11px] uppercase text-slate-400">
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
                  <label className={`${dropZoneClasses} mt-2 cursor-pointer`}>
                    <Upload className="mb-2 h-5 w-5 text-cyan-300" />
                    <p className="text-sm font-semibold text-white">
                      {file ? file.name : 'Arrasta ou clica para selecionar'}
                    </p>
                    <p className="text-xs text-slate-400">
                      Imagens, video, audio e documentos suportados.
                    </p>
                    <Input
                      type="file"
                      className="sr-only"
                      accept="image/*,video/*,audio/*,.pdf,.zip,.doc,.docx"
                      onChange={(event) => {
                        setFile(event.target.files?.[0] || null);
                        if (event.target.files?.[0]) {
                          setUploadTitle(event.target.files[0].name);
                        }
                      }}
                    />
                  </label>
                </div>
                <div>
                  <Label>Folder</Label>
                  <Input
                    value={folder}
                    onChange={(event) => setFolder(event.target.value)}
                    placeholder="uploads"
                    className={`${inputClasses} mt-2`}
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
                    className={`${inputClasses} mt-2`}
                  />
                </div>
                <div>
                  <Label>Alt text</Label>
                  <Input
                    value={uploadAlt}
                    onChange={(event) => setUploadAlt(event.target.value)}
                    placeholder="Describe the asset"
                    className={`${inputClasses} mt-2`}
                  />
                </div>
              </div>

              <div>
                <Label>Tags</Label>
                <Input
                  value={uploadTags}
                  onChange={(event) => setUploadTags(event.target.value)}
                  placeholder="design, cover, hero"
                  className={`${inputClasses} mt-2`}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-cyan-500 text-[#000c12] hover:bg-cyan-400"
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
                  <div className="text-xs text-slate-400">
                    Progresso do upload: {library.uploadProgress}%
                  </div>
                  <div className="h-1 rounded-full bg-white/10">
                    <div
                      className="h-1 rounded-full bg-cyan-400 transition-all"
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
                    className={`${inputClasses} mt-2`}
                  />
                </div>
                <div>
                  <Label>Title</Label>
                  <Input
                    value={urlTitle}
                    onChange={(event) => setUrlTitle(event.target.value)}
                    placeholder="Display title (optional)"
                    className={`${inputClasses} mt-2`}
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
                    <SelectTrigger className={`${inputClasses} mt-2`}>
                      <SelectValue placeholder="Select type" className="text-white" />
                    </SelectTrigger>
                    <SelectContent className="border border-white/10 bg-[#03121a] text-white">
                      {MEDIA_TYPES.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="submit"
                  disabled={!urlValue.trim()}
                  className="bg-cyan-500 text-[#000c12] hover:bg-cyan-400"
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  Insert media
                </Button>
              </form>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md border border-white/10 bg-[#000c12] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar eliminacao</DialogTitle>
            <p className="text-sm text-slate-300">
              Tens a certeza que queres eliminar esta imagem do Media Library? Esta acao nao pode ser desfeita.
            </p>
          </DialogHeader>
          <div className="mt-4 flex gap-3">
            <Button
              variant="outline"
              className={secondaryButtonClasses}
              onClick={() => {
                setConfirmOpen(false);
                setAssetToDelete(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              className="bg-rose-500 text-white hover:bg-rose-400"
              onClick={handleDeleteConfirm}
            >
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

