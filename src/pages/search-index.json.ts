import type { APIRoute } from 'astro';
import {
  lessonSlug,
  publishedCases,
  publishedChapters,
  publishedCourses,
  publishedLessons,
} from '../lib/content';

export const prerender = true;

export const GET: APIRoute = async () => {
  const [courses, chapters, lessons, cases] = await Promise.all([
    publishedCourses(),
    publishedChapters(),
    publishedLessons(),
    publishedCases(),
  ]);

  const chapterNames = new Map(chapters.map((chapter) => [chapter.id, chapter.data.title]));
  const courseNames = new Map(courses.map((course) => [course.id, course.data.title]));
  const courseByChapter = new Map(chapters.map((chapter) => [chapter.id, chapter.data.course]));

  const entries = [
    ...courses.map((course) => ({
      id: `course-${course.id}`,
      type: 'course' as const,
      title: course.data.title,
      summary: course.data.summary,
      href: `/courses/${course.id}/`,
      keywords: [course.data.subtitle, course.data.audience, ...course.data.outcomes],
      headings: [],
    })),
    ...chapters.map((chapter) => ({
      id: `chapter-${chapter.id}`,
      type: 'chapter' as const,
      title: chapter.data.title,
      chapter: courseNames.get(chapter.data.course) || chapter.data.course,
      summary: chapter.data.summary,
      href: `/courses/${chapter.data.course}/${chapter.id}/`,
      keywords: [chapter.data.subtitle, courseNames.get(chapter.data.course) || '', ...chapter.data.objectives],
    })),
    ...lessons.map((lesson) => {
      const headings = [...(lesson.body || '').matchAll(/^#{2,3}\s+(.+)$/gm)].map((match) => match[1].trim());
      return {
        id: `lesson-${lesson.id}`,
        type: 'lesson' as const,
        title: lesson.data.title,
        chapter: chapterNames.get(lesson.data.chapter) || lesson.data.chapter,
        summary: lesson.data.summary,
        href: `/courses/${courseByChapter.get(lesson.data.chapter) || 'foundations'}/${lesson.data.chapter}/${lessonSlug(lesson)}/`,
        keywords: [
          ...lesson.data.keywords,
          courseNames.get(courseByChapter.get(lesson.data.chapter) || 'foundations') || '',
        ],
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
    ...[
      ['PID 闭环控制', '调整 Kp、Ki、Kd，观察超调、调节时间与稳态误差。', ['PID', '控制', '闭环']],
      ['二连杆逆运动学', '拖动足端目标，观察髋膝关节如何协同求解。', ['IK', '运动学', '二连杆']],
      ['一维 Kalman 滤波', '比较过程噪声与测量噪声对估计平滑度的影响。', ['Kalman', '估计', '滤波']],
      ['PPO 裁剪目标', '调整 ε 观察策略更新允许范围。', ['PPO', '强化学习', '策略']],
      ['MPC 滚动优化', '调整预测时域与权重，观察约束下的预测轨迹。', ['MPC', '最优控制', '预测']],
      ['A* 网格规划', '拖拽起终点并调节启发式权重，观察 open/closed 集合。', ['A*', '规划', '启发式']],
    ].map(([title, summary, keywords], index) => ({
      id: `lab-${index + 1}`,
      type: 'lab' as const,
      title: String(title),
      summary: String(summary),
      href: `/algorithms/#lab-${index + 1}`,
      keywords: keywords as string[],
      headings: [],
    })),
  ];

  return new Response(JSON.stringify(entries), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
