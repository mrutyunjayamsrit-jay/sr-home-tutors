import { useState } from "react";
import { Card } from "@/components/ui";
import type { ProfitLossTrendPoint } from "@/features/reports/api";

interface NetProfitTrendChartProps {
  points: ProfitLossTrendPoint[];
  loading?: boolean;
}

const WIDTH = 640;
const HEIGHT = 200;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 34;
const PADDING_X = 16;
const BAR_RADIUS = 4;

function formatMonthLabel(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" });
}

function formatMoney(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  return `${sign}₹${abs.toLocaleString("en-IN")}`;
}

/** Rounded data-end on whichever side the bar grows toward (up for a profit month, down for a loss month) — never rounded on the end anchored to the zero line. */
function barPath(x: number, w: number, barTop: number, barBottom: number, r: number, growsUp: boolean) {
  const radius = Math.min(r, w / 2, Math.max(barBottom - barTop, 0));
  if (radius <= 0) return `M${x},${barBottom} L${x},${barTop} L${x + w},${barTop} L${x + w},${barBottom} Z`;
  if (growsUp) {
    return [
      `M${x},${barBottom}`,
      `L${x},${barTop + radius}`,
      `Q${x},${barTop} ${x + radius},${barTop}`,
      `L${x + w - radius},${barTop}`,
      `Q${x + w},${barTop} ${x + w},${barTop + radius}`,
      `L${x + w},${barBottom}`,
      "Z",
    ].join(" ");
  }
  return [
    `M${x},${barTop}`,
    `L${x},${barBottom - radius}`,
    `Q${x},${barBottom} ${x + radius},${barBottom}`,
    `L${x + w - radius},${barBottom}`,
    `Q${x + w},${barBottom} ${x + w},${barBottom - radius}`,
    `L${x + w},${barTop}`,
    "Z",
  ].join(" ");
}

/**
 * One series (net profit per month), but sign-colored per bar — a month in
 * the red reads as loss, a month in the black reads as profit. Avoids the
 * 3-series-same-chart problem (Revenue/Payouts/Expenses in this app's muted
 * brand palette don't pass the dataviz skill's CVD/normal-vision checks
 * together) by plotting the one number that actually answers "are we doing
 * better or worse" — Fees/Payouts/Expenses stay as the static P&L card's
 * single-window numbers above.
 */
export function NetProfitTrendChart({ points, loading }: NetProfitTrendChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const plotWidth = WIDTH - PADDING_X * 2;
  const plotHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const maxPositive = Math.max(0, ...points.map((p) => p.netProfit));
  const maxNegative = Math.max(0, ...points.map((p) => -p.netProfit));
  const totalSpan = maxPositive + maxNegative || 1;
  // Where the zero line sits — proportional to how much headroom the worst
  // loss month needs vs. the best profit month, so both fit without one
  // dwarfing the other.
  const zeroY = PADDING_TOP + plotHeight * (maxPositive / totalSpan);
  const barWidth = points.length ? plotWidth / points.length - 10 : 0;

  return (
    <Card>
      <h3 style={{ margin: "0 0 2px", fontSize: "var(--text-base)", fontWeight: 700 }}>Net profit trend</h3>
      <p style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
        Fees received minus tutor payouts and branch expenses, last {points.length || 6} months
      </p>

      {loading ? (
        <div style={{ height: HEIGHT, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)", fontSize: "var(--text-sm)" }}>
          Loading…
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          width="100%"
          height={HEIGHT}
          role="img"
          aria-label={`Net profit by month: ${points.map((p) => `${formatMonthLabel(p.month)} ${formatMoney(p.netProfit)}`).join(", ")}`}
        >
          <line x1={PADDING_X} y1={zeroY} x2={WIDTH - PADDING_X} y2={zeroY} stroke="var(--border-default)" strokeWidth={1} />

          {points.map((p, i) => {
            const x = PADDING_X + i * (plotWidth / points.length) + 5;
            const growsUp = p.netProfit >= 0;
            const barExtent = (Math.abs(p.netProfit) / (growsUp ? maxPositive || 1 : maxNegative || 1)) * (growsUp ? zeroY - PADDING_TOP : HEIGHT - PADDING_BOTTOM - zeroY);
            const barTop = growsUp ? zeroY - barExtent : zeroY;
            const barBottom = growsUp ? zeroY : zeroY + barExtent;
            const color = growsUp ? "var(--color-success-500)" : "var(--color-danger-500)";
            const isHovered = hoverIndex === i;
            const labelY = growsUp ? barTop - 6 : barBottom + 14;

            return (
              <g key={p.month} onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)} style={{ cursor: "default" }}>
                <title>{`${formatMonthLabel(p.month)}: ${formatMoney(p.netProfit)} net`}</title>
                <rect x={x - 5} y={PADDING_TOP} width={barWidth + 10} height={plotHeight} fill="transparent" />
                <path d={barPath(x, barWidth, barTop, barBottom, BAR_RADIUS, growsUp)} fill={color} opacity={isHovered ? 1 : 0.85} />
                <text x={x + barWidth / 2} y={labelY} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--text-secondary)">
                  {formatMoney(p.netProfit)}
                </text>
                <text x={x + barWidth / 2} y={HEIGHT - 10} textAnchor="middle" fontSize={10} fill="var(--text-tertiary)">
                  {formatMonthLabel(p.month)}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </Card>
  );
}
