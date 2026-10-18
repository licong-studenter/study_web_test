import { useEffect, useRef, useState } from 'react';

type Cell = { x: number; y: number };

const COLS = 18;
const ROWS = 11;
const OBSTACLES = new Set([
  '4,2', '4,3', '4,4', '4,5', '4,6', '4,7',
  '8,1', '8,2', '8,3', '8,4', '8,5',
  '11,5', '11,6', '11,7', '11,8', '11,9',
  '14,2', '14,3', '14,4', '14,5',
  '6,8', '6,9', '6,10',
]);

function key(cell: Cell) {
  return `${cell.x},${cell.y}`;
}

function heuristic(a: Cell, b: Cell, weight: number) {
  return weight * (Math.abs(a.x - b.x) + Math.abs(a.y - b.y));
}

function search(start: Cell, goal: Cell, weight: number) {
  const open = new Map<string, { cell: Cell; g: number; f: number }>();
  const closed = new Set<string>();
  const parents = new Map<string, string>();
  const cells = new Map<string, Cell>();
  const order: Cell[] = [];
  open.set(key(start), { cell: start, g: 0, f: heuristic(start, goal, weight) });
  cells.set(key(start), start);

  while (open.size > 0) {
    let currentKey = '';
    let current = { cell: start, g: 0, f: Number.POSITIVE_INFINITY };
    for (const [entryKey, entry] of open) {
      if (entry.f < current.f) {
        currentKey = entryKey;
        current = entry;
      }
    }
    if (!currentKey) break;
    open.delete(currentKey);
    closed.add(currentKey);
    order.push(current.cell);

    if (currentKey === key(goal)) break;

    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const next = { x: current.cell.x + dx, y: current.cell.y + dy };
      const nextKey = key(next);
      if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS) continue;
      if (OBSTACLES.has(nextKey) || closed.has(nextKey)) continue;
      const nextG = current.g + 1;
      const previous = open.get(nextKey);
      if (!previous || nextG < previous.g) {
        open.set(nextKey, { cell: next, g: nextG, f: nextG + heuristic(next, goal, weight) });
        parents.set(nextKey, currentKey);
        cells.set(nextKey, next);
      }
    }
  }

  const path: Cell[] = [];
  let cursor = key(goal);
  if (closed.has(cursor)) {
    while (cursor) {
      const cell = cells.get(cursor);
      if (!cell) break;
      path.unshift(cell);
      if (cursor === key(start)) break;
      cursor = parents.get(cursor) || '';
    }
  }
  return { order, closed, path };
}

export default function AStarLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [start, setStart] = useState<Cell>({ x: 1, y: 8 });
  const [goal, setGoal] = useState<Cell>({ x: 16, y: 2 });
  const [weight, setWeight] = useState(1);
  const [speed, setSpeed] = useState(2);
  const drag = useRef<'start' | 'goal' | null>(null);
  const frame = useRef({ step: 0, value: 0 });
  const [stats, setStats] = useState({ expanded: 0, path: 0, found: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const result = search(start, goal, weight);
    frame.current = { step: 0, value: 0 };
    setStats({ expanded: 0, path: result.path.length ? result.path.length - 1 : 0, found: result.path.length > 0 });
    let raf = 0;
    let last = performance.now();

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      const inset = 10;
      const cellW = (width - inset * 2) / COLS;
      const cellH = (height - inset * 2) / ROWS;
      ctx.clearRect(0, 0, width, height);

      for (let y = 0; y < ROWS; y += 1) {
        for (let x = 0; x < COLS; x += 1) {
          const cellKey = `${x},${y}`;
          const px = inset + x * cellW;
          const py = inset + y * cellH;
          const isObstacle = OBSTACLES.has(cellKey);
          const isClosed = result.closed.has(cellKey);
          const closedIndex = result.order.findIndex((cell) => cell.x === x && cell.y === y);
          const isVisible = isClosed && closedIndex >= 0 && closedIndex < frame.current.step;
          const isPath = result.path.some((cell) => cell.x === x && cell.y === y);
          const isStart = start.x === x && start.y === y;
          const isGoal = goal.x === x && goal.y === y;

          ctx.fillStyle = isObstacle
            ? 'rgba(16,33,63,.16)'
            : isVisible
              ? 'rgba(47,107,255,.14)'
              : 'rgba(255,255,255,.82)';
          ctx.fillRect(px + 1, py + 1, cellW - 2, cellH - 2);
          ctx.strokeStyle = 'rgba(47,107,255,.08)';
          ctx.strokeRect(px + 1, py + 1, cellW - 2, cellH - 2);

          if (isPath && (frame.current.step >= result.order.length || !result.path.length)) {
            ctx.strokeStyle = '#11b7c9';
            ctx.lineWidth = Math.max(2, cellW * 0.16);
            ctx.lineCap = 'round';
            ctx.beginPath();
            const cx = px + cellW / 2;
            const cy = py + cellH / 2;
            const index = result.path.findIndex((cell) => cell.x === x && cell.y === y);
            const previous = result.path[index - 1];
            const next = result.path[index + 1];
            const neighbor = previous || next;
            if (neighbor) {
              ctx.moveTo(cx, cy);
              ctx.lineTo(inset + neighbor.x * cellW + cellW / 2, inset + neighbor.y * cellH + cellH / 2);
              ctx.stroke();
            }
          }

          if (isStart || isGoal) {
            ctx.beginPath();
            ctx.arc(px + cellW / 2, py + cellH / 2, Math.min(cellW, cellH) * 0.26, 0, Math.PI * 2);
            ctx.fillStyle = isStart ? '#2f6bff' : '#7b61ff';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
      }
      ctx.fillStyle = '#7c8da6';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillText('OPEN/CLOSED SEARCH · DRAG BLUE OR VIOLET HANDLE', 12, height - 1);
    };

    const tick = (now: number) => {
      const elapsed = now - last;
      last = now;
      frame.current.value += elapsed;
      const interval = 65 / speed;
      if (frame.current.value > interval) {
        frame.current.value = 0;
        frame.current.step = Math.min(result.order.length, frame.current.step + 1);
        setStats({
          expanded: frame.current.step,
          path: result.path.length ? result.path.length - 1 : 0,
          found: result.path.length > 0,
        });
      }
      draw();
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, goal, weight, speed]);

  const cellAt = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((((event.clientX - rect.left) * scaleX) - 10) / ((canvas.width - 20) / COLS));
    const y = Math.floor((((event.clientY - rect.top) * scaleY) - 10) / ((canvas.height - 20) / ROWS));
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS || OBSTACLES.has(`${x},${y}`)) return null;
    return { x, y };
  };

  const update = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drag.current) return;
    const cell = cellAt(event);
    if (!cell) return;
    if (drag.current === 'start' && !(cell.x === goal.x && cell.y === goal.y)) setStart(cell);
    if (drag.current === 'goal' && !(cell.x === start.x && cell.y === start.y)) setGoal(cell);
  };

  return (
    <div data-testid="astar-lab">
      <canvas
        className="lab-canvas lab-canvas--grid"
        ref={canvasRef}
        width={760}
        height={300}
        role="img"
        aria-label="A* 网格搜索与路径"
        onPointerDown={(event) => {
          const cell = cellAt(event);
          if (!cell) return;
          if (cell.x === start.x && cell.y === start.y) drag.current = 'start';
          else if (cell.x === goal.x && cell.y === goal.y) drag.current = 'goal';
          else return;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={update}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      />
      <div className="lab-controls">
        <div className="lab-control">
          <label>启发式权重 w <b>{weight.toFixed(1)}</b></label>
          <input type="range" aria-label="A 星启发式权重" min="0.5" max="3" step="0.1" value={weight} onChange={(event) => setWeight(Number(event.target.value))} />
        </div>
        <div className="lab-control">
          <label>搜索动画 <b>{speed.toFixed(1)}×</b></label>
          <input type="range" aria-label="A 星搜索动画速度" min="0.3" max="3" step="0.1" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} />
        </div>
      </div>
      <div className="lab-stats">
        <span>扩展节点 <b>{stats.expanded}</b></span>
        <span>路径长度 <b>{stats.found ? stats.path : '不可达'}</b></span>
        <span>状态 <b>{stats.found ? 'PATH FOUND' : 'NO PATH'}</b></span>
        <span style={{ color: '#2f6bff' }}>蓝：起点</span>
        <span style={{ color: '#7b61ff' }}>紫：终点</span>
        <span style={{ color: '#11b7c9' }}>青：路径</span>
      </div>
      <div className="lab-actions">
        <button
          type="button"
          onClick={() => {
            setStart({ x: 1, y: 8 });
            setGoal({ x: 16, y: 2 });
          }}
        >
          重置起终点
        </button>
      </div>
      <div className="lab-note">
        拖动蓝色起点或紫色终点即可重新搜索。增大 w 会让搜索更贪心，通常扩展更少，但路径可能变长。
      </div>
    </div>
  );
}
