const normalizedBase = import.meta.env.BASE_URL.replace(/\/+$/, '');

export function withBase(path = '/'): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (!normalizedBase) return clean;
  return clean === '/' ? `${normalizedBase}/` : `${normalizedBase}${clean}`;
}

export const basePath = normalizedBase;
