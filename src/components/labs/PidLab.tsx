import { useEffect, useRef, useState } from 'react';

type Sample = { target: number; value: number };

export default function PidLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [kp, setKp] = useState(4.2);
  const [ki, setKi] = useState(0.6);
  const [kd, setKd] = useState(1.4);
  const gains = useRef({ kp, ki, kd });
  const sim = useRef({ x: 0, v: 0, integral: 0, history: [] as Sample[] });
  const [stats, setStats] = useState({ overshoot: 0, settle: 0, error: 0 });

  useEffect(() => {
    gains.current = { kp, ki, kd };
  }, [kp, ki, kd]);

  const reset = () => {
    sim.current = { x: 0, v: 0, integral: 0, history: [] };
    setStats({ overshoot: 0, settle: 0, error: 1 });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let frame = 0;
    let last = performance.now();

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = 'rgba(47,107,255,.08)';
      ctx.lineWidth = 1;
      for (let x = 40; x < width - 20; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 16);
        ctx.lineTo(x, height - 24);
        ctx.stroke();
      }
      for (let y = 24; y < height - 20; y += 42) {
        ctx.beginPath();
        ctx.moveTo(36, y);
        ctx.lineTo(width - 18, y);
        ctx.stroke();
      }

      const mapX = (time: number) => 38 + (time / 8) * (width - 60);
      const mapY = (value: number) => height - 34 - Math.max(-0.2, Math.min(1.5, value)) * (height - 62);
      ctx.setLineDash([5, 6]);
      ctx.strokeStyle = 'rgba(123,97,255,.6)';
      ctx.beginPath();
      ctx.moveTo(mapX(0), mapY(1));
      ctx.lineTo(mapX(8), mapY(1));
      ctx.stroke();
      ctx.setLineDash([]);

      const points = sim.current.history;
      if (points.length > 1) {
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, '#2f6bff');
        gradient.addColorStop(0.6, '#11b7c9');
        gradient.addColorStop(1, '#7b61ff');
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        points.forEach((sample, index) => {
          const x = mapX((index / points.length) * 8);
          const y = mapY(sample.value);
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }
      ctx.fillStyle = '#7c8da6';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText('1.0', 12, mapY(1) + 3);
      ctx.fillText('0.0', 12, mapY(0) + 3);
    };

    const tick = (now: number) => {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      const state = sim.current;
      if (state.history.length < 480) {
        const { kp: p, ki: i, kd: d } = gains.current;
        const error = 1 - state.x;
        state.integral = Math.max(-12, Math.min(12, state.integral + error * dt));
        let control = p * error + i * state.integral - d * state.v;
        control = Math.max(-24, Math.min(24, control));
        const acceleration = control - 2.2 * state.v - 5.2 * state.x;
        state.v += acceleration * dt;
        state.x += state.v * dt;
        state.history.push({ target: 1, value: state.x });
        frame += 1;
        if (frame % 12 === 0) {
          const max = Math.max(...state.history.map((sample) => sample.value));
          const outside = state.history
            .map((sample, index) => ({ sample, time: (index / 60) as number }))
            .filter(({ sample }) => Math.abs(sample.value - 1) > 0.05);
          setStats({
            overshoot: Math.max(0, max - 1) * 100,
            settle: outside.length ? outside[outside.length - 1].time : 0,
            error: Math.abs(1 - state.x),
          });
        }
      }
      draw();
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div>
      <canvas className="lab-canvas" ref={canvasRef} width={760} height={260} />
      <div className="lab-controls">
        <div className="lab-control">
          <label>Kp <b>{kp.toFixed(1)}</b></label>
          <input type="range" aria-label="比例增益 Kp" min="0" max="14" step="0.1" value={kp} onChange={(event) => setKp(Number(event.target.value))} />
        </div>
        <div className="lab-control">
          <label>Ki <b>{ki.toFixed(2)}</b></label>
          <input type="range" aria-label="积分增益 Ki" min="0" max="6" step="0.05" value={ki} onChange={(event) => setKi(Number(event.target.value))} />
        </div>
        <div className="lab-control">
          <label>Kd <b>{kd.toFixed(2)}</b></label>
          <input type="range" aria-label="微分增益 Kd" min="0" max="6" step="0.05" value={kd} onChange={(event) => setKd(Number(event.target.value))} />
        </div>
      </div>
      <div className="lab-stats">
        <span>超调 <b>{stats.overshoot.toFixed(1)}%</b></span>
        <span>调节时间 <b>{stats.settle.toFixed(1)}s</b></span>
        <span>稳态误差 <b>{stats.error.toFixed(3)}</b></span>
      </div>
      <div className="lab-actions">
        <button type="button" onClick={reset}>重新运行</button>
      </div>
    </div>
  );
}
