import type { APIRoute } from 'astro';
import { publishedCases, publishedChapters, publishedLessons, lessonSlug } from '../lib/content';

export const prerender = true;

export const GET: APIRoute = async () => {
  const [chapters, lessons, cases] = await Promise.all([
    publishedChapters(),
    publishedLessons(),
    publishedCases(),
  ]);

  const chapterNames = new Map(chapters.map((chapter) => [chapter.id, chapter.data.title]));

  const entries = [
    ...chapters.map((chapter) => ({
      id: `chapter-${chapter.id}`,
      type: 'chapter' as const,
      title: chapter.data.title,
      summary: chapter.data.summary,
      href: `/course/${chapter.id}/`,
      keywords: [chapter.data.subtitle, ...chapter.data.objectives],
    })),
    ...lessons.map((lesson) => {
      const headings = [...(lesson.body || '').matchAll(/^#{2,3}\s+(.+)$/gm)].map((match) => match[1].trim());
      return {
        id: `lesson-${lesson.id}`,
        type: 'lesson' as const,
        title: lesson.data.title,
        chapter: chapterNames.get(lesson.data.chapter) || lesson.data.chapter,
        summary: lesson.data.summary,
        href: `/course/${lesson.data.chapter}/${lessonSlug(lesson)}/`,
        keywords: lesson.data.keywords,
        headings,
      };
    }),
    ...cases.map((item) => ({
      id: `case-${item.id}`,
      type: 'case' as const,
      title: item.data.title,
      chapter: chapterNames.get(item.data.chapter) || item.data.chapter,
      summary: item.data.summary,
      href: `/cases/${item.id}/`,
      keywords: item.data.objectives,
    })),
  ];

  return new Response(JSON.stringify(entries), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
