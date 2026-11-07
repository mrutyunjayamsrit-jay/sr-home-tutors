import { useState } from "react";
import { Card } from "@/components/ui";

interface Point {
  /** "YYYY-MM-DD" */
  date: string;
  value: number;
}

interface AttendanceTrendChartProps {
  title: string;
  description: string;
  points: Point[];
  color: string;
  loading?: boolean;
}

const WIDTH = 320;
const HEIGHT = 170;
const PADDING_TOP = 28;
const PADDING_BOTTOM = 28;
const PADDING_X = 12;
const BAR_RADIUS = 4;

function formatDayLabel(dateKey: string) {
  // dateKey is an IST calendar date ("YYYY-MM-DD") — parsed as UTC midnight
  // purely to format the label, never to re-derive "today" from it.
  const [y, m, d] = dateKey.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** Rounded-top, flat-baseline bar path — the mark spec's "4px rounded data-ends anchored to the baseline," not a fully-rounded rect. */
function barPath(x: number, y: number, w: number, baseline: number, r: number) {
  const radius = Math.min(r, w / 2, Math.max(baseline - y, 0));
  if (radius <= 0) return `M${x},${baseline} L${x},${y} L${x + w},${y} L${x + w},${baseline} Z`;
  return [
    `M${x},${baseline}`,
    `L${x},${y + radius}`,
    `Q${x},${y} ${x + radius},${y}`,
    `L${x + w - radius},${y}`,
    `Q${x + w},${y} ${x + w},${y + radius}`,
    `L${x + w},${baseline}`,
    "Z",
  ].join(" ");
}

/**
 * A single-series "present count per day" bar chart — self-contained inline
 * SVG (no charting library in this app yet). Deliberately one hue, no
 * legend: a lone series names itself through the title, per the dataviz
 * skill's own exception for single-series charts.
 */
export function AttendanceTrendChart({ title, description, points, color, loading }: AttendanceTrendChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const plotWidth = WIDTH - PADDING_X * 2;
  const plotHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const baseline = HEIGHT - PADDING_BOTTOM;
  const maxValue = Math.max(1, ...points.map((p) => p.value));
  const barWidth = points.length ? plotWidth / points.length - 10 : 0;

  return (
    <Card>
      <h3 style={{ margin: "0 0 2px", fontSize: "var(--text-base)", fontWeight: 700 }}>{title}</h3>
      <p style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>{description}</p>

      {loading ? (
        <div style={{ height: HEIGHT, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)", fontSize: "var(--text-sm)" }}>
          Loading…
        </div>
      ) : points.every((p) => p.value === 0) ? (
        <div style={{ height: HEIGHT, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)", fontSize: "var(--text-sm)" }}>
          No completed classes in the last 5 days yet.
        </div>
      ) : (
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height={HEIGHT} role="img" aria-label={`${title}: ${points.map((p) => `${formatDayLabel(p.date)} ${p.value}`).join(", ")}`}>
          {/* Recessive baseline — the only axis line this chart needs. */}
          <line x1={PADDING_X} y1={baseline} x2={WIDTH - PADDING_X} y2={baseline} stroke="var(--border-default)" strokeWidth={1} />

          {points.map((p, i) => {
            const x = PADDING_X + i * (plotWidth / points.length) + 5;
            const barHeight = (p.value / maxValue) * plotHeight;
            const y = baseline - barHeight;
            const isHovered = hoverIndex === i;
            return (
              <g key={p.date} onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)} style={{ cursor: "default" }}>
                <title>{`${formatDayLabel(p.date)}: ${p.value} present`}</title>
                {/* Oversized transparent hit target — the mark itself stays thin. */}
                <rect x={x - 5} y={PADDING_TOP} width={barWidth + 10} height={plotHeight} fill="transparent" />
                <path d={barPath(x, y, barWidth, baseline, BAR_RADIUS)} fill={color} opacity={isHovered ? 1 : 0.85} />
                <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--text-secondary)">
                  {p.value}
                </text>
                <text x={x + barWidth / 2} y={HEIGHT - 8} textAnchor="middle" fontSize={10} fill="var(--text-tertiary)">
                  {formatDayLabel(p.date)}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </Card>
  );
}
