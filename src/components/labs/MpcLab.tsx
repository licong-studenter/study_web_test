import { useEffect, useRef, useState } from 'react';

type Point = { x: number; v: number };

const TARGET = 1.2;
const DT = 0.075;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function rollout(initial: Point, controls: number[], q: number, r: number) {
  const states: Point[] = [{ ...initial }];
  let cost = 0;
  let current = { ...initial };
  for (const control of controls) {
    current = {
      x: current.x + current.v * DT,
      v: clamp(current.v + control * DT, -2.5, 2.5),
    };
    states.push(current);
    cost += q * (current.x - TARGET) ** 2 + 0.45 * q * current.v ** 2 + r * control ** 2;
  }
  return { states, cost };
}

function solveHorizon(initial: Point, horizon: number, q: number, r: number, limit: number) {
  let controls = Array.from({ length: horizon }, () => 0);
  let best = rollout(initial, controls, q, r);
  const epsilon = 0.035;
  let step = 0.18 / (1 + horizon * 0.06);

  for (let iteration = 0; iteration < 34; iteration += 1) {
    const gradient = controls.map((_, index) => {
      const plus = controls.slice();
      const minus = controls.slice();
      plus[index] = clamp(plus[index] + epsilon, -limit, limit);
      minus[index] = clamp(minus[index] - epsilon, -limit, limit);
      const delta = plus[index] - minus[index];
      if (Math.abs(delta) < 1e-6) return 0;
      const high = rollout(initial, plus, q, r).cost;
      const low = rollout(initial, minus, q, r).cost;
      return (high - low) / delta;
    });
    const next = controls.map((control, index) => clamp(control - step * gradient[index], -limit, limit));
    const result = rollout(initial, next, q, r);
    if (result.cost <= best.cost) {
      controls = next;
      best = result;
    } else {
      step *= 0.72;
    }
  }
  return { controls, ...best };
}

export default function MpcLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [horizon, setHorizon] = useState(8);
  const [q, setQ] = useState(6);
  const [r, setR] = useState(0.35);
  const [limit, setLimit] = useState(2.2);
  const params = useRef({ horizon, q, r, limit });
  const sim = useRef({
    state: { x: 0, v: 0 } as Point,
    history: [] as Point[],
    prediction: [] as Point[],
    timer: 0,
  });
  const [stats, setStats] = useState({ cost: 0, control: 0, error: TARGET });

  useEffect(() => {
    params.current = { horizon, q, r, limit };
    sim.current.timer = 0;
  }, [horizon, q, r, limit]);

  const reset = () => {
    sim.current.state = { x: 0, v: 0 };
    sim.current.history = [];
    sim.current.prediction = [];
    sim.current.timer = 0;
    setStats({ cost: 0, control: 0, error: TARGET });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      const pad = { left: 44, right: 20, top: 20, bottom: 30 };
      const plotW = width - pad.left - pad.right;
      const plotH = height - pad.top - pad.bottom;
      const mapX = (time: number) => pad.left + (time / 2.6) * plotW;
      const mapY = (value: number) => pad.top + ((1.75 - value) / 2.15) * plotH;

      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = 'rgba(47,107,255,.08)';
      ctx.lineWidth = 1;
      for (let t = 0; t <= 2.5; t += 0.5) {
        ctx.beginPath();
        ctx.moveTo(mapX(t), pad.top);
        ctx.lineTo(mapX(t), height - pad.bottom);
        ctx.stroke();
      }
      for (let value = 0; value <= 1.5; value += 0.5) {
        ctx.beginPath();
        ctx.moveTo(pad.left, mapY(value));
        ctx.lineTo(width - pad.right, mapY(value));
        ctx.stroke();
      }

      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = 'rgba(123,97,255,.8)';
      ctx.beginPath();
      ctx.moveTo(mapX(0), mapY(TARGET));
      ctx.lineTo(mapX(2.6), mapY(TARGET));
      ctx.stroke();
      ctx.setLineDash([]);

      const history = sim.current.history;
      const prediction = sim.current.prediction;
      const startTime = Math.max(0, history.length * DT - 2);
      if (history.length > 1) {
        const gradient = ctx.createLinearGradient(pad.left, 0, width - pad.right, 0);
        gradient.addColorStop(0, '#2f6bff');
        gradient.addColorStop(0.6, '#11b7c9');
        gradient.addColorStop(1, '#7b61ff');
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        history.forEach((sample, index) => {
          const time = index * DT - startTime;
          if (time < 0) return;
          const x = mapX(clamp(time, 0, 2.6));
          const y = mapY(sample.x);
          if (index === 0 || time === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      if (prediction.length > 1) {
        ctx.strokeStyle = 'rgba(255,122,69,.9)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        prediction.forEach((sample, index) => {
          const x = mapX(index * DT);
          const y = mapY(sample.x);
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.fillStyle = '#7c8da6';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText('x', 18, 28);
      ctx.fillText('t →', width - 35, height - 9);
      ctx.fillText(TARGET.toFixed(1), 10, mapY(TARGET) + 3);
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const current = sim.current;
      current.timer += dt;
      if (current.timer > 0.16 && current.history.length < 260) {
        current.timer = 0;
        const { horizon: steps, q: weight, r: effort, limit: bound } = params.current;
        const solution = solveHorizon(current.state, steps, weight, effort, bound);
        current.prediction = solution.states;
        const control = solution.controls[0] || 0;
        current.state = {
          x: current.state.x + current.state.v * DT,
          v: clamp(current.state.v + control * DT, -2.5, 2.5),
        };
        current.history.push({ ...current.state });
        setStats({
          cost: solution.cost,
          control,
          error: Math.abs(TARGET - current.state.x),
        });
      }
      draw();
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div data-testid="mpc-lab">
      <canvas
        className="lab-canvas"
        ref={canvasRef}
        width={760}
        height={270}
        role="img"
        aria-label="MPC 位置响应与预测轨迹"
      />
      <div className="lab-controls lab-controls--four">
        <div className="lab-control">
          <label>预测时域 H <b>{horizon}</b></label>
          <input type="range" aria-label="MPC 预测时域" min="3" max="12" step="1" value={horizon} onChange={(event) => setHorizon(Number(event.target.value))} />
        </div>
        <div className="lab-control">
          <label>位置权重 Q <b>{q.toFixed(1)}</b></label>
          <input type="range" aria-label="MPC 位置权重 Q" min="0.5" max="16" step="0.5" value={q} onChange={(event) => setQ(Number(event.target.value))} />
        </div>
        <div className="lab-control">
          <label>控制权重 R <b>{r.toFixed(2)}</b></label>
          <input type="range" aria-label="MPC 控制权重 R" min="0.05" max="3" step="0.05" value={r} onChange={(event) => setR(Number(event.target.value))} />
        </div>
        <div className="lab-control">
          <label>控制约束 |u| <b>{limit.toFixed(1)}</b></label>
          <input type="range" aria-label="MPC 控制约束" min="0.4" max="4" step="0.1" value={limit} onChange={(event) => setLimit(Number(event.target.value))} />
        </div>
      </div>
      <div className="lab-stats">
        <span>预测代价 <b>{stats.cost.toFixed(2)}</b></span>
        <span>当前控制 <b>{stats.control.toFixed(2)}</b></span>
        <span>位置误差 <b>{stats.error.toFixed(3)}</b></span>
        <span>约束 <b>{Math.abs(stats.control) >= limit - 1e-3 ? 'ACTIVE' : 'INACTIVE'}</b></span>
      </div>
      <div className="lab-actions">
        <button type="button" onClick={reset}>重新规划</button>
      </div>
      <div className="lab-note">
        蓝线是已经执行的轨迹，橙色虚线是当前时刻的未来预测。增大 H 会看得更远；R 越大控制越保守；约束会截断过大的动作。
      </div>
    </div>
  );
}
