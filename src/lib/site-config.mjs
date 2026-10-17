const DEFAULT_SITE = 'http://localhost:4321';

/**
 * Resolve the canonical site URL and the GitHub Pages base path.
 * PUBLIC_SITE_URL / PUBLIC_BASE_PATH always win, which covers custom domains.
 */
export function resolveDeployment(env = process.env) {
  const repository = (env.GITHUB_REPOSITORY || '').trim();
  const [owner = '', repo = ''] = repository.split('/');

  let site = (env.PUBLIC_SITE_URL || '').trim() || (owner ? `https://${owner}.github.io` : DEFAULT_SITE);
  site = site.replace(/\/+$/, '');

  let base = env.PUBLIC_BASE_PATH;
  if (typeof base !== 'string') {
    const isUserSite = owner && repo && repo.toLowerCase() === `${owner}.github.io`.toLowerCase();
    base = repo && !isUserSite ? `/${repo}` : '';
  }
  base = base.trim().replace(/\/+$/, '');
  if (base && !base.startsWith('/')) base = `/${base}`;

  return {
    site,
    base,
    owner,
    repo,
    branch: (env.PUBLIC_GITHUB_BRANCH || 'main').trim() || 'main',
  };
}
