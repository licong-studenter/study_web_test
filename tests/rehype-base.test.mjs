import { describe, expect, it } from 'vitest';
import rehypeBase from '../src/lib/rehype-base.mjs';

describe('base path rehype plugin', () => {
  it('prefixes root-relative images and links', () => {
    const tree = {
      type: 'root',
      children: [
        { type: 'element', tagName: 'img', properties: { src: '/media/demo.png' }, children: [] },
        { type: 'element', tagName: 'a', properties: { href: '/course/' }, children: [] },
      ],
    };
    rehypeBase({ base: '/embodied-ai-lab' })(tree);
    expect(tree.children[0].properties.src).toBe('/embodied-ai-lab/media/demo.png');
    expect(tree.children[1].properties.href).toBe('/embodied-ai-lab/course/');
  });

  it('leaves links untouched without a base path', () => {
    const tree = {
      type: 'root',
      children: [{ type: 'element', tagName: 'img', properties: { src: '/media/demo.png' }, children: [] }],
    };
    rehypeBase({ base: '' })(tree);
    expect(tree.children[0].properties.src).toBe('/media/demo.png');
  });
});
