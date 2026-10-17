import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const source = await readFile(new URL('../public/og.svg', import.meta.url));
await sharp(source)
  .png({ compressionLevel: 9 })
  .toFile(fileURLToPath(new URL('../public/og.png', import.meta.url)));
console.log('Generated public/og.png (1200×630)');
