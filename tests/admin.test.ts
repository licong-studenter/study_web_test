import { describe, expect, it } from 'vitest';
import {
  decodeBase64Utf8,
  encodeBase64Utf8,
} from '../src/lib/admin/github';
import {
  parseMarkdown,
  serializeMarkdown,
  lessonIdFromQuizPath,
  quizPathForLesson,
} from '../src/lib/admin/frontmatter';

describe('github base64 helpers', () => {
  it('round-trips Chinese and emoji', () => {
    const text = '具身智能 · 12 DOF · 🤖\n第二行';
    expect(decodeBase64Utf8(encodeBase64Utf8(text))).toBe(text);
  });

  it('round-trips a large document', () => {
    const text = '感知—决策—执行—学习\n'.repeat(20_000);
    expect(decodeBase64Utf8(encodeBase64Utf8(text))).toBe(text);
  });
});

describe('frontmatter', () => {
  it('parses and serialises MDX frontmatter', () => {
    const raw = `---\ntitle: 测试\norder: 2\nobjectives:\n  - 目标一\n  - 目标二\n---\n\n## 正文\n`;
    const parsed = parseMarkdown(raw);
    expect(parsed.data.title).toBe('测试');
    expect(parsed.data.objectives).toEqual(['目标一', '目标二']);
    const again = parseMarkdown(serializeMarkdown(parsed.data, parsed.body));
    expect(again.data.title).toBe('测试');
    expect(again.body.trim()).toContain('## 正文');
  });

  it('maps lesson and quiz paths', () => {
    const lesson = 'src/content/lessons/foundations/1-from-ai-to-embodied.mdx';
    const quiz = 'src/content/quizzes/foundations/1-from-ai-to-embodied.json';
    expect(quizPathForLesson(lesson)).toBe(quiz);
    expect(lessonIdFromQuizPath(quiz)).toBe('foundations/1-from-ai-to-embodied');
  });

  it('rejects unclosed frontmatter', () => {
    expect(() => parseMarkdown('---\ntitle: 缺结束\n')).toThrow();
  });
});

