import { useMemo, useState } from 'react';

export default function PpoClipLab() {
  const [epsilon, setEpsilon] = useState(0.2);
  const width = 760;
  const height = 260;
  const padding = { left: 54, right: 24, top: 22, bottom: 36 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const mapX = (ratio: number) => padding.left + (ratio / 2) * plotWidth;
  const mapY = (value: number) => padding.top + ((1.45 - value) / 2.9) * plotHeight;

  const curves = useMemo(() => {
    const build = (advantage: number) => {
      const points: string[] = [];
      for (let index = 0; index <= 100; index += 1) {
        const ratio = (index / 100) * 2;
        const clipped = Math.min(1 + epsilon, Math.max(1 - epsilon, ratio));
        const value = Math.min(ratio * advantage, clipped * advantage);
        points.push(`${mapX(ratio).toFixed(1)},${mapY(value).toFixed(1)}`);
      }
      return points.join(' ');
    };
    return { positive: build(1), negative: build(-1) };
  }, [epsilon, plotWidth, plotHeight]);

  return (
    <div>
      <svg className="lab-canvas" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="PPO 裁剪目标曲线">
        {[0, 0.5, 1, 1.5, 2].map((tick) => (
          <g key={tick}>
            <line x1={mapX(tick)} y1={padding.top} x2={mapX(tick)} y2={height - padding.bottom} stroke="rgba(47,107,255,.09)" />
            <text x={mapX(tick)} y={height - 16} fill="#7c8da6" fontSize="9" fontFamily="monospace" textAnchor="middle">{tick.toFixed(1)}</text>
          </g>
        ))}
        <line x1={padding.left} y1={mapY(0)} x2={width - padding.right} y2={mapY(0)} stroke="rgba(16,33,63,.26)" />
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="rgba(16,33,63,.26)" />

        <rect
          x={mapX(Math.max(0, 1 - epsilon))}
          y={padding.top}
          width={Math.max(0, mapX(Math.min(2, 1 + epsilon)) - mapX(Math.max(0, 1 - epsilon)))}
          height={plotHeight}
          fill="rgba(47,107,255,.055)"
        />
        <line x1={mapX(1)} y1={padding.top} x2={mapX(1)} y2={height - padding.bottom} stroke="rgba(123,97,255,.3)" strokeDasharray="4 5" />

        <polyline points={curves.positive} fill="none" stroke="#2f6bff" strokeWidth="2.8" strokeLinecap="round" />
        <polyline points={curves.negative} fill="none" stroke="#ff7a45" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="7 5" />

        <text x={padding.left + 8} y={padding.top + 12} fill="#2f6bff" fontSize="10" fontFamily="monospace">A = +1</text>
        <text x={padding.left + 8} y={padding.top + 28} fill="#e87545" fontSize="10" fontFamily="monospace">A = -1</text>
        <text x={width - padding.right} y={height - 16} fill="#7c8da6" fontSize="9" fontFamily="monospace" textAnchor="end">ratio r</text>
      </svg>
      <div className="lab-controls" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
        <div className="lab-control">
          <label>裁剪范围 ε <b>{epsilon.toFixed(2)}</b></label>
          <input type="range" aria-label="PPO 裁剪范围 epsilon" min="0.05" max="0.4" step="0.01" value={epsilon} onChange={(event) => setEpsilon(Number(event.target.value))} />
        </div>
      </div>
      <div className="lab-stats">
        <span>允许区间 <b>[{Math.max(0, 1 - epsilon).toFixed(2)}, {(1 + epsilon).toFixed(2)}]</b></span>
        <span>超出区间的更新被截断</span>
      </div>
      <div className="lab-note">
        曲线越平，策略更新越保守。ε 太小会学得慢，太大则可能让一次更新破坏已学到的策略。
      </div>
    </div>
  );
}
