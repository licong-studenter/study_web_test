import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const chapterFields = {
  course: z.enum(['foundations', 'automatic-control', 'motion-control', 'embodied-algorithms']),
  order: z.number().int().positive(),
  title: z.string(),
  subtitle: z.string(),
  summary: z.string(),
  duration: z.string(),
  level: z.enum(['入门', '进阶', '实战']),
  objectives: z.array(z.string()).min(3),
  prerequisites: z.array(z.string()).default([]),
  accent: z.string().default('#FF6A2B'),
  case: z.string().optional(),
  draft: z.boolean().default(false),
};

const courses = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/courses' }),
  schema: z.object({
    order: z.number().int().positive(),
    title: z.string(),
    subtitle: z.string(),
    summary: z.string(),
    audience: z.string(),
    duration: z.string(),
    outcomes: z.array(z.string()).min(3),
    accent: z.string(),
    book: z.string().optional(),
    references: z
      .array(
        z.object({
          label: z.string(),
          url: z.url(),
          meta: z.string().default(''),
        }),
      )
      .default([]),
    draft: z.boolean().default(false),
  }),
});

const chapters = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/chapters' }),
  schema: z.object(chapterFields),
});

const lessons = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/lessons' }),
  schema: z.object({
    chapter: z.string(),
    order: z.number().int().positive(),
    title: z.string(),
    summary: z.string(),
    duration: z.string(),
    objectives: z.array(z.string()).min(2),
    keywords: z.array(z.string()).min(2),
    draft: z.boolean().default(false),
  }),
});

const answerSchema = z.object({
  id: z.string(),
  stem: z.string(),
  options: z.array(z.string()).length(4),
  answer: z.number().int().min(0).max(3),
  explanation: z.string(),
});

const quizzes = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/quizzes' }),
  schema: z.object({
    lesson: z.string(),
    questions: z.array(answerSchema).length(3),
  }),
});

const cases = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/cases' }),
  schema: z.object({
    chapter: z.string(),
    order: z.number().int().positive(),
    title: z.string(),
    summary: z.string(),
    difficulty: z.enum(['基础', '进阶', '综合']),
    hardware: z.string(),
    duration: z.string(),
    objectives: z.array(z.string()).min(2),
    deliverables: z.array(z.string()).min(1),
    repos: z
      .array(
        z.object({
          label: z.string(),
          url: z.url(),
          meta: z.string().default(''),
        }),
      )
      .default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { courses, chapters, lessons, quizzes, cases };
