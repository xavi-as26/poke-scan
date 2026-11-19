import { useMemo, useState } from 'react';

interface Pt { label: string; value: number; value2?: number }
export function LineChart({ data, height = 180, format }: { data: Pt[]; height?: number; format: (v: number) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 600, H = height, P = 8;
  const { path, area, path2, xs, ys } = useMemo(() => {
    const vals = data.flatMap(d => [d.value, d.value2 ?? d.value]);
    const min = Math.min(...vals), max = Math.max(...vals);
    const span = max - min || Math.max(1, max * 0.1);
    const lo = min - span * 0.1, hi = max + span * 0.1;
    const xs = data.map((_, i) => data.length === 1 ? W / 2 : P + (i * (W - 2 * P)) / (data.length - 1));
    const y = (v: number) => H - P - ((v - lo) / (hi - lo)) * (H - 2 * P);
    const ys = data.map(d => y(d.value));
    const path = xs.map((x, i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join('');
    const area = `${path}L${xs[xs.length - 1]},${H}L${xs[0]},${H}Z`;
    const path2 = data.some(d => d.value2 != null)
      ? xs.map((x, i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y(data[i].value2 ?? data[i].value).toFixed(1)}`).join('') : '';
    return { path, area, path2, xs, ys };
  }, [data, H]);

  if (!data.length) return <div className="chart-empty">Sin datos todavía</div>;
  const up = data[data.length - 1].value >= data[0].value;
  const h = hover ?? data.length - 1;
  return (
    <div className="chart">
      <div className="chart-tip"><b>{format(data[h].value)}</b> <span>{data[h].label}</span></div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height }}
        onMouseLeave={() => setHover(null)}
        onPointerMove={e => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const x = ((e.clientX - r.left) / r.width) * W;
          let best = 0; xs.forEach((xx, i) => { if (Math.abs(xx - x) < Math.abs(xs[best] - x)) best = i; });
          setHover(best);
        }}>
        <defs>
          <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={up ? 'var(--up)' : 'var(--down)'} stopOpacity="0.35" />
            <stop offset="1" stopColor={up ? 'var(--up)' : 'var(--down)'} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#g)" />
        {path2 && <path d={path2} fill="none" stroke="var(--muted)" strokeDasharray="4 4" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />}
        <path d={path} fill="none" stroke={up ? 'var(--up)' : 'var(--down)'} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        <line x1={xs[h]} x2={xs[h]} y1={0} y2={H} stroke="var(--line)" vectorEffect="non-scaling-stroke" />
        <circle cx={xs[h]} cy={ys[h]} r="4" fill={up ? 'var(--up)' : 'var(--down)'} />
      </svg>
    </div>
  );
}
