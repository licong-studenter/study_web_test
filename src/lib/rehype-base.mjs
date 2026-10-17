/**
 * Prefix root-relative links and images generated from Markdown with the
 * GitHub Pages base path. Astro components use withBase() explicitly.
 */
export default function rehypeBase(options = {}) {
  const base = (options.base || '').replace(/\/+$/, '');
  if (!base) return () => {};

  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'element') {
      const props = node.properties || {};
      for (const key of ['href', 'src']) {
        const value = props[key];
        if (
          typeof value === 'string' &&
          value.startsWith('/') &&
          !value.startsWith('//') &&
          !value.startsWith(`${base}/`) &&
          value !== base
        ) {
          props[key] = `${base}${value}`;
        }
      }
    }
    if (Array.isArray(node.children)) node.children.forEach(walk);
  };

  return (tree) => walk(tree);
}
