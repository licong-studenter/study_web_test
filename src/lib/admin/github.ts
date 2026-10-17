export type RepoConfig = {
  owner: string;
  repo: string;
  branch: string;
  token: string;
};

export type RepoInfo = {
  full_name: string;
  default_branch: string;
  private: boolean;
  permissions?: { push?: boolean; admin?: boolean };
  html_url: string;
};

export type TreeEntry = {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
};

export type FilePayload = {
  path: string;
  sha: string;
  content: string;
  encoding: string;
  size: number;
};

export type ActionResult = {
  commit: { sha: string; html_url: string };
  content: { path: string; sha: string; html_url: string };
};

export type WorkflowRun = {
  id: number;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  head_sha: string;
};

const API = 'https://api.github.com';

export class GitHubError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(status === 401 ? 'Token 无效或已过期' : status === 403 ? '没有权限或触发速率限制' : status === 404 ? '仓库或文件不存在' : status === 409 ? '远端内容已更新，发生冲突' : `GitHub API 错误 (${status})`);
    this.name = 'GitHubError';
    this.status = status;
    this.body = body;
  }
}

function headers(token: string) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function request<T>(
  config: RepoConfig,
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    method: init.method || 'GET',
    headers: {
      ...headers(config.token),
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });

  if (!response.ok) {
    let body = '';
    try {
      body = await response.text();
    } catch {
      body = response.statusText;
    }
    throw new GitHubError(response.status, body);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function validateConfig(config: RepoConfig) {
  if (!config.owner.trim() || !config.repo.trim()) throw new Error('请填写仓库 owner 与 repo');
  if (!config.token.trim()) throw new Error('请填写 GitHub Token');
  if (!config.branch.trim()) throw new Error('请填写分支');
}

export async function getRepo(config: RepoConfig) {
  return request<RepoInfo>(config, `/repos/${config.owner}/${config.repo}`);
}

export async function getTree(config: RepoConfig) {
  const data = await request<{ tree: TreeEntry[]; truncated: boolean }>(
    config,
    `/repos/${config.owner}/${config.repo}/git/trees/${encodeURIComponent(config.branch)}?recursive=1`,
  );
  return data;
}

export async function getFile(config: RepoConfig, path: string) {
  const payload = await request<FilePayload>(
    config,
    `/repos/${config.owner}/${config.repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}?ref=${encodeURIComponent(config.branch)}`,
  );
  return {
    ...payload,
    content: decodeBase64Utf8(payload.content),
  };
}

export async function putFile(
  config: RepoConfig,
  path: string,
  content: string,
  message: string,
  sha?: string,
) {
  return request<ActionResult>(
    config,
    `/repos/${config.owner}/${config.repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`,
    {
      method: 'PUT',
      body: {
        message,
        content: encodeBase64Utf8(content),
        branch: config.branch,
        ...(sha ? { sha } : {}),
      },
    },
  );
}

export async function deleteFile(
  config: RepoConfig,
  path: string,
  message: string,
  sha: string,
) {
  return request<ActionResult>(
    config,
    `/repos/${config.owner}/${config.repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`,
    {
      method: 'DELETE',
      body: { message, sha, branch: config.branch },
    },
  );
}

export async function getLatestCommit(config: RepoConfig, path: string) {
  const commits = await request<Array<{ sha: string; commit: { message: string; author: { date: string } } }>>(
    config,
    `/repos/${config.owner}/${config.repo}/commits?path=${encodeURIComponent(path)}&sha=${encodeURIComponent(config.branch)}&per_page=1`,
  );
  return commits[0];
}

export async function getLatestRun(config: RepoConfig) {
  const data = await request<{ workflow_runs: WorkflowRun[] }>(
    config,
    `/repos/${config.owner}/${config.repo}/actions/runs?branch=${encodeURIComponent(config.branch)}&per_page=1`,
  );
  return data.workflow_runs[0];
}

export async function uploadMedia(config: RepoConfig, path: string, base64: string) {
  return request<ActionResult>(
    config,
    `/repos/${config.owner}/${config.repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`,
    {
      method: 'PUT',
      body: {
        message: `media: 上传 ${path.split('/').pop()}`,
        content: base64,
        branch: config.branch,
      },
    },
  );
}

export function decodeBase64Utf8(value: string) {
  const clean = value.replace(/\s/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new TextDecoder().decode(bytes);
}

export function encodeBase64Utf8(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}
