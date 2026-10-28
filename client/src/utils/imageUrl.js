const configuredApiUrl = import.meta.env.VITE_API_URL || '';
const configuredApiOrigin = /^https?:\/\//i.test(configuredApiUrl)
  ? new URL(configuredApiUrl).origin
  : '';

export function imageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  if (/^(data:|blob:|https?:\/\/)/i.test(url)) return url;

  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  if (normalizedPath.startsWith('/uploads/') && configuredApiOrigin) {
    return `${configuredApiOrigin}${normalizedPath}`;
  }
  return normalizedPath;
}
