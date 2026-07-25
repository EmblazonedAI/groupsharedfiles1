'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText } from 'lucide-react';

type Thumb = { dataUrl: string; pages: number };

// Rendered thumbnails are kept for the session so cards don't re-render
// their PDFs every time filters change or the user navigates back.
const thumbCache = new Map<string, Thumb>();
const pendingRenders = new Map<string, Promise<Thumb>>();

async function renderFirstPage(src: string): Promise<Thumb> {
  const pending = pendingRenders.get(src);
  if (pending) return pending;

  const task = (async () => {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();

    const loadingTask = pdfjs.getDocument({ url: src });
    const doc = await loadingTask.promise;
    try {
      const page = await doc.getPage(1);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(2, 640 / baseViewport.width);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      // 'print' intent renders without requestAnimationFrame scheduling, so
      // thumbnails still complete in background/hidden tabs.
      await page.render({ canvas, viewport, intent: 'print' }).promise;

      const thumb: Thumb = {
        dataUrl: canvas.toDataURL('image/jpeg', 0.85),
        pages: doc.numPages,
      };
      thumbCache.set(src, thumb);
      return thumb;
    } finally {
      void loadingTask.destroy();
    }
  })();

  pendingRenders.set(src, task);
  try {
    return await task;
  } finally {
    pendingRenders.delete(src);
  }
}

export default function PdfThumbnail({
  src,
  className = '',
  showPageCount = true,
}: {
  src: string;
  className?: string;
  showPageCount?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<Thumb | null>(() => thumbCache.get(src) || null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (thumb || failed) return;
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        renderFirstPage(src)
          .then((t) => { if (!cancelled) setThumb(t); })
          .catch(() => { if (!cancelled) setFailed(true); });
      },
      { rootMargin: '300px' }
    );
    observer.observe(el);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [src, thumb, failed]);

  return (
    <div ref={containerRef} className={`relative bg-[#F9F8F6] overflow-hidden ${className}`}>
      {thumb ? (
        <>
          <img
            src={thumb.dataUrl}
            alt="First page of PDF"
            className="w-full h-full object-cover object-top"
          />
          {showPageCount && (
            <span className="absolute bottom-2 right-2 bg-black/55 text-white text-[10px] font-medium px-2 py-0.5 rounded-md">
              {thumb.pages} {thumb.pages === 1 ? 'page' : 'pages'}
            </span>
          )}
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#8F9F8A]">
          <FileText className={`w-8 h-8 ${failed ? '' : 'animate-pulse'}`} />
          <span className="text-[10px] font-medium uppercase tracking-wider text-[#8C8C8C]">
            {failed ? 'PDF' : 'Loading preview…'}
          </span>
        </div>
      )}
    </div>
  );
}
