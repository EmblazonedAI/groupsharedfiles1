'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Paperclip, Download, ExternalLink, Maximize2, X, Music, Film } from 'lucide-react';
import {
  getBlobProxyUrl,
  getFileName,
  getFileExtension,
  fileKindFromUrl,
  fileKindFromContentType,
  type FileKind,
} from '@/lib/files';

// Kinds already probed this session, keyed by blob URL, so navigating back
// doesn't re-issue HEAD requests for extension-less legacy uploads.
const kindCache = new Map<string, FileKind>();

/**
 * Renders the right inline preview for any attached file: PDF viewer, image
 * with lightbox, audio/video player, or a tidy attachment card. Files whose
 * URLs don't reveal a type (older uploads stored under a bare "blob" path)
 * are probed with a HEAD request for their real content type.
 */
export default function FilePreview({ blobUrl, title }: { blobUrl: string; title: string }) {
  const urlKind = fileKindFromUrl(blobUrl);
  const [kind, setKind] = useState<FileKind | 'loading'>(
    () => urlKind ?? kindCache.get(blobUrl) ?? 'loading'
  );
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (kind !== 'loading') return;
    let cancelled = false;
    fetch(getBlobProxyUrl(blobUrl), { method: 'HEAD' })
      .then((res) => {
        const resolved = res.ok
          ? fileKindFromContentType(res.headers.get('content-type') || '')
          : 'other';
        kindCache.set(blobUrl, resolved);
        if (!cancelled) setKind(resolved);
      })
      .catch(() => { if (!cancelled) setKind('other'); });
    return () => { cancelled = true; };
  }, [blobUrl, kind]);

  const proxyUrl = getBlobProxyUrl(blobUrl);
  const downloadUrl = getBlobProxyUrl(blobUrl, { download: true, name: getFileName(blobUrl, title) });
  const displayName = getFileName(blobUrl, title);

  const actionButtons = (
    <div className="ml-auto flex items-center gap-2 flex-shrink-0">
      <a
        href={proxyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#6B6B6B] hover:text-[#4A4A4A] bg-white hover:bg-[#F0EFEA] border border-[#E8E6E1] rounded-lg transition-colors"
      >
        <Maximize2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Open in new tab</span>
      </a>
      <a
        href={downloadUrl}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#8F9F8A] hover:bg-[#7A8A75] text-white rounded-lg transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Download</span>
      </a>
    </div>
  );

  const headerBar = (icon: React.ReactNode) => (
    <div className="flex items-center gap-3 px-4 py-3 bg-[#F9F8F6] border-b border-[#E8E6E1]">
      {icon}
      <span className="text-sm font-medium text-[#4A4A4A] truncate">{displayName}</span>
      {actionButtons}
    </div>
  );

  if (kind === 'loading') {
    return (
      <div className="mb-6 flex items-center gap-3 px-5 py-4 bg-[#F9F8F6] rounded-2xl border border-[#E8E6E1]">
        <div className="p-2.5 bg-white rounded-xl border border-[#E8E6E1] text-[#8F9F8A]">
          <Paperclip className="w-5 h-5 animate-pulse" />
        </div>
        <p className="text-sm text-[#8C8C8C]">Preparing preview…</p>
      </div>
    );
  }

  if (kind === 'pdf') {
    return (
      <div className="mb-6 rounded-2xl border border-[#E8E6E1] overflow-hidden">
        {headerBar(<FileText className="w-4 h-4 text-[#8F9F8A] flex-shrink-0" />)}
        <iframe
          src={`${proxyUrl}#view=FitH`}
          title={`Preview of ${displayName}`}
          className="w-full h-[75vh] bg-white"
        />
      </div>
    );
  }

  if (kind === 'image') {
    return (
      <>
        <div
          className="mb-6 rounded-2xl overflow-hidden border border-[#E8E6E1] cursor-pointer relative group/img"
          onClick={() => setLightboxOpen(true)}
        >
          <img src={proxyUrl} alt={title} className="w-full object-contain bg-[#F9F8F6]" />
          <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/60 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2">
              <Maximize2 className="w-4 h-4" />
              Click to view full size
            </div>
          </div>
        </div>
        <AnimatePresence>
          {lightboxOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
              onClick={() => setLightboxOpen(false)}
            >
              <button
                onClick={() => setLightboxOpen(false)}
                className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <motion.img
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                src={proxyUrl}
                alt={title}
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  if (kind === 'audio') {
    return (
      <div className="mb-6 rounded-2xl border border-[#E8E6E1] overflow-hidden">
        {headerBar(<Music className="w-4 h-4 text-[#8F9F8A] flex-shrink-0" />)}
        <div className="p-5 bg-white">
          <audio controls preload="metadata" className="w-full" src={proxyUrl}>
            Your browser does not support audio playback.
          </audio>
        </div>
      </div>
    );
  }

  if (kind === 'video') {
    return (
      <div className="mb-6 rounded-2xl border border-[#E8E6E1] overflow-hidden">
        {headerBar(<Film className="w-4 h-4 text-[#8F9F8A] flex-shrink-0" />)}
        <video controls preload="metadata" className="w-full max-h-[70vh] bg-black" src={proxyUrl}>
          Your browser does not support video playback.
        </video>
      </div>
    );
  }

  // Anything else: a tidy attachment card with a friendly name.
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 px-5 py-4 bg-[#F9F8F6] rounded-2xl border border-[#E8E6E1]">
      <div className="p-2.5 bg-white rounded-xl border border-[#E8E6E1] text-[#8F9F8A]">
        <Paperclip className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#4A4A4A] truncate">{displayName}</p>
        <p className="text-xs text-[#8C8C8C]">{getFileExtension(blobUrl) || 'Attached'} file</p>
      </div>
      <a
        href={proxyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-[#F0EFEA] text-[#6B6B6B] border border-[#E8E6E1] text-sm rounded-xl font-medium transition-colors"
      >
        <ExternalLink className="w-4 h-4" />
        Open
      </a>
      <a
        href={downloadUrl}
        className="flex items-center gap-2 px-4 py-2 bg-[#8F9F8A] hover:bg-[#7A8A75] text-white text-sm rounded-xl font-medium transition-colors"
      >
        <Download className="w-4 h-4" />
        Download
      </a>
    </div>
  );
}
