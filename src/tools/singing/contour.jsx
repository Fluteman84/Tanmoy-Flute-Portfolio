import { useEffect, useMemo, useRef, useState } from "react";
import { STEP, semitones, swara } from "./pitch.mjs";

export function Contour({ track, sa, start, end, time, marks, seek }) {
  const frame = useRef(null);
  const [width, setWidth] = useState(700);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry.contentRect.width)));
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);
  const height = width < 450 ? 238 : 270,
    left = 76,
    right = 12,
    top = 22,
    bottom = 30;
  const { path, rows, x, y } = useMemo(() => {
    const lo = Math.max(0, Math.floor(start / STEP)),
      hi = Math.min(track.length, Math.ceil(end / STEP));
    const degrees = Array.from(track.subarray(lo, hi), (hz) => (hz ? semitones(hz, sa) : null));
    const voiced = degrees.filter((v) => v !== null);
    const low = Math.floor(Math.min(0, ...voiced)) - 1;
    const high = Math.max(low + 6, Math.ceil(Math.max(voiced.length ? 0 : 7, ...voiced)) + 1);
    const x = (t) => left + ((t - start) / (end - start)) * (width - left - right);
    const y = (n) => top + ((high - n) / (high - low)) * (height - top - bottom);
    let path = "",
      pen = false;
    degrees.forEach((n, j) => {
      if (n === null) {
        pen = false;
        return;
      }
      path += (pen ? "L" : "M") + x((lo + j) * STEP).toFixed(1) + "," + y(n).toFixed(1);
      pen = true;
    });
    const used = new Set(voiced.map(Math.round));
    const rows = Array.from({ length: high - low + 1 }, (_, j) => low + j).filter(
      (n) => n === 0 || used.has(n),
    );
    return { path, rows, x, y };
  }, [track, sa, start, end, width, height]);
  const frequency = track[Math.round(time / STEP)];
  const active = frequency ? Math.round(semitones(frequency, sa)) : null;
  const labeled = new Set();
  let lastLabel = -Infinity;
  for (const row of rows) {
    if (active !== null && row !== active && Math.abs(y(row) - y(active)) < 15) continue;
    if (Math.abs(y(row) - lastLabel) >= 15) {
      labeled.add(row);
      lastLabel = y(row);
    }
  }
  const visibleMarks = marks.filter((m) => m.time >= start && m.time < end);
  return (
    <figure className="contour" ref={frame}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Estimated sargam from ${start.toFixed(1)} to ${end.toFixed(1)} seconds`}
        onClick={(event) => {
          const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
            event.currentTarget.getScreenCTM().inverse(),
          );
          seek(start + Math.max(0, Math.min(1, (point.x - left) / (width - left - right))) * (end - start));
        }}
      >
        {rows.map((n) => (
          <g key={n}>
            <line
              x1={left}
              x2={width - right}
              y1={y(n)}
              y2={y(n)}
              className={n === active ? "pitch-rule active" : "pitch-rule"}
            />
            {(n === active || labeled.has(n)) && (
              <text x={left - 10} y={y(n) + 4} textAnchor="end">
                {swara(n)}
              </text>
            )}
          </g>
        ))}
        {visibleMarks.map((m) => (
          <rect
            key={m.time}
            x={x(m.time)}
            y={top}
            width={Math.min(x(end), x(m.time + 0.22)) - x(m.time)}
            height={height - top - bottom}
            fill={m.label.endsWith("meend") ? "#8cc8bd" : "#d99bb3"}
            opacity=".16"
          >
            <title>{m.label}</title>
          </rect>
        ))}
        <path d={path} fill="none" stroke="#f1c582" strokeWidth="2.2" strokeLinejoin="round" />
        {time >= start && time <= end && (
          <line x1={x(time)} x2={x(time)} y1="12" y2={height - bottom} stroke="#fff" />
        )}
        {[0, 1, 2, 3, 4].map((i) => {
          const t = start + ((end - start) * i) / 4;
          return (
            <text key={i} x={x(t)} y={height - 7} textAnchor={i === 4 ? "end" : "middle"}>
              {t.toFixed(1)}s
            </text>
          );
        })}
      </svg>
      <figcaption>Gold traces the measured pitch. Gaps mark uncertain or unvoiced audio.</figcaption>
      {visibleMarks.length > 0 && (
        <div className="ornaments">
          {visibleMarks.map((m) => (
            <button key={m.time} onClick={() => seek(m.time)}>
              {m.label} · {m.time.toFixed(2)}s
            </button>
          ))}
        </div>
      )}
    </figure>
  );
}
