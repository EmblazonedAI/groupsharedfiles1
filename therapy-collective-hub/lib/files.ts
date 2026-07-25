export const isImageUrl = (url: string) =>
  /\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)(\?|$)/i.test(url);

export const isPdfUrl = (url: string) => /\.pdf(\?|$)/i.test(url);

export const getBlobProxyUrl = (url: string, opts?: { download?: boolean }) =>
  `/api/blob?url=${encodeURIComponent(url)}${opts?.download ? '&download=1' : ''}`;

export const getFileName = (url: string) => {
  try {
    const path = new URL(url, 'http://localhost').pathname;
    const raw = decodeURIComponent(path.split('/').pop() || 'Attached File');
    // Uploads are stored as "name-<timestamp>.ext"; hide the timestamp for display
    return raw.replace(/-\d{13}(?=\.[^.]+$)/, '');
  } catch {
    return 'Attached File';
  }
};

export const getFileExtension = (url: string) => {
  try {
    const path = new URL(url, 'http://localhost').pathname;
    const name = path.split('/').pop() || '';
    const dot = name.lastIndexOf('.');
    return dot >= 0 ? name.slice(dot + 1).toUpperCase() : '';
  } catch {
    return '';
  }
};

export const getDomain = (url: string) => {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
};
