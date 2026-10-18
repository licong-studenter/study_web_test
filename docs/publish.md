# 手动发布手册

本文假设你使用 GitHub Pages，仓库名为 `embodied-ai-lab`。仓库名可以不同，构建会自动适配。

## 1. 创建仓库

1. 在 GitHub 新建一个公开仓库。
2. 在本地项目目录初始化并推送：

```bash
git init
git add .
git commit -m "feat: initial embodied ai learning site"
git branch -M main
git remote add origin https://github.com/<owner>/<repo>.git
git push -u origin main
```

## 2. 启用 GitHub Pages

1. 打开仓库 **Settings → Pages**。
2. **Build and deployment → Source** 选择 **GitHub Actions**。
3. 打开 **Actions** 标签，确认 `Deploy to GitHub Pages` 工作流执行成功。
4. 站点地址通常为 `https://<owner>.github.io/<repo>/`。

如果构建失败，先看 Actions 日志中的 `npm ci`、`npm run check` 与 `npm run build` 步骤。

如果不用 Actions，而是手动上传 `dist/`，构建前必须设置：

```bash
PUBLIC_SITE_URL=https://<owner>.github.io
PUBLIC_BASE_PATH=/<repo>
npm run build
```

否则 canonical、OG 图片与 sitemap 会指向 `localhost`。

## 3. 创建后台 Token

1. 打开 <https://github.com/settings/personal-access-tokens/new>。
2. Token name 填 `embodied-ai-lab-admin`。
3. Expiration 建议 30–90 天。
4. Repository access 选择 **Only select repositories**，只勾选本站仓库。
5. Permissions：
   - **Contents: Read and write**（必需）
   - **Actions: Read**（可选，用于显示部署状态）
6. 生成后立即复制。Token 只显示一次。

## 4. 首次发布内容

1. 打开 `https://<owner>.github.io/<repo>/admin/`。
2. 填写 owner、repo、branch（默认 `main`）与 Token。
3. 点击“连接仓库”。若提示没有写入权限，回到 Token 设置检查 Contents 权限。
4. 在左侧选择课程 / 章节 / 课时 / 实训，编辑正文与测验。新建章节时必须选择所属课程。
5. 点击“提交并发布”。页面会显示 commit 链接与 Actions 状态。
6. 等待 1–3 分钟，刷新站点查看更新。

## 5. 自定义域名

1. 在域名服务商添加 CNAME 记录指向 `<owner>.github.io`。
2. 在仓库 Settings → Pages 填写 Custom domain。
3. 在 Actions 构建环境中设置：

```text
PUBLIC_SITE_URL=https://your-domain.com
PUBLIC_BASE_PATH=/
```

也可以把这些值写入仓库 Variables，并在工作流中引用。绑定域名后，`sitemap`、canonical 与 OG 地址会自动使用新域名。

## 6. 常见问题

| 现象 | 处理 |
| --- | --- |
| 页面 404 | 确认 Pages Source 是 GitHub Actions，且工作流成功 |
| 样式 / 图片丢失 | 确认使用相对 base 路径；不要在 Markdown 中写死域名 |
| 后台 403 | Token 缺少 Contents: Read and write，或仓库选择错误 |
| 后台 409 | 远端文件已被修改；重新打开文件载入最新版本再提交 |
| 提交后未更新 | 查看 Actions 是否运行；GitHub Pages 可能有缓存，等待 1–3 分钟 |
| 搜索无结果 | 确认构建产物中存在 `search-index.json` |

## 7. 安全建议

- 不要把 Token 写入仓库、截图或聊天记录。
- 共用电脑不要勾选“记住本机”。
- Token 泄露后立即在 GitHub 撤销并重新生成。
- 定期检查仓库 Actions 与提交记录，确认没有未授权修改。
