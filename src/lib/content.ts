import { getCollection, type CollectionEntry } from 'astro:content';

export type Chapter = CollectionEntry<'chapters'>;
export type Lesson = CollectionEntry<'lessons'>;
export type Case = CollectionEntry<'cases'>;

export function chapterSlug(chapter: Chapter) {
  return chapter.id;
}

export function lessonSlug(lesson: Lesson) {
  return lesson.id.split('/').slice(1).join('/');
}

export function lessonChapter(lesson: Lesson) {
  return lesson.data.chapter;
}

export async function publishedChapters() {
  const items = await getCollection('chapters', ({ data }) => !data.draft);
  return items.sort((a, b) => a.data.order - b.data.order);
}

export async function publishedLessons() {
  const items = await getCollection('lessons', ({ data }) => !data.draft);
  return items.sort((a, b) => {
    if (a.data.chapter !== b.data.chapter) return a.data.chapter.localeCompare(b.data.chapter);
    return a.data.order - b.data.order;
  });
}

export async function publishedCases() {
  const items = await getCollection('cases', ({ data }) => !data.draft);
  return items.sort((a, b) => a.data.order - b.data.order);
}

export async function lessonsForChapter(chapter: string) {
  return (await publishedLessons())
    .filter((lesson) => lesson.data.chapter === chapter)
    .sort((a, b) => a.data.order - b.data.order);
}
