import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseMarkdown, kindFromPath } from '../src/lib/admin/frontmatter';

const ROOT = process.cwd();

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const chapterFiles = walk(join(ROOT, 'src/content/chapters')).filter((file) => file.endsWith('.mdx'));
const lessonFiles = walk(join(ROOT, 'src/content/lessons')).filter((file) => file.endsWith('.mdx'));
const quizFiles = walk(join(ROOT, 'src/content/quizzes')).filter((file) => file.endsWith('.json'));
const caseFiles = walk(join(ROOT, 'src/content/cases')).filter((file) => file.endsWith('.mdx'));
const courseFiles = walk(join(ROOT, 'src/content/courses')).filter((file) => file.endsWith('.mdx'));

describe('content inventory', () => {
  it('ships 4 courses, 20 chapters, 60 lessons, 60 quizzes and 8 labs', () => {
    expect(courseFiles).toHaveLength(4);
    expect(chapterFiles).toHaveLength(20);
    expect(lessonFiles).toHaveLength(60);
    expect(quizFiles).toHaveLength(60);
    expect(caseFiles).toHaveLength(8);
  });

  it('has unique chapter order within each course and globally unique slugs', () => {
    const courses = new Set(
      courseFiles.map((file) => {
        const { data } = parseMarkdown(readFileSync(file, 'utf8'));
        expect(String(data.title).length).toBeGreaterThan(2);
        expect(Array.isArray(data.outcomes)).toBe(true);
        return basename(file, '.mdx');
      }),
    );
    expect(courses.size).toBe(4);
    const chapters = chapterFiles.map((file) => {
      const { data } = parseMarkdown(readFileSync(file, 'utf8'));
      return {
        slug: basename(file, '.mdx'),
        course: String(data.course),
        order: Number(data.order),
        title: data.title,
      };
    });
    for (const chapter of chapters) expect(courses.has(chapter.course), chapter.slug).toBe(true);
    const slugs = chapters.map((chapter) => chapter.slug);
    expect(new Set(slugs).size).toBe(chapters.length);
    for (const course of courses) {
      const orders = chapters.filter((chapter) => chapter.course === course).map((chapter) => chapter.order);
      expect(new Set(orders).size, course).toBe(orders.length);
    }
    for (const chapter of chapters) {
      expect(chapter.title).toBeTruthy();
      expect(chapter.order).toBeGreaterThan(0);
    }
  });

  it('has three ordered lessons per chapter with matching quizzes', () => {
    const chapters = chapterFiles.map((file) => basename(file, '.mdx'));
    for (const chapter of chapters) {
      const lessons = lessonFiles.filter((file) =>
        relative(join(ROOT, 'src/content/lessons'), file).split(sep).join('/').startsWith(`${chapter}/`),
      );
      expect(lessons, chapter).toHaveLength(3);
      for (const lesson of lessons) {
        const { data } = parseMarkdown(readFileSync(lesson, 'utf8'));
        expect(data.chapter).toBe(chapter);
        expect(Number(data.order)).toBeGreaterThanOrEqual(1);
        const relativeLesson = relative(join(ROOT, 'src/content/lessons'), lesson).replace(/\.mdx$/, '.json');
        const quizPath = join(ROOT, 'src/content/quizzes', relativeLesson);
        expect(quizFiles, `missing quiz for ${lesson}`).toContain(quizPath);
      }
    }
  });

  it('has valid quizzes with exactly three explained questions', () => {
    for (const file of quizFiles) {
      const data = JSON.parse(readFileSync(file, 'utf8')) as {
        lesson: string;
        questions: Array<{ stem: string; options: string[]; answer: number; explanation: string }>;
      };
      expect(data.lesson, file).toBeTruthy();
      expect(data.questions, file).toHaveLength(3);
      for (const question of data.questions) {
        expect(question.stem.trim().length).toBeGreaterThan(3);
        expect(question.options).toHaveLength(4);
        expect(question.options.every((option) => option.trim().length > 0)).toBe(true);
        expect(question.answer).toBeGreaterThanOrEqual(0);
        expect(question.answer).toBeLessThan(4);
        expect(question.explanation.trim().length).toBeGreaterThan(5);
      }
    }
  });

  it('has valid lab metadata and chapter references', () => {
    const chapters = new Set(chapterFiles.map((file) => basename(file, '.mdx')));
    for (const file of caseFiles) {
      const { data } = parseMarkdown(readFileSync(file, 'utf8'));
      expect(chapters.has(String(data.chapter)), file).toBe(true);
      expect(String(data.title).length).toBeGreaterThan(2);
      expect(Array.isArray(data.objectives)).toBe(true);
      expect(Array.isArray(data.repos)).toBe(true);
    }
  });

  it('recognises content paths used by the admin', () => {
    expect(kindFromPath('src/content/chapters/foundations.mdx')).toBe('chapter');
    expect(kindFromPath('src/content/courses/foundations.mdx')).toBe('course');
    expect(kindFromPath('src/content/lessons/foundations/1-from-ai-to-embodied.mdx')).toBe('lesson');
    expect(kindFromPath('src/content/quizzes/foundations/1-from-ai-to-embodied.json')).toBe('quiz');
    expect(kindFromPath('src/content/cases/lite3-first-boot.mdx')).toBe('case');
  });
});
