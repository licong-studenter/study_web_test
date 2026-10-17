# Embodied AI Lab · 具身智能学习站

一个中文优先的具身智能教材网站：8 章、24 节教材正文、72 道章节测验、8 个实训项目。以绝影 Lite3 为平台样本，以 MuJoCo / Isaac Lab 仿真为主线，真机实训为进阶。

## 技术栈

- Astro 7 + TypeScript，静态输出到 GitHub Pages
- React 19 岛屿组件 + Tailwind CSS 4
- Three.js 程序化四足机器人首页主视觉
- MDX + KaTeX + Shiki
- 站内 `/admin` CMS，通过 GitHub Contents API 提交内容
- GitHub Actions 自动构建与发布

## 本地运行

需要 Node.js 22 或更高版本。

```bash
npm install
npm run dev
```

打开 `http://localhost:4321`。

常用命令：

```bash
npm run check        # Astro / TypeScript 检查
npm test             # 内容与工具函数测试
npm run build        # 生产构建
npm run preview      # 预览构建结果
npm run test:e2e     # 构建后运行 Playwright
npm run check:links  # 预览运行时爬取全站内链
```

## 内容结构

```text
src/content/
├── chapters/     # 8 个章节导览
├── lessons/      # 24 节 MDX 正文
├── quizzes/      # 24 份 JSON 测验
└── cases/        # 8 个实训项目
```

课时路径与章节 slug 对应，例如：

```text
src/content/lessons/foundations/1-from-ai-to-embodied.mdx
src/content/quizzes/foundations/1-from-ai-to-embodied.json
```

每节课必须有 3 道单选题，每题 4 个选项，并提供解析。

## 内容管理

1. 发布站点后访问 `/admin/`。
2. 创建一个细粒度 GitHub Token：仅授权本站仓库，授予 **Contents: Read and write**；如需查看部署状态，再授予 **Actions: Read**。
3. 输入 owner、repo、branch 与 Token 连接。
4. 在左侧选择文件，编辑正文 / 元数据 / 测验，预览后点击“提交并发布”。
5. GitHub Actions 会自动重建站点，通常 1–3 分钟生效。

Token 默认只保存在 `sessionStorage`。勾选“记住本机”会存入 `localStorage`，共用电脑请勿开启。

## 部署

完整手动发布步骤见 [docs/publish.md](docs/publish.md)。简要流程：

1. 创建公开 GitHub 仓库并推送本项目。
2. 仓库 Settings → Pages → Source 选择 **GitHub Actions**。
3. 推送 `main` 分支或手动运行 **Deploy to GitHub Pages** 工作流。
4. 站点地址通常为 `https://<owner>.github.io/<repo>/`。

如果不用 Actions、而是手动构建后上传 `dist/`，请先设置正确的站点地址：

```bash
PUBLIC_SITE_URL=https://<owner>.github.io
PUBLIC_BASE_PATH=/<repo>
npm run build
```

构建会自动根据 `GITHUB_REPOSITORY` 推导 `site` 与 `base`。自定义域名时设置：

```bash
PUBLIC_SITE_URL=https://your-domain.com
PUBLIC_BASE_PATH=/
```

## 设计系统

| Token | 值 | 用途 |
| --- | --- | --- |
| `--bg` | `#0A0C10` | 页面底色 |
| `--surface` | `#12161D` | 面板 |
| `--orange` | `#FF6A2B` | 信号橙 / 主强调 |
| `--cyan` | `#41EAD4` | 遥测青 / 次强调 |
| `--text` | `#E8ECF2` | 正文 |

中文使用系统字体，英文标签使用自托管 JetBrains Mono，避免依赖境外字体 CDN。

## 已知边界

- 不提供账号、数据库、评论或学习进度同步。
- 测验成绩仅在当前页面会话中展示。
- `/admin` 为单管理员模式，安全性依赖细粒度 Token 与严格 CSP。
- 硬件相关步骤以 Lite3 官方文档与仓库为准；不同批次设备可能存在差异。

## 内容与资源

课程正文为原创讲解；外部 GitHub 仓库仅作为延伸阅读与实训参考。引用第三方资料时请遵守其许可证。
