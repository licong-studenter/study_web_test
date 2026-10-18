# Embodied AI Lab · 具身智能学习站

一个中文优先的具身智能学习站：4 门课程、20 个模块、60 节教材正文、60 份测验（180 道题）、8 个实训项目，外加 6 个可交互算法实验。课程覆盖具身基础、自动控制理论、运动控制、具身模型与算法；以绝影 Lite3 与 MuJoCo / Isaac Lab 仿真为主线，真机实训为进阶。

## 界面与角色

- 首次进入站点会播放约 3.2 秒的四幕启动动画：粒子聚拢、蓝球苏醒、知识节点点亮、书页打开；可点击或按 `Esc` 跳过，同一浏览器会话只播放一次。
- 原创蓝色球形小具：首页大型主视觉，全站右下角悬浮助手；支持眨眼、呼吸、点击跳跃、拖动与位置恢复。
- 小具会根据首页、课程、章节、课时、实训与算法实验室给出不同提示；`/?intro=1` 可重播开场。
- 页面跳转使用前进/返回方向感知的 3D 书页翻转；`prefers-reduced-motion` 时自动关闭动画。
- 算法实验室提供 PID、二连杆逆运动学、Kalman、PPO、MPC 与 A* 的实时交互演示。
- 所有角色图形均为项目内原创 SVG，不依赖第三方角色素材或外部图片服务。

## 技术栈

- Astro 7 + TypeScript，静态输出到 GitHub Pages
- React 19 岛屿组件 + Tailwind CSS 4
- 明亮蓝白渐变主题、蓝色球形小具、3D 书页转场与交互式算法实验室
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
├── courses/      # 4 门课程介绍
├── chapters/     # 20 个模块导览
├── lessons/      # 60 节 MDX 正文
├── quizzes/      # 60 份 JSON 测验
└── cases/        # 8 个实训项目
```

章节 slug 在四门课程内保持唯一，课时路径与章节 slug 对应，例如：

```text
src/content/lessons/foundations/1-from-ai-to-embodied.mdx
src/content/quizzes/foundations/1-from-ai-to-embodied.json
```

每节课必须有 3 道单选题，每题 4 个选项，并提供解析。

站点路由：

```text
/courses/                                       课程矩阵
/courses/foundations/                           具身智能基础
/courses/automatic-control/                     自动控制理论
/courses/motion-control/                        运动控制
/courses/embodied-algorithms/                   具身模型与算法
/courses/<course>/<chapter>/                    模块
/courses/<course>/<chapter>/<lesson>/           课时
/algorithms/                                    6 个交互实验
```

旧 `/course/...` 地址会生成带 canonical 与 `noindex` 的静态跳转页，保留 GitHub Pages 的 base 路径。

## 内容管理

1. 发布站点后访问 `/admin/`。
2. 创建一个细粒度 GitHub Token：仅授权本站仓库，授予 **Contents: Read and write**；如需查看部署状态，再授予 **Actions: Read**。
3. 输入 owner、repo、branch 与 Token 连接。
4. 在左侧选择课程 / 章节 / 课时 / 实训，编辑正文、元数据与测验，预览后点击“提交并发布”。
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
| `--bg` | `#F7F9FE` | 明亮页面底色 |
| `--surface` | `#FFFFFF` | 玻璃面板 |
| `--blue` | `#2F6BFF` | 主强调 / 小具蓝 |
| `--cyan` | `#11B7C9` | 遥测青 |
| `--violet` | `#7B61FF` | 课程进阶色 |
| `--text` | `#10213F` | 正文 |

中文使用系统字体，英文标签使用自托管 JetBrains Mono，避免依赖境外字体 CDN。`/admin` 保持深色工具界面，且不播放入场动画、不显示小具。

## 已知边界

- 不提供账号、数据库、评论或学习进度同步。
- 测验成绩仅在当前页面会话中展示。
- `/admin` 为单管理员模式，安全性依赖细粒度 Token 与严格 CSP。
- 硬件相关步骤以 Lite3 官方文档与仓库为准；不同批次设备可能存在差异。

## 内容与资源

课程正文与图示为原创讲解；外部 GitHub 仓库、论文与教材仅作为延伸阅读与实训参考。引用第三方资料时请遵守其许可证。

参考书目、教材版次说明与已核验链接见 [docs/references.md](docs/references.md)。
