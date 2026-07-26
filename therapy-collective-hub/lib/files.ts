export const isImageUrl = (url: string) =>
  /\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)(\?|$)/i.test(url);

export const isPdfUrl = (url: string) => /\.pdf(\?|$)/i.test(url);

export const isAudioUrl = (url: string) => /\.(mp3|wav|ogg|m4a|aac|flac)(\?|$)/i.test(url);

export const isVideoUrl = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url);

export const getBlobProxyUrl = (url: string, opts?: { download?: boolean; name?: string }) => {
  let proxied = `/api/blob?url=${encodeURIComponent(url)}`;
  if (opts?.download) proxied += '&download=1';
  if (opts?.name) proxied += `&name=${encodeURIComponent(opts.name)}`;
  return proxied;
};

const rawFileName = (url: string) => {
  try {
    const path = new URL(url, 'http://localhost').pathname;
    return decodeURIComponent(path.split('/').pop() || '');
  } catch {
    return '';
  }
};

// Older uploads were stored under a bare "blob" path with no real filename,
// so a name is only meaningful if it has an extension and isn't that stub.
export const hasMeaningfulFileName = (url: string) => {
  const name = rawFileName(url);
  return name.length > 0 && name.toLowerCase() !== 'blob' && /\.[A-Za-z0-9]+$/.test(name);
};

export const getFileName = (url: string, fallback?: string) => {
  if (!hasMeaningfulFileName(url)) return fallback || 'Attached File';
  // Uploads are stored as "name-<timestamp>.ext"; hide the timestamp for display
  return rawFileName(url).replace(/-\d{13}(?=\.[^.]+$)/, '');
};

export const getFileExtension = (url: string) => {
  const name = rawFileName(url);
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toUpperCase() : '';
};

export const getDomain = (url: string) => {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
};

export type FileKind = 'pdf' | 'image' | 'audio' | 'video' | 'other';

export const fileKindFromUrl = (url: string): FileKind | null => {
  if (isPdfUrl(url)) return 'pdf';
  if (isImageUrl(url)) return 'image';
  if (isAudioUrl(url)) return 'audio';
  if (isVideoUrl(url)) return 'video';
  if (hasMeaningfulFileName(url)) return 'other';
  return null; // unknown — caller should probe the content type
};

export const fileKindFromContentType = (contentType: string): FileKind => {
  const type = contentType.toLowerCase();
  if (type.includes('pdf')) return 'pdf';
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('audio/')) return 'audio';
  if (type.startsWith('video/')) return 'video';
  return 'other';
};
