import { getCollection, type CollectionEntry } from 'astro:content';

export type Course = CollectionEntry<'courses'>;
export type Chapter = CollectionEntry<'chapters'>;
export type Lesson = CollectionEntry<'lessons'>;
export type Case = CollectionEntry<'cases'>;
export type CourseSlug = Chapter['data']['course'];

export const COURSE_ORDER: CourseSlug[] = [
  'foundations',
  'automatic-control',
  'motion-control',
  'embodied-algorithms',
];

export function chapterSlug(chapter: Chapter) {
  return chapter.id;
}

export function lessonSlug(lesson: Lesson) {
  return lesson.id.split('/').slice(1).join('/');
}

export function lessonChapter(lesson: Lesson) {
  return lesson.data.chapter;
}

export async function publishedCourses() {
  const items = await getCollection('courses', ({ data }) => !data.draft);
  return items.sort((a, b) => a.data.order - b.data.order);
}

export async function publishedChapters(course?: CourseSlug) {
  const items = await getCollection('chapters', ({ data }) => !data.draft);
  return items
    .filter((chapter) => !course || chapter.data.course === course)
    .sort((a, b) => {
      if (!course) {
        const courseDelta = COURSE_ORDER.indexOf(a.data.course) - COURSE_ORDER.indexOf(b.data.course);
        if (courseDelta !== 0) return courseDelta;
      }
      return a.data.order - b.data.order;
    });
}

export async function publishedLessons(course?: CourseSlug) {
  const items = await getCollection('lessons', ({ data }) => !data.draft);
  if (course) {
    const chapterIds = new Set((await publishedChapters(course)).map((chapter) => chapter.id));
    return items
      .filter((lesson) => chapterIds.has(lesson.data.chapter))
      .sort((a, b) => a.data.order - b.data.order);
  }
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

export async function chaptersForCourse(course: CourseSlug) {
  return publishedChapters(course);
}

export async function lessonsForCourse(course: CourseSlug) {
  return publishedLessons(course);
}
