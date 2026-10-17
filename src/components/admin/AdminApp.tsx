import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import {
  GitHubError,
  deleteFile,
  getFile,
  getLatestCommit,
  getLatestRun,
  getRepo,
  getTree,
  putFile,
  uploadMedia,
  validateConfig,
  type RepoConfig,
  type RepoInfo,
  type TreeEntry,
  type WorkflowRun,
} from '../../lib/admin/github';
import {
  filenameFromPath,
  kindFromPath,
  lessonIdFromQuizPath,
  parseMarkdown,
  quizPathForLesson,
  serializeMarkdown,
  type ContentKind,
} from '../../lib/admin/frontmatter';

type QuizQuestion = {
  id: string;
  stem: string;
  options: string[];
  answer: number;
  explanation: string;
};

type QuizData = {
  lesson: string;
  questions: QuizQuestion[];
};

type Status = { type: 'ok' | 'error' | 'info'; message: string } | null;
type View = 'content' | 'meta' | 'quiz' | 'preview';

type FieldDef = {
  key: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'list' | 'select' | 'checkbox' | 'repos';
  options?: string[];
  placeholder?: string;
  full?: boolean;
};

const SETTINGS_KEY = 'eailab.admin.settings';
const TOKEN_KEY = 'eailab.admin.token';
const REMEMBER_KEY = 'eailab.admin.token.remembered';
const DRAFT_PREFIX = 'eailab.admin.draft.';

const META_FIELDS: Record<Exclude<ContentKind, 'quiz'>, FieldDef[]> = {
  chapter: [
    { key: 'order', label: '章节序号', type: 'number' },
    { key: 'level', label: '难度', type: 'select', options: ['入门', '进阶', '实战'] },
    { key: 'title', label: '标题', type: 'text', full: true },
    { key: 'subtitle', label: '英文副标题', type: 'text', full: true },
    { key: 'summary', label: '摘要', type: 'textarea', full: true },
    { key: 'duration', label: '预计时长', type: 'text' },
    { key: 'case', label: '配套实训 slug', type: 'text' },
    { key: 'objectives', label: '学习目标（每行一条）', type: 'list', full: true },
    { key: 'prerequisites', label: '前置知识（每行一条）', type: 'list', full: true },
    { key: 'draft', label: '保存为草稿', type: 'checkbox' },
  ],
  lesson: [
    { key: 'chapter', label: '所属章节 slug', type: 'text' },
    { key: 'order', label: '课时序号', type: 'number' },
    { key: 'title', label: '标题', type: 'text', full: true },
    { key: 'summary', label: '摘要', type: 'textarea', full: true },
    { key: 'duration', label: '预计时长', type: 'text' },
    { key: 'objectives', label: '学习目标（每行一条）', type: 'list', full: true },
    { key: 'keywords', label: '关键词（每行一条）', type: 'list', full: true },
    { key: 'draft', label: '保存为草稿', type: 'checkbox' },
  ],
  case: [
    { key: 'chapter', label: '所属章节 slug', type: 'text' },
    { key: 'order', label: '项目序号', type: 'number' },
    { key: 'difficulty', label: '难度', type: 'select', options: ['基础', '进阶', '综合'] },
    { key: 'title', label: '标题', type: 'text', full: true },
    { key: 'summary', label: '摘要', type: 'textarea', full: true },
    { key: 'hardware', label: '硬件要求', type: 'text' },
    { key: 'duration', label: '预计时长', type: 'text' },
    { key: 'objectives', label: '项目目标（每行一条）', type: 'list', full: true },
    { key: 'deliverables', label: '交付物（每行一条）', type: 'list', full: true },
    { key: 'repos', label: '仓库（每行：名称 | URL | 说明）', type: 'repos', full: true },
    { key: 'draft', label: '保存为草稿', type: 'checkbox' },
  ],
};

const KIND_LABEL: Record<ContentKind, string> = {
  chapter: '章节',
  lesson: '课时',
  quiz: '测验',
  case: '实训',
};

const emptyQuestion = (index: number): QuizQuestion => ({
  id: `q${index + 1}`,
  stem: '',
  options: ['', '', '', ''],
  answer: 0,
  explanation: '',
});

function initialSettings() {
  if (typeof window === 'undefined') {
    return { owner: '', repo: '', branch: 'main' };
  }
  const host = window.location.hostname;
  const owner = host.endsWith('.github.io') ? host.replace('.github.io', '') : '';
  const firstPath = window.location.pathname.split('/').filter(Boolean)[0] || '';
  const repo = owner ? firstPath || `${owner}.github.io` : '';
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
    if (saved?.owner && saved?.repo) return saved;
  } catch {
    // ignore malformed settings
  }
  return { owner, repo, branch: 'main' };
}

function readInitialToken() {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(REMEMBER_KEY) || '';
}

function asArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function asString(value: unknown): string {
  return value === undefined || value === null ? '' : String(value);
}

function typeFromPath(path: string): ContentKind | null {
  return kindFromPath(path);
}

function messageForError(error: unknown) {
  if (error instanceof GitHubError) {
    if (error.status === 409) return '远端文件已更新（409 冲突）。请重新载入最新内容后再提交。';
    if (error.status === 403) return '权限不足或触发速率限制。请确认 Token 拥有 Contents: Read and write 权限。';
    if (error.status === 401) return 'Token 无效或已过期，请重新登录。';
    return `${error.message}${error.body ? `：${error.body.slice(0, 160)}` : ''}`;
  }
  return error instanceof Error ? error.message : String(error);
}

function makeTemplate(kind: Exclude<ContentKind, 'quiz'>, options: { title: string; chapter: string; order: number; slug: string }) {
  const { title, chapter, order, slug } = options;
  if (kind === 'chapter') {
    return `---
order: ${order}
title: ${title}
subtitle: ${slug.toUpperCase()}
summary: 在这里填写章节摘要。
duration: 45 分钟
level: 入门
objectives:
  - 在这里填写学习目标
prerequisites: []
case: ${slug}
draft: true
---

在这里写章节导览。可以先用一段场景引入，再说明本章的结构与学习建议。
`;
  }
  if (kind === 'lesson') {
    return `---
chapter: ${chapter}
order: ${order}
title: ${title}
summary: 在这里填写本节摘要。
duration: 15 分钟
objectives:
  - 在这里填写学习目标
keywords:
  - 关键词
draft: true
---

## 1. 场景导入

用一个具体问题或场景开始本节。

## 2. 核心概念

在这里展开讲解，可使用公式、代码、表格与图示。

<Callout type="engineering">
在这里写工程提示。
</Callout>

## 本节小结

- 总结要点一。
- 总结要点二。
`;
  }
  return `---
chapter: ${chapter}
order: ${order}
title: ${title}
summary: 在这里填写实训摘要。
difficulty: 基础
hardware: 仿真可完成
duration: 90 分钟
objectives:
  - 在这里填写项目目标
deliverables:
  - 实验记录
repos: []
draft: true
---

## 前置条件

在这里列出所需章节、环境与硬件。

## 步骤

1. 第一步。
2. 第二步。

## 预期结果

在这里写验收标准。

> 安全提示：涉及真机时，必须确认急停与安全边界。
`;
}

function LoginView({
  onConnect,
  busy,
  error,
}: {
  onConnect: (config: RepoConfig, remember: boolean) => void;
  busy: boolean;
  error: string;
}) {
  const settings = useMemo(initialSettings, []);
  const [owner, setOwner] = useState(settings.owner);
  const [repo, setRepo] = useState(settings.repo);
  const [branch, setBranch] = useState(settings.branch || 'main');
  const [token, setToken] = useState(readInitialToken());
  const [remember, setRemember] = useState(false);

  return (
    <div className="admin-login">
      <span className="eyebrow">ADMIN / GITHUB CMS</span>
      <h1>登录内容管理</h1>
      <p>
        使用细粒度 GitHub Token 直接读写本站仓库。Token 只保存在当前浏览器会话中，
        不会写入代码、日志或提交历史。
      </p>
      <div className="admin-alert">
        权限要求：仅选择本站仓库，授予 <strong>Contents: Read and write</strong>；如需查看部署状态，再加
        <strong> Actions: Read</strong>。
      </div>
      <div className="admin-meta-grid">
        <div className="field">
          <label htmlFor="admin-owner">Owner</label>
          <input id="admin-owner" value={owner} onChange={(event) => setOwner(event.target.value)} placeholder="github 用户名" />
        </div>
        <div className="field">
          <label htmlFor="admin-repo">Repository</label>
          <input id="admin-repo" value={repo} onChange={(event) => setRepo(event.target.value)} placeholder="embodied-ai-lab" />
        </div>
        <div className="field">
          <label htmlFor="admin-branch">Branch</label>
          <input id="admin-branch" value={branch} onChange={(event) => setBranch(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="admin-token">Fine-grained token</label>
          <input
            id="admin-token"
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            autoComplete="off"
            placeholder="github_pat_..."
          />
        </div>
      </div>
      <label className="admin-check">
        <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
        <span>
          记住本机。开启后 Token 会存入 localStorage，任何能使用这台电脑浏览器的人都可能读取它。
          共用电脑请不要勾选。
        </span>
      </label>
      {error && <div className="admin-alert">{error}</div>}
      <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
        <button
          className="btn btn-primary"
          type="button"
          disabled={busy}
          onClick={() => onConnect({ owner: owner.trim(), repo: repo.trim(), branch: branch.trim() || 'main', token: token.trim() }, remember)}
        >
          {busy ? '验证中…' : '连接仓库'}
        </button>
        <a
          className="btn btn-ghost"
          href="https://github.com/settings/personal-access-tokens/new"
          target="_blank"
          rel="noreferrer"
        >
          创建 Token
        </a>
      </div>
      <p className="hint" style={{ marginTop: '18px' }}>
        建议 Token 有效期设置为 30–90 天，并仅授权这一个仓库。发布后 GitHub Actions 会自动重建，
        通常 1–3 分钟生效。
      </p>
    </div>
  );
}

export default function AdminApp() {
  const [config, setConfig] = useState<RepoConfig | null>(null);
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [files, setFiles] = useState<TreeEntry[]>([]);
  const [filter, setFilter] = useState('');
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedSha, setSelectedSha] = useState('');
  const [kind, setKind] = useState<ContentKind | null>(null);
  const [meta, setMeta] = useState<Record<string, unknown>>({});
  const [body, setBody] = useState('');
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [quizSha, setQuizSha] = useState('');
  const [view, setView] = useState<View>('content');
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [commit, setCommit] = useState<{ sha: string; url: string } | null>(null);
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newType, setNewType] = useState<Exclude<ContentKind, 'quiz'>>('lesson');
  const [newChapter, setNewChapter] = useState('foundations');
  const [newOrder, setNewOrder] = useState(4);
  const [newSlug, setNewSlug] = useState('new-lesson');
  const [newTitle, setNewTitle] = useState('');
  const [deleteText, setDeleteText] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [draftFound, setDraftFound] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyConfig = useCallback(async (next: RepoConfig) => {
    validateConfig(next);
    setBusy(true);
    setStatus(null);
    try {
      const info = await getRepo(next);
      if (info.permissions && info.permissions.push === false) {
        throw new Error('当前 Token 没有写入权限，请授予 Contents: Read and write。');
      }
      setConfig(next);
      setRepoInfo(info);
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({ owner: next.owner, repo: next.repo, branch: next.branch }),
      );
      setStatus({ type: 'ok', message: `已连接 ${info.full_name}` });
      const tree = await getTree(next);
      setFiles(tree.tree.filter((item) => item.type === 'blob' && typeFromPath(item.path)));
      try {
        setRun(await getLatestRun(next));
      } catch {
        setRun(null);
      }
    } catch (error) {
      setConfig(null);
      setStatus({ type: 'error', message: messageForError(error) });
      throw error;
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const token = readInitialToken();
    if (!token) return;
    const settings = initialSettings();
    if (!settings.owner || !settings.repo) return;
    applyConfig({ ...settings, token }).catch(() => {});
  }, [applyConfig]);

  useEffect(() => {
    if (!dirty || !selectedPath) return;
    const timer = window.setTimeout(() => {
      localStorage.setItem(
        `${DRAFT_PREFIX}${selectedPath}`,
        JSON.stringify({ meta, body, quiz, savedAt: new Date().toISOString() }),
      );
    }, 900);
    return () => window.clearTimeout(timer);
  }, [dirty, selectedPath, meta, body, quiz]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const groups = useMemo(() => {
    const visible = files.filter((file) => file.path.toLowerCase().includes(filter.toLowerCase()));
    return (['chapter', 'lesson', 'quiz', 'case'] as ContentKind[])
      .map((item) => ({
        kind: item,
        files: visible.filter((file) => typeFromPath(file.path) === item),
      }))
      .filter((group) => group.files.length > 0);
  }, [files, filter]);

  const title = asString(meta.title) || (selectedPath ? filenameFromPath(selectedPath) : '未选择文件');

  async function refreshFiles(nextConfig = config) {
    if (!nextConfig) return;
    const tree = await getTree(nextConfig);
    setFiles(tree.tree.filter((item) => item.type === 'blob' && typeFromPath(item.path)));
  }

  async function openFile(path: string) {
    if (!config) return;
    if (dirty && !window.confirm('当前文件有未发布的修改，确定切换吗？')) return;
    setBusy(true);
    setStatus(null);
    setDraftFound(null);
    try {
      const file = await getFile(config, path);
      const nextKind = typeFromPath(path);
      setSelectedPath(path);
      setSelectedSha(file.sha);
      setKind(nextKind);
      setCommit(null);
      setShowDelete(false);
      setDeleteText('');
      if (nextKind === 'quiz') {
        const data = JSON.parse(file.content) as QuizData;
        setQuiz(data);
        setMeta({});
        setBody('');
        setView('quiz');
      } else {
        const parsed = parseMarkdown(file.content);
        setMeta(parsed.data);
        setBody(parsed.body);
        setView('content');
        setQuiz(null);
        setQuizSha('');
        if (nextKind === 'lesson') {
          const quizPath = quizPathForLesson(path);
          try {
            const quizFile = await getFile(config, quizPath);
            setQuiz(JSON.parse(quizFile.content) as QuizData);
            setQuizSha(quizFile.sha);
          } catch (error) {
            if (!(error instanceof GitHubError) || error.status !== 404) throw error;
          }
        }
      }
      setDirty(false);
      try {
        const latest = await getLatestCommit(config, path);
        if (latest) setCommit({ sha: latest.sha, url: `https://github.com/${config.owner}/${config.repo}/commit/${latest.sha}` });
      } catch {
        setCommit(null);
      }
      const localDraft = localStorage.getItem(`${DRAFT_PREFIX}${path}`);
      if (localDraft) setDraftFound(localDraft);
    } catch (error) {
      setStatus({ type: 'error', message: messageForError(error) });
    } finally {
      setBusy(false);
    }
  }

  function updateMeta(key: string, value: unknown) {
    setMeta((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }

  function restoreDraft() {
    if (!draftFound) return;
    try {
      const parsed = JSON.parse(draftFound) as {
        meta: Record<string, unknown>;
        body: string;
        quiz?: QuizData | null;
      };
      setMeta(parsed.meta);
      setBody(parsed.body);
      if (parsed.quiz) setQuiz(parsed.quiz);
      setDirty(true);
      setDraftFound(null);
      setStatus({ type: 'ok', message: '已恢复本地草稿' });
    } catch {
      setStatus({ type: 'error', message: '本地草稿损坏，无法恢复' });
    }
  }

  function validateForPublish(savingQuiz = kind === 'quiz') {
    if (savingQuiz) {
      if (!quiz) throw new Error('测验内容为空');
      if (quiz.questions.length !== 3) throw new Error('每节课必须恰好有 3 道题');
      for (const [index, question] of quiz.questions.entries()) {
        if (!question.stem.trim()) throw new Error(`第 ${index + 1} 题缺少题干`);
        if (question.options.some((option) => !option.trim())) throw new Error(`第 ${index + 1} 题选项不能为空`);
        if (!question.explanation.trim()) throw new Error(`第 ${index + 1} 题缺少解析`);
        if (question.answer < 0 || question.answer > 3) throw new Error(`第 ${index + 1} 题答案索引无效`);
      }
      return;
    }
    if (!asString(meta.title).trim()) throw new Error('标题不能为空');
    if (!Number(meta.order)) throw new Error('序号必须是正数');
    if (!asString(meta.summary).trim()) throw new Error('摘要不能为空');
    if (!asString(meta.duration).trim()) throw new Error('预计时长不能为空');
    if (kind === 'lesson' && !asString(meta.chapter).trim()) throw new Error('课时必须填写所属章节 slug');
    if (kind === 'chapter') {
      if (!asString(meta.subtitle).trim()) throw new Error('章节必须填写副标题');
      if (asArray(meta.objectives).length < 3) throw new Error('章节至少需要 3 条学习目标');
    }
    if (kind === 'lesson') {
      if (asArray(meta.objectives).length < 2) throw new Error('课时至少需要 2 条学习目标');
      if (asArray(meta.keywords).length < 2) throw new Error('课时至少需要 2 个关键词');
    }
    if (kind === 'case') {
      if (!asString(meta.chapter).trim()) throw new Error('实训必须填写所属章节 slug');
      if (asArray(meta.objectives).length < 2) throw new Error('实训至少需要 2 条项目目标');
      if (asArray(meta.deliverables).length < 1) throw new Error('实训至少需要 1 项交付物');
      const repos = Array.isArray(meta.repos) ? (meta.repos as Array<{ url?: string }>) : [];
      for (const repo of repos) {
        if (!repo.url || !/^https?:\/\//.test(repo.url)) throw new Error('仓库 URL 必须以 http:// 或 https:// 开头');
      }
    }
  }

  async function publish(target: 'current' | 'quiz' = 'current') {
    if (!config || !selectedPath || !kind) return;
    setBusy(true);
    setStatus(null);
    try {
      const savingQuiz = kind === 'quiz' || target === 'quiz';
      validateForPublish(savingQuiz);
      if (savingQuiz && !quiz) throw new Error('测验内容为空');
      const path = savingQuiz && kind === 'lesson' ? quizPathForLesson(selectedPath) : selectedPath;
      const content = savingQuiz
        ? `${JSON.stringify({ ...quiz, lesson: lessonIdFromQuizPath(path) }, null, 2)}\n`
        : serializeMarkdown(meta, body);
      const sha = savingQuiz && kind === 'lesson' ? quizSha : selectedSha;
      const label = asString(meta.title) || filenameFromPath(path);
      const message = `content: 更新《${label}》· ${new Date().toISOString().slice(0, 10)}`;
      const result = await putFile(config, path, content, message, sha || undefined);
      if (savingQuiz && kind === 'lesson') setQuizSha(result.content.sha);
      else setSelectedSha(result.content.sha);
      setCommit({ sha: result.commit.sha, url: result.commit.html_url });
      if (!(savingQuiz && kind === 'lesson')) {
        setDirty(false);
        localStorage.removeItem(`${DRAFT_PREFIX}${selectedPath}`);
        setDraftFound(null);
      }
      setStatus({ type: 'ok', message: '已提交到 GitHub，正在等待 Actions 重建…' });
      await refreshFiles(config);
      pollRun(config);
    } catch (error) {
      setStatus({ type: 'error', message: messageForError(error) });
    } finally {
      setBusy(false);
    }
  }

  function pollRun(nextConfig: RepoConfig) {
    let attempts = 0;
    const tick = async () => {
      attempts += 1;
      try {
        const latest = await getLatestRun(nextConfig);
        if (latest) setRun(latest);
      } catch {
        // Actions permission is optional
      }
      if (attempts < 6) window.setTimeout(tick, 8000);
    };
    window.setTimeout(tick, 4000);
  }

  async function removeCurrent() {
    if (!config || !selectedPath || !kind) return;
    if (deleteText.trim() !== title.trim()) {
      setStatus({ type: 'error', message: '请输入完整标题以确认删除' });
      return;
    }
    setBusy(true);
    try {
      await deleteFile(
        config,
        selectedPath,
        `content: 删除《${title}》`,
        selectedSha,
      );
      setStatus({ type: 'ok', message: '文件已删除，等待 Actions 重建' });
      setDirty(false);
      setSelectedPath(null);
      setKind(null);
      setShowDelete(false);
      await refreshFiles(config);
      pollRun(config);
    } catch (error) {
      setStatus({ type: 'error', message: messageForError(error) });
    } finally {
      setBusy(false);
    }
  }

  async function createContent() {
    if (!config) return;
    const slug = newSlug.trim().replace(/[^a-z0-9-]/gi, '-').toLowerCase();
    if (!slug || !newTitle.trim()) {
      setStatus({ type: 'error', message: '请填写标题与 slug' });
      return;
    }
    if (newType !== 'chapter' && !newChapter.trim()) {
      setStatus({ type: 'error', message: '请填写所属章节 slug' });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      let path = '';
      if (newType === 'chapter') path = `src/content/chapters/${slug}.mdx`;
      if (newType === 'lesson') path = `src/content/lessons/${newChapter}/${newOrder}-${slug}.mdx`;
      if (newType === 'case') path = `src/content/cases/${slug}.mdx`;
      const template = makeTemplate(newType, {
        title: newTitle.trim(),
        chapter: newChapter.trim(),
        order: newOrder,
        slug,
      });
      await putFile(config, path, template, `content: 新建《${newTitle.trim()}》`);
      if (newType === 'lesson') {
        const quizPath = quizPathForLesson(path);
        const quizData: QuizData = {
          lesson: lessonIdFromQuizPath(quizPath),
          questions: [emptyQuestion(0), emptyQuestion(1), emptyQuestion(2)],
        };
        await putFile(config, quizPath, `${JSON.stringify(quizData, null, 2)}\n`, `content: 新建《${newTitle.trim()}》测验`);
      }
      setShowNew(false);
      setStatus({ type: 'ok', message: '已创建文件，请补充正文与测验后发布' });
      await refreshFiles(config);
      await openFile(path);
    } catch (error) {
      setStatus({ type: 'error', message: messageForError(error) });
    } finally {
      setBusy(false);
    }
  }

  async function addMedia(file: File) {
    if (!config || !selectedPath) return;
    if (file.size > 2 * 1024 * 1024) {
      setStatus({ type: 'error', message: '图片请小于 2 MB' });
      return;
    }
    setBusy(true);
    try {
      const buffer = await file.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(buffer);
      for (let index = 0; index < bytes.length; index += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
      }
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
      const path = `public/media/${Date.now()}-${safeName}`;
      await uploadMedia(config, path, btoa(binary));
      const markdown = `\n![${file.name.replace(/\.[^.]+$/, '')}](/media/${path.split('/').pop()})\n`;
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const next = `${body.slice(0, start)}${markdown}${body.slice(start)}`;
        setBody(next);
      } else {
        setBody((current) => `${current}${markdown}`);
      }
      setDirty(true);
      setStatus({ type: 'ok', message: '图片已上传，请记得提交正文' });
    } catch (error) {
      setStatus({ type: 'error', message: messageForError(error) });
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REMEMBER_KEY);
    setConfig(null);
    setRepoInfo(null);
    setFiles([]);
    setSelectedPath(null);
    setStatus(null);
  }

  if (!config) {
    return (
      <LoginView
        busy={busy}
        error={status?.type === 'error' ? status.message : ''}
        onConnect={async (next, remember) => {
          try {
            await applyConfig(next);
            sessionStorage.setItem(TOKEN_KEY, next.token);
            if (remember) localStorage.setItem(REMEMBER_KEY, next.token);
            else localStorage.removeItem(REMEMBER_KEY);
          } catch {
            // status already set
          }
        }}
      />
    );
  }

  return (
    <div>
      <div className="admin-top">
        <div>
          <span className="eyebrow">CONTENT OPERATIONS</span>
          <h1>内容管理</h1>
          <p>
            {repoInfo?.full_name} · {config.branch} · {files.length} 个内容文件
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setShowNew((value) => !value)}>
            新建内容
          </button>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setShowSettings((value) => !value)}>
            设置
          </button>
          <a className="btn btn-ghost btn-sm" href={`https://github.com/${config.owner}/${config.repo}`} target="_blank" rel="noreferrer">
            打开仓库
          </a>
          <button className="btn btn-ghost btn-sm" type="button" onClick={logout}>
            退出
          </button>
        </div>
      </div>

      {status && <div className={`admin-alert${status.type === 'ok' ? ' ok' : ''}`}>{status.message}</div>}

      {showSettings && (
        <div className="admin-login" style={{ margin: '0 0 20px', width: '100%' }}>
          <h1 style={{ marginTop: 0, fontSize: '20px' }}>连接设置</h1>
          <p>修改仓库或 Token 后会重新验证权限。Token 默认只保存在会话存储中。</p>
          <SettingsForm
            config={config}
            onSave={async (next) => {
              await applyConfig(next);
              sessionStorage.setItem(TOKEN_KEY, next.token);
              setShowSettings(false);
            }}
            onClear={() => {
              logout();
              setShowSettings(false);
            }}
          />
        </div>
      )}

      {showNew && (
        <div className="admin-login" style={{ margin: '0 0 20px', width: '100%' }}>
          <h1 style={{ marginTop: 0, fontSize: '20px' }}>新建内容</h1>
          <div className="admin-meta-grid">
            <div className="field">
              <label>类型</label>
              <select value={newType} onChange={(event) => setNewType(event.target.value as Exclude<ContentKind, 'quiz'>)}>
                <option value="lesson">课时</option>
                <option value="chapter">章节</option>
                <option value="case">实训</option>
              </select>
            </div>
            <div className="field">
              <label>标题</label>
              <input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="新课时标题" />
            </div>
            {newType !== 'chapter' && (
              <div className="field">
                <label>所属章节 slug</label>
                <input value={newChapter} onChange={(event) => setNewChapter(event.target.value)} />
              </div>
            )}
            <div className="field">
              <label>序号</label>
              <input type="number" min={1} value={newOrder} onChange={(event) => setNewOrder(Number(event.target.value))} />
            </div>
            <div className="field full">
              <label>slug / 文件名</label>
              <input value={newSlug} onChange={(event) => setNewSlug(event.target.value)} placeholder="new-lesson" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button className="btn btn-primary btn-sm" type="button" disabled={busy} onClick={createContent}>
              创建
            </button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setShowNew(false)}>
              取消
            </button>
          </div>
        </div>
      )}

      {run && (
        <div className="admin-commit" style={{ marginBottom: '12px' }}>
          最近部署：{run.status}
          {run.conclusion ? ` / ${run.conclusion}` : ''} ·{' '}
          <a href={run.html_url} target="_blank" rel="noreferrer">
            查看 Actions
          </a>
        </div>
      )}

      <div className="admin-workspace">
        <aside className="admin-side">
          <div className="admin-side-head">
            <input
              className="admin-filter"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="筛选文件路径…"
            />
          </div>
          <div className="admin-file-list">
            {groups.map((group) => (
              <div key={group.kind}>
                <div className="admin-group-label">
                  {KIND_LABEL[group.kind]} · {group.files.length}
                </div>
                {group.files.map((file) => (
                  <button
                    key={file.path}
                    type="button"
                    className={`admin-file${selectedPath === file.path ? ' active' : ''}`}
                    onClick={() => openFile(file.path)}
                  >
                    {file.path
                      .replace(/^src\/content\//, '')
                      .replace(/\.(mdx|json)$/i, '')}
                  </button>
                ))}
              </div>
            ))}
            {groups.length === 0 && <div className="admin-empty">没有匹配的文件</div>}
          </div>
        </aside>

        <section className="admin-main">
          <div className="admin-toolbar">
            <span className="path">{selectedPath || '从左侧选择一个文件'}</span>
            {kind && <span className="chip">{KIND_LABEL[kind]}</span>}
            {typeof meta.draft === 'boolean' && (
              <span className={`chip${meta.draft ? '' : ' cyan'}`}>{meta.draft ? '草稿' : '已发布'}</span>
            )}
            {dirty && <span className="chip accent">未提交</span>}
          </div>

          {selectedPath && kind && (
            <div className="admin-tabs" role="tablist">
              {kind !== 'quiz' && (
                <>
                  <button className={`admin-tab${view === 'content' ? ' active' : ''}`} type="button" onClick={() => setView('content')}>
                    正文
                  </button>
                  <button className={`admin-tab${view === 'meta' ? ' active' : ''}`} type="button" onClick={() => setView('meta')}>
                    元数据
                  </button>
                </>
              )}
              {(kind === 'lesson' || kind === 'quiz') && (
                <button className={`admin-tab${view === 'quiz' ? ' active' : ''}`} type="button" onClick={() => setView('quiz')}>
                  测验
                </button>
              )}
              <button className={`admin-tab${view === 'preview' ? ' active' : ''}`} type="button" onClick={() => setView('preview')}>
                预览
              </button>
            </div>
          )}

          {draftFound && (
            <div className="admin-alert" style={{ margin: '12px 16px 0' }}>
              发现本地草稿。
              <button className="quiz-reset" type="button" style={{ marginLeft: '10px' }} onClick={restoreDraft}>
                恢复
              </button>
              <button
                className="quiz-reset"
                type="button"
                style={{ marginLeft: '8px' }}
                onClick={() => {
                  if (selectedPath) localStorage.removeItem(`${DRAFT_PREFIX}${selectedPath}`);
                  setDraftFound(null);
                }}
              >
                丢弃
              </button>
            </div>
          )}

          {!selectedPath && <div className="admin-empty">选择一个章节、课时或实训开始编辑。</div>}

          {selectedPath && view === 'content' && kind !== 'quiz' && (
            <div className="admin-editor">
              <textarea
                ref={textareaRef}
                value={body}
                onChange={(event) => {
                  setBody(event.target.value);
                  setDirty(true);
                }}
                spellCheck={false}
              />
            </div>
          )}

          {selectedPath && view === 'meta' && kind && kind !== 'quiz' && (
            <div className="admin-editor">
              <div className="admin-meta-grid">
                {META_FIELDS[kind].map((field) => (
                  <MetaField
                    key={field.key}
                    field={field}
                    value={meta[field.key]}
                    onChange={(value) => updateMeta(field.key, value)}
                  />
                ))}
              </div>
            </div>
          )}

          {selectedPath && view === 'quiz' && (kind === 'lesson' || kind === 'quiz') && (
            <QuizEditor
              quiz={quiz}
              lessonPath={selectedPath}
              onChange={(next) => {
                setQuiz(next);
                setDirty(true);
              }}
              onCreate={() => {
                const lessonPath = selectedPath.replace(/^src\/content\/quizzes\//, 'src/content/lessons/').replace(/\.json$/, '.mdx');
                setQuiz({
                  lesson: lessonIdFromQuizPath(quizPathForLesson(lessonPath)),
                  questions: [emptyQuestion(0), emptyQuestion(1), emptyQuestion(2)],
                });
                setDirty(true);
              }}
            />
          )}

          {selectedPath && view === 'preview' && (
            <div className="admin-editor">
              <div className="admin-preview">
                {kind === 'quiz' ? (
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>{JSON.stringify(quiz, null, 2)}</pre>
                ) : (
                  <div className="prose" style={{ paddingTop: 0 }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {body}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedPath && (
            <div className="admin-actions">
              {kind !== 'quiz' && (
                <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                  上传图片
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    style={{ display: 'none' }}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) addMedia(file);
                      event.target.value = '';
                    }}
                  />
                </label>
              )}
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                onClick={() => {
                  if (!selectedPath) return;
                  localStorage.setItem(
                    `${DRAFT_PREFIX}${selectedPath}`,
                    JSON.stringify({ meta, body, quiz, savedAt: new Date().toISOString() }),
                  );
                  setStatus({ type: 'ok', message: '已保存到本机草稿' });
                }}
              >
                暂存本机
              </button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setShowDelete((value) => !value)}>
                删除
              </button>
              <span className="spacer" />
              {commit && (
                <span className="admin-commit">
                  最近提交 {commit.sha.slice(0, 7)} ·{' '}
                  <a href={commit.url} target="_blank" rel="noreferrer">
                    查看
                  </a>
                </span>
              )}
              <button
                className="btn btn-primary btn-sm"
                type="button"
                disabled={busy}
                onClick={() => publish(view === 'quiz' && kind === 'lesson' ? 'quiz' : 'current')}
              >
                {busy ? '提交中…' : view === 'quiz' && kind === 'lesson' ? '保存测验' : '提交并发布'}
              </button>
            </div>
          )}

          {showDelete && selectedPath && (
            <div className="admin-editor" style={{ borderTop: '1px solid var(--line)' }}>
              <div className="admin-alert">
                删除会直接提交到 GitHub，Actions 随后重建站点。输入标题「{title}」确认。
              </div>
              <div className="field">
                <label>确认标题</label>
                <input value={deleteText} onChange={(event) => setDeleteText(event.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button className="btn btn-primary btn-sm" type="button" onClick={removeCurrent}>
                  确认删除
                </button>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => setShowDelete(false)}>
                  取消
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SettingsForm({
  config,
  onSave,
  onClear,
}: {
  config: RepoConfig;
  onSave: (config: RepoConfig) => Promise<void>;
  onClear: () => void;
}) {
  const [owner, setOwner] = useState(config.owner);
  const [repo, setRepo] = useState(config.repo);
  const [branch, setBranch] = useState(config.branch);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <div className="admin-meta-grid">
        <div className="field">
          <label>Owner</label>
          <input value={owner} onChange={(event) => setOwner(event.target.value)} />
        </div>
        <div className="field">
          <label>Repository</label>
          <input value={repo} onChange={(event) => setRepo(event.target.value)} />
        </div>
        <div className="field">
          <label>Branch</label>
          <input value={branch} onChange={(event) => setBranch(event.target.value)} />
        </div>
        <div className="field">
          <label>新 Token（留空则沿用当前）</label>
          <input type="password" value={token} onChange={(event) => setToken(event.target.value)} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
        <button
          className="btn btn-primary btn-sm"
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onSave({ owner: owner.trim(), repo: repo.trim(), branch: branch.trim() || 'main', token: token.trim() || config.token });
            } finally {
              setBusy(false);
            }
          }}
        >
          保存并验证
        </button>
        <button className="btn btn-ghost btn-sm" type="button" onClick={onClear}>
          清除本机凭据
        </button>
      </div>
    </div>
  );
}

function MetaField({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const id = `meta-${field.key}`;
  if (field.type === 'checkbox') {
    return (
      <label className="admin-check" style={{ gridColumn: field.full ? '1 / -1' : undefined }}>
        <input id={id} type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />
        <span>{field.label}</span>
      </label>
    );
  }
  return (
    <div className={`field${field.full ? ' full' : ''}`}>
      <label htmlFor={id}>{field.label}</label>
      {field.type === 'select' ? (
        <select id={id} value={asString(value)} onChange={(event) => onChange(event.target.value)}>
          {field.options?.map((option) => <option key={option}>{option}</option>)}
        </select>
      ) : field.type === 'textarea' || field.type === 'list' || field.type === 'repos' ? (
        <textarea
          id={id}
          rows={field.type === 'repos' ? 5 : 3}
          value={
            field.type === 'list'
              ? asArray(value).join('\n')
              : field.type === 'repos'
                ? (Array.isArray(value) ? value : [])
                    .map((item) => {
                      const repo = item as { label?: string; url?: string; meta?: string };
                      return `${repo.label || ''} | ${repo.url || ''} | ${repo.meta || ''}`;
                    })
                    .join('\n')
                : asString(value)
          }
          onChange={(event) => {
            if (field.type === 'list') {
              onChange(event.target.value.split('\n').map((line) => line.trim()).filter(Boolean));
            } else if (field.type === 'repos') {
              const repos = event.target.value
                .split('\n')
                .map((line) => line.split('|').map((part) => part.trim()))
                .filter((parts) => parts[0] && parts[1])
                .map(([label, url, meta]) => ({ label, url, meta: meta || '' }));
              onChange(repos);
            } else {
              onChange(event.target.value);
            }
          }}
        />
      ) : (
        <input
          id={id}
          type={field.type === 'number' ? 'number' : 'text'}
          value={asString(value)}
          onChange={(event) => onChange(field.type === 'number' ? Number(event.target.value) : event.target.value)}
        />
      )}
      {field.type === 'repos' && <span className="hint">每行格式：名称 | https://github.com/... | 说明</span>}
    </div>
  );
}

function QuizEditor({
  quiz,
  lessonPath,
  onChange,
  onCreate,
}: {
  quiz: QuizData | null;
  lessonPath: string;
  onChange: (quiz: QuizData) => void;
  onCreate: () => void;
}) {
  if (!quiz) {
    return (
      <div className="admin-editor">
        <div className="admin-empty">
          <div>
            这节课还没有测验文件。
            <div style={{ marginTop: '14px' }}>
              <button className="btn btn-primary btn-sm" type="button" onClick={onCreate}>
                创建 3 道测验
              </button>
            </div>
          </div>
        </div>
        <div className="admin-commit" style={{ textAlign: 'center' }}>
          目标路径：{quizPathForLesson(lessonPath)}
        </div>
      </div>
    );
  }
  return (
    <div className="admin-editor">
      <div className="admin-commit">测验文件：{quizPathForLesson(lessonPath)}</div>
      {quiz.questions.map((question, index) => (
        <div className="admin-question" key={question.id}>
          <div className="admin-question-head">
            <span>QUESTION {String(index + 1).padStart(2, '0')}</span>
            <button
              className="quiz-reset"
              type="button"
              onClick={() => onChange({ ...quiz, questions: quiz.questions.filter((_, item) => item !== index) })}
            >
              删除
            </button>
          </div>
          <div className="field">
            <label>题干</label>
            <textarea
              rows={2}
              value={question.stem}
              onChange={(event) => {
                const questions = quiz.questions.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, stem: event.target.value } : item,
                );
                onChange({ ...quiz, questions });
              }}
            />
          </div>
          {question.options.map((option, optionIndex) => (
            <div className="admin-option-row" key={optionIndex}>
              <input
                className="admin-radio"
                type="radio"
                name={`answer-${question.id}`}
                checked={question.answer === optionIndex}
                onChange={() => {
                  const questions = quiz.questions.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, answer: optionIndex } : item,
                  );
                  onChange({ ...quiz, questions });
                }}
                aria-label={`选项 ${String.fromCharCode(65 + optionIndex)} 为正确答案`}
              />
              <input
                type="text"
                value={option}
                placeholder={`选项 ${String.fromCharCode(65 + optionIndex)}`}
                onChange={(event) => {
                  const options = question.options.map((item, itemIndex) =>
                    itemIndex === optionIndex ? event.target.value : item,
                  );
                  const questions = quiz.questions.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, options } : item,
                  );
                  onChange({ ...quiz, questions });
                }}
              />
            </div>
          ))}
          <div className="field">
            <label>解析</label>
            <textarea
              rows={2}
              value={question.explanation}
              onChange={(event) => {
                const questions = quiz.questions.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, explanation: event.target.value } : item,
                );
                onChange({ ...quiz, questions });
              }}
            />
          </div>
        </div>
      ))}
      <button
        className="btn btn-ghost btn-sm"
        type="button"
        style={{ marginTop: '14px' }}
        onClick={() => onChange({ ...quiz, questions: [...quiz.questions, emptyQuestion(quiz.questions.length)] })}
      >
        添加题目
      </button>
      <span className="admin-commit" style={{ marginLeft: '10px' }}>
        当前 {quiz.questions.length} 题（必须为 3 题）
      </span>
    </div>
  );
}
