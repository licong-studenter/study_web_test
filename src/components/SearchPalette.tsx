import { useEffect, useMemo, useRef, useState } from 'react';

type SearchEntry = {
  id: string;
  type: 'chapter' | 'lesson' | 'case';
  title: string;
  chapter?: string;
  summary: string;
  href: string;
  keywords?: string[];
  headings?: string[];
};

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, '');
}

function score(entry: SearchEntry, query: string) {
  const q = normalize(query);
  if (!q) return 0;
  const title = normalize(entry.title);
  const summary = normalize(entry.summary || '');
  const keywords = normalize((entry.keywords || []).join(' '));
  const headings = normalize((entry.headings || []).join(' '));
  let value = 0;
  if (title === q) value += 100;
  if (title.includes(q)) value += 60;
  if (title.startsWith(q)) value += 30;
  if (keywords.includes(q)) value += 36;
  if (headings.includes(q)) value += 22;
  if (summary.includes(q)) value += 12;
  return value;
}

export default function SearchPalette({ base = '/' }: { base?: string }) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<SearchEntry[]>([]);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const loaded = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.dataset.searchReady = 'true';
    const openHandler = () => setOpen(true);
    const clickHandler = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (target?.closest('[data-open-search]')) {
        event.preventDefault();
        setOpen(true);
        const mobileNav = document.getElementById('mobile-nav');
        mobileNav?.classList.remove('open');
        document.querySelector('.menu-toggle')?.setAttribute('aria-expanded', 'false');
      }
    };
    const keyHandler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('open-search', openHandler);
    document.addEventListener('click', clickHandler);
    window.addEventListener('keydown', keyHandler);
    return () => {
      delete document.documentElement.dataset.searchReady;
      window.removeEventListener('open-search', openHandler);
      document.removeEventListener('click', clickHandler);
      window.removeEventListener('keydown', keyHandler);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => inputRef.current?.focus(), 20);
    if (!loaded.current) {
      loaded.current = true;
      setLoading(true);
      fetch(`${base.replace(/\/$/, '')}/search-index.json`)
        .then((response) => (response.ok ? response.json() : []))
        .then((data) => setEntries(Array.isArray(data) ? data : []))
        .catch(() => setEntries([]))
        .finally(() => setLoading(false));
    }
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open, base]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    document.getElementById(`search-result-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const results = useMemo(() => {
    if (!query.trim()) return entries.slice(0, 8);
    return entries
      .map((entry) => ({ entry, value: score(entry, query) }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
      .map((item) => item.entry);
  }, [entries, query]);

  const hrefFor = (entry: SearchEntry) => `${base.replace(/\/$/, '')}${entry.href}`;

  const go = (entry?: SearchEntry) => {
    if (!entry) return;
    window.location.href = hrefFor(entry);
  };

  if (!open) return <span hidden aria-hidden="true" />;

  return (
    <div
      className="search-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="搜索课程"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <div className="search-panel">
        <div className="search-input-row">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
            <path d="m16.5 16.5 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            className="search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索章节、知识点或实训项目…"
            aria-label="搜索关键词"
            aria-controls="search-results"
            aria-activedescendant={results[active] ? `search-result-${active}` : undefined}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActive((value) => Math.min(results.length - 1, value + 1));
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActive((value) => Math.max(0, value - 1));
              }
              if (event.key === 'Enter') {
                event.preventDefault();
                go(results[active]);
              }
            }}
          />
          <button className="search-esc" type="button" onClick={() => setOpen(false)} aria-label="关闭搜索">
            ESC
          </button>
        </div>
        <div className="search-results" id="search-results" role="listbox" ref={listRef}>
          {loading && <div className="search-empty">正在加载课程索引…</div>}
          {!loading && results.length === 0 && (
            <div className="search-empty">没有找到匹配内容，试试「感知」「MPC」「Isaac」。</div>
          )}
          {!loading &&
            results.map((entry, index) => (
              <a
                key={entry.id}
                id={`search-result-${index}`}
                className={`search-result${index === active ? ' active' : ''}`}
                href={hrefFor(entry)}
                role="option"
                aria-selected={index === active}
                onMouseEnter={() => setActive(index)}
              >
                <span className="meta">
                  {entry.type === 'lesson' ? 'LESSON' : entry.type === 'case' ? 'LAB' : 'CHAPTER'}
                  {entry.chapter ? ` · ${entry.chapter}` : ''}
                </span>
                <strong>{entry.title}</strong>
                <p>{entry.summary}</p>
              </a>
            ))}
        </div>
        <div className="search-foot">
          <span>↑↓ 选择</span>
          <span>↵ 打开</span>
          <span>ESC 关闭</span>
        </div>
      </div>
    </div>
  );
}
