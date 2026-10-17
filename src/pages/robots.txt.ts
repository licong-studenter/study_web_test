import type { APIRoute } from 'astro';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const sitemap = site ? new URL(`${base}/sitemap-index.xml`, site).href : '/sitemap-index.xml';
  const body = `User-agent: *\nAllow: /\nDisallow: ${base}/admin/\n\nSitemap: ${sitemap}\n`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
