const base = process.argv[2] || 'http://localhost:4321';
const origin = new URL(base).origin;
const seen = new Set(['/']);
const queue = ['/'];
const broken = [];

while (queue.length > 0 && seen.size < 150) {
  const path = queue.shift();
  let response;
  try {
    response = await fetch(new URL(path, origin), { redirect: 'follow' });
  } catch (error) {
    broken.push([path, String(error)]);
    continue;
  }
  if (response.status >= 400) {
    broken.push([path, response.status]);
    continue;
  }
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/html')) continue;
  const html = await response.text();
  for (const match of html.matchAll(/href="([^"]+)"/g)) {
    const href = match[1];
    if (!href.startsWith('/') || href.startsWith('//')) continue;
    const url = new URL(href, origin);
    if (url.origin !== origin) continue;
    if (seen.has(url.pathname)) continue;
    seen.add(url.pathname);
    queue.push(url.pathname);
  }
}

console.log(`Checked ${seen.size} internal pages from ${base}`);
if (broken.length > 0) {
  console.error('Broken links:');
  for (const [path, status] of broken) console.error(`- ${path} -> ${status}`);
  process.exitCode = 1;
} else {
  console.log('No broken internal links.');
}
