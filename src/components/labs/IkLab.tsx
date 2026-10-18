import { useMemo, useRef, useState } from 'react';

const L1 = 112;
const L2 = 108;
const HIP = { x: 210, y: 54 };

function clampTarget(x: number, y: number) {
  const dx = x - HIP.x;
  const dy = y - HIP.y;
  const distance = Math.hypot(dx, dy);
  const max = L1 + L2 - 2;
  if (distance > max) {
    return { x: HIP.x + (dx / distance) * max, y: HIP.y + (dy / distance) * max };
  }
  return { x, y };
}

export default function IkLab() {
  const [target, setTarget] = useState({ x: 286, y: 260 });
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef(false);

  const result = useMemo(() => {
    const dx = target.x - HIP.x;
    const dy = target.y - HIP.y;
    const r2 = dx * dx + dy * dy;
    const cosKnee = Math.max(-1, Math.min(1, (r2 - L1 * L1 - L2 * L2) / (2 * L1 * L2)));
    const knee = Math.acos(cosKnee);
    const hip = Math.atan2(dx, dy) - Math.atan2(L2 * Math.sin(knee), L1 + L2 * Math.cos(knee));
    const kneePoint = {
      x: HIP.x + L1 * Math.sin(hip),
      y: HIP.y + L1 * Math.cos(hip),
    };
    const foot = {
      x: kneePoint.x + L2 * Math.sin(hip + knee),
      y: kneePoint.y + L2 * Math.cos(hip + knee),
    };
    return { hip, knee, kneePoint, foot, distance: Math.sqrt(r2), reachable: Math.sqrt(r2) <= L1 + L2 };
  }, [target]);

  const move = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!drag.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 420;
    const y = ((event.clientY - rect.top) / rect.height) * 320;
    setTarget(clampTarget(Math.max(28, Math.min(392, x)), Math.max(70, Math.min(302, y))));
  };

  return (
    <div>
      <svg
        className="ik-stage"
        ref={svgRef}
        viewBox="0 0 420 320"
        onPointerMove={move}
        onPointerUp={() => {
          drag.current = false;
        }}
        onPointerLeave={() => {
          drag.current = false;
        }}
      >
        <g stroke="rgba(47,107,255,.12)" strokeDasharray="3 7">
          <line x1="210" y1="54" x2="210" y2="300" />
          <line x1="30" y1="300" x2="390" y2="300" />
        </g>
        <circle cx={HIP.x} cy={HIP.y} r="35" fill="rgba(47,107,255,.06)" stroke="rgba(47,107,255,.18)" />
        <line x1={HIP.x} y1={HIP.y} x2={result.kneePoint.x} y2={result.kneePoint.y} stroke="#2f6bff" strokeWidth="13" strokeLinecap="round" />
        <line x1={result.kneePoint.x} y1={result.kneePoint.y} x2={result.foot.x} y2={result.foot.y} stroke="#11b7c9" strokeWidth="10" strokeLinecap="round" />
        <circle cx={HIP.x} cy={HIP.y} r="8" fill="#ffffff" stroke="#2f6bff" strokeWidth="3" />
        <circle cx={result.kneePoint.x} cy={result.kneePoint.y} r="8" fill="#ffffff" stroke="#2f6bff" strokeWidth="3" />
        <circle cx={result.foot.x} cy={result.foot.y} r="9" fill="#ffffff" stroke="#11b7c9" strokeWidth="3" />
        <line x1="30" y1="300" x2="390" y2="300" stroke="rgba(16,33,63,.24)" strokeWidth="1" />
        <g
          style={{ cursor: 'grab', touchAction: 'none' }}
          onPointerDown={(event) => {
            drag.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
        >
          <circle cx={target.x} cy={target.y} r="18" fill="rgba(123,97,255,.16)" />
          <circle cx={target.x} cy={target.y} r="8" fill="#7b61ff" stroke="#ffffff" strokeWidth="2" />
        </g>
        <text x="32" y="32" fill="#7c8da6" fontSize="10" fontFamily="monospace">DRAG THE TARGET</text>
      </svg>
      <div className="lab-stats">
        <span>髋关节 <b>{(result.hip * 180 / Math.PI).toFixed(1)}°</b></span>
        <span>膝关节 <b>{(result.knee * 180 / Math.PI).toFixed(1)}°</b></span>
        <span>足端距离 <b>{result.distance.toFixed(0)}</b></span>
        <span>{result.reachable ? '可达' : '超出工作空间'}</span>
      </div>
      <div className="lab-note">
        拖动紫色目标点，观察髋、膝角度如何变化。足端距离接近两段腿长之和时，腿接近完全伸直，逆解会变得敏感。
      </div>
    </div>
  );
}
