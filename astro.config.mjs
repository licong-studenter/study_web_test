import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { unified } from '@astrojs/markdown-remark';
import { loadEnv } from 'vite';
import { resolveDeployment } from './src/lib/site-config.mjs';
import rehypeBase from './src/lib/rehype-base.mjs';

const fileEnv = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '');
const deployment = resolveDeployment({ ...fileEnv, ...process.env });

export default defineConfig({
  site: deployment.site,
  base: deployment.base,
  trailingSlash: 'always',
  output: 'static',
  integrations: [
    mdx(),
    react(),
    sitemap({
      filter: (page) => !page.includes('/admin') && !new URL(page).pathname.includes('/course/'),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
  },
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex, [rehypeBase, { base: deployment.base }]],
    }),
    shikiConfig: {
      theme: 'github-dark-default',
      wrap: true,
    },
  },
});
