import { useEffect, useRef, useState } from 'react';

type Sample = { truth: number; measurement: number; estimate: number };

export default function KalmanLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [q, setQ] = useState(0.08);
  const [r, setR] = useState(1.6);
  const params = useRef({ q, r });
  const state = useRef({
    truth: 0.2,
    estimate: 0,
    covariance: 1,
    history: [] as Sample[],
    measurementError: 0,
    estimateError: 0,
    count: 0,
  });
  const [stats, setStats] = useState({ measurement: 0, estimate: 0 });

  useEffect(() => {
    params.current = { q, r };
  }, [q, r]);

  const reset = () => {
    state.current = {
      truth: 0.2,
      estimate: 0,
      covariance: 1,
      history: [],
      measurementError: 0,
      estimateError: 0,
      count: 0,
    };
    setStats({ measurement: 0, estimate: 0 });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();
    let frame = 0;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = 'rgba(47,107,255,.08)';
      ctx.lineWidth = 1;
      for (let x = 40; x < width - 20; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 16);
        ctx.lineTo(x, height - 26);
        ctx.stroke();
      }
      const mapX = (index: number, total: number) => 38 + (index / Math.max(1, total - 1)) * (width - 58);
      const mapY = (value: number) => height - 34 - (Math.max(-0.3, Math.min(1.5, value)) / 1.5) * (height - 60);
      const history = state.current.history;
      const total = history.length;
      if (total < 2) return;

      ctx.lineWidth = 1.4;
      ctx.strokeStyle = 'rgba(47,107,255,.65)';
      ctx.beginPath();
      history.forEach((sample, index) => {
        const x = mapX(index, total);
        const y = mapY(sample.truth);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255,122,69,.55)';
      ctx.beginPath();
      history.forEach((sample, index) => {
        const x = mapX(index, total);
        const y = mapY(sample.measurement);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      ctx.strokeStyle = '#7b61ff';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      history.forEach((sample, index) => {
        const x = mapX(index, total);
        const y = mapY(sample.estimate);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    };

    const tick = (now: number) => {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      const current = state.current;
      if (current.history.length < 480) {
        const { q: processNoise, r: measurementNoise } = params.current;
        current.truth += 0.22 * dt + (Math.random() - 0.5) * 0.012;
        const measurement = current.truth + (Math.random() - 0.5) * measurementNoise * 2;

        current.covariance += processNoise * dt;
        const gain = current.covariance / (current.covariance + measurementNoise);
        current.estimate += gain * (measurement - current.estimate);
        current.covariance *= 1 - gain;

        current.history.push({ truth: current.truth, measurement, estimate: current.estimate });
        current.measurementError += (measurement - current.truth) ** 2;
        current.estimateError += (current.estimate - current.truth) ** 2;
        current.count += 1;
        frame += 1;
        if (frame % 15 === 0) {
          setStats({
            measurement: Math.sqrt(current.measurementError / current.count),
            estimate: Math.sqrt(current.estimateError / current.count),
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
          <label>过程噪声 Q <b>{q.toFixed(2)}</b></label>
          <input type="range" aria-label="过程噪声 Q" min="0.01" max="1" step="0.01" value={q} onChange={(event) => setQ(Number(event.target.value))} />
        </div>
        <div className="lab-control">
          <label>测量噪声 R <b>{r.toFixed(2)}</b></label>
          <input type="range" aria-label="测量噪声 R" min="0.2" max="8" step="0.1" value={r} onChange={(event) => setR(Number(event.target.value))} />
        </div>
      </div>
      <div className="lab-stats">
        <span>测量 RMSE <b>{stats.measurement.toFixed(3)}</b></span>
        <span>估计 RMSE <b>{stats.estimate.toFixed(3)}</b></span>
        <span style={{ color: '#2f6bff' }}>蓝：真值</span>
        <span style={{ color: '#e87545' }}>橙：测量</span>
        <span style={{ color: '#7b61ff' }}>紫：估计</span>
      </div>
      <div className="lab-actions">
        <button type="button" onClick={reset}>重新运行</button>
      </div>
    </div>
  );
}
