import { parse, stringify } from 'yaml';

export type ParsedMarkdown = {
  data: Record<string, unknown>;
  body: string;
};

export function parseMarkdown(raw: string): ParsedMarkdown {
  const normalized = raw.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) {
    return { data: {}, body: normalized };
  }
  const end = normalized.indexOf('\n---\n', 4);
  if (end === -1) {
    throw new Error('Frontmatter 未闭合：缺少结束的 ---');
  }
  const frontmatter = normalized.slice(4, end);
  const body = normalized.slice(end + 5);
  const data = (parse(frontmatter) || {}) as Record<string, unknown>;
  return { data, body };
}

export function serializeMarkdown(data: Record<string, unknown>, body: string) {
  const yaml = stringify(data, { lineWidth: 0 }).trimEnd();
  return `---\n${yaml}\n---\n\n${body.replace(/^\n+/, '')}`;
}

export type ContentKind = 'chapter' | 'lesson' | 'quiz' | 'case';

export function kindFromPath(path: string): ContentKind | null {
  if (path.startsWith('src/content/chapters/')) return 'chapter';
  if (path.startsWith('src/content/lessons/')) return 'lesson';
  if (path.startsWith('src/content/quizzes/')) return 'quiz';
  if (path.startsWith('src/content/cases/')) return 'case';
  return null;
}

export function lessonIdFromQuizPath(path: string) {
  return path
    .replace(/^src\/content\/quizzes\//, '')
    .replace(/\.json$/i, '');
}

export function quizPathForLesson(path: string) {
  return path
    .replace(/^src\/content\/lessons\//, 'src/content/quizzes/')
    .replace(/\.mdx?$/i, '.json');
}

export function filenameFromPath(path: string) {
  return path.split('/').pop() || path;
}
