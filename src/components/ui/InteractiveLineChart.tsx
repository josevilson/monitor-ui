"use client";

import { useRef, useState } from "react";
import { formatCompactNumber, formatFullNumber } from "@/lib/format";
import type { JobStatPoint, VolumetryStatPoint } from "@/types/monitoring";

type InteractiveLineChartProps =
  | {
      mode: "job";
      points: JobStatPoint[];
    }
  | {
      mode: "kafka";
      points: VolumetryStatPoint[];
    };

/**
 * Minimalist responsive SVG line chart with vertical guide and hover tooltip per point.
 */
export function InteractiveLineChart(props: InteractiveLineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [tooltipLeft, setTooltipLeft] = useState<number>(12);

  const { points, mode } = props;

  if (points.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-background py-8 text-center text-[11px] text-muted">
        Nenhum dado disponível para o período selecionado.
      </div>
    );
  }

  const width = 600;
  const height = 176;
  const padL = 44;
  const padR = 16;
  const padT = 16;
  const padB = 26;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const xFor = (i: number) =>
    points.length <= 1
      ? padL + plotW / 2
      : padL + (i / (points.length - 1)) * plotW;

  const yMax =
    mode === "job"
      ? 100
      : Math.max(
          ...props.points.map((p) => Math.max(p.kafdropCount, p.databricksCount)),
          1
        ) * 1.1;

  const yFor = (val: number) => padT + plotH - (val / yMax) * plotH;

  const handleHover = (idx: number, clientX: number) => {
    setHoverIdx(idx);
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return;
    const clamped = Math.min(Math.max(8, clientX - box.left - 95), box.width - 210);
    setTooltipLeft(clamped);
  };

  const labelStep = Math.max(1, Math.ceil(points.length / 8));
  const hitWidth = Math.max(16, plotW / Math.max(points.length, 1));

  const hoveredJob =
    mode === "job" && hoverIdx !== null ? props.points[hoverIdx] : null;
  const hoveredKafka =
    mode === "kafka" && hoverIdx !== null ? props.points[hoverIdx] : null;

  return (
    <div
      ref={containerRef}
      className="relative rounded-xl border border-border bg-background p-3"
      onMouseLeave={() => setHoverIdx(null)}
    >
      <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full overflow-visible">
        {/* Horizontal dashed reference lines */}
        {[0, 0.5, 1].map((t) => {
          const y = padT + plotH * (1 - t);
          const lbl =
            mode === "job"
              ? `${Math.round(t * 100)}%`
              : formatCompactNumber(Math.round(yMax * t));
          return (
            <g key={t}>
              <line
                x1={padL}
                y1={y}
                x2={width - padR}
                y2={y}
                stroke="var(--border)"
                strokeDasharray="3 3"
              />
              <text
                x={padL - 6}
                y={y + 3}
                textAnchor="end"
                fill="var(--fg-muted)"
                fontSize="9"
                fontFamily="var(--font-geist-mono), monospace"
              >
                {lbl}
              </text>
            </g>
          );
        })}

        {/* Vertical guide on hover */}
        {hoverIdx !== null && (
          <line
            x1={xFor(hoverIdx)}
            y1={padT}
            x2={xFor(hoverIdx)}
            y2={padT + plotH}
            stroke="var(--fg-muted)"
            strokeOpacity="0.35"
            strokeDasharray="2 2"
          />
        )}

        {/* Series Lines */}
        {mode === "job" ? (
          <polyline
            fill="none"
            stroke="var(--success)"
            strokeWidth="2"
            points={props.points
              .map((p, i) => `${xFor(i)},${yFor(p.okRate)}`)
              .join(" ")}
          />
        ) : (
          <>
            <polyline
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2"
              points={props.points
                .map((p, i) => `${xFor(i)},${yFor(p.kafdropCount)}`)
                .join(" ")}
            />
            <polyline
              fill="none"
              stroke="var(--success)"
              strokeWidth="2"
              points={props.points
                .map((p, i) => `${xFor(i)},${yFor(p.databricksCount)}`)
                .join(" ")}
            />
          </>
        )}

        {/* Point Markers & Hover Columns */}
        {points.map((p, i) => {
          const cx = xFor(i);
          const isHovered = hoverIdx === i;

          if (mode === "job") {
            const jp = p as JobStatPoint;
            const cy = yFor(jp.okRate);
            const dotColor =
              jp.notOkCount > 0 && jp.okRate < 100
                ? jp.okRate === 0
                  ? "var(--error)"
                  : "var(--warning)"
                : jp.pendingCount > 0 || jp.runningCount > 0
                  ? "var(--warning)"
                  : "var(--success)";

            return (
              <g key={`${jp.label}-${i}`}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 5.5 : 3.5}
                  fill={dotColor}
                  stroke="var(--surface)"
                  strokeWidth="1.5"
                  className="pointer-events-none transition-all"
                />
                <rect
                  x={cx - hitWidth / 2}
                  y={padT}
                  width={hitWidth}
                  height={plotH}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={(e) => handleHover(i, e.clientX)}
                  onMouseMove={(e) => handleHover(i, e.clientX)}
                />
              </g>
            );
          }

          const kp = p as VolumetryStatPoint;
          const cyK = yFor(kp.kafdropCount);
          const cyD = yFor(kp.databricksCount);
          const dColor =
            kp.status === "OK"
              ? "var(--success)"
              : kp.status === "DIFF"
                ? "var(--warning)"
                : "var(--error)";

          return (
            <g key={`${kp.label}-${i}`}>
              <circle
                cx={cx}
                cy={cyK}
                r={isHovered ? 5 : 3.2}
                fill="var(--primary)"
                stroke="var(--surface)"
                strokeWidth="1.5"
                className="pointer-events-none transition-all"
              />
              <circle
                cx={cx}
                cy={cyD}
                r={isHovered ? 5 : 3.2}
                fill={dColor}
                stroke="var(--surface)"
                strokeWidth="1.5"
                className="pointer-events-none transition-all"
              />
              <rect
                x={cx - hitWidth / 2}
                y={padT}
                width={hitWidth}
                height={plotH}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={(e) => handleHover(i, e.clientX)}
                onMouseMove={(e) => handleHover(i, e.clientX)}
              />
            </g>
          );
        })}

        {/* X Axis Labels */}
        {points.map((p, i) => {
          if (i % labelStep !== 0 && i !== points.length - 1) return null;
          return (
            <text
              key={`lbl-${p.label}-${i}`}
              x={xFor(i)}
              y={height - 6}
              textAnchor="middle"
              fill="var(--fg-muted)"
              fontSize="9"
              fontFamily="var(--font-geist-mono), monospace"
            >
              {p.label}
            </text>
          );
        })}
      </svg>

      {/* Interactive Tooltip */}
      {(hoveredJob || hoveredKafka) && (
        <div
          style={{ left: tooltipLeft, top: 8 }}
          className="pointer-events-none absolute z-20 min-w-[190px] rounded-lg border border-border bg-surface px-3 py-2 text-[11px] shadow-xl"
        >
          {hoveredJob && (
            <>
              <div className="mb-1 font-mono font-semibold text-foreground">
                {hoveredJob.label}
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted">Taxa OK:</span>
                <span className="font-mono font-semibold text-success">
                  {hoveredJob.okRate.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted">Ended OK:</span>
                <span className="font-mono text-success">{hoveredJob.okCount}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted">Ended Not OK:</span>
                <span className="font-mono text-error">{hoveredJob.notOkCount}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted">Executando:</span>
                <span className="font-mono text-warning">{hoveredJob.runningCount}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted">Pendente:</span>
                <span className="font-mono text-muted">{hoveredJob.pendingCount}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted">OK Duração Anômala:</span>
                <span className="font-mono text-warning">{hoveredJob.anomalyCount}</span>
              </div>
            </>
          )}

          {hoveredKafka && (
            <>
              <div className="mb-1 font-mono font-semibold text-foreground">
                {hoveredKafka.label}
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted">Kafdrop:</span>
                <span className="font-mono font-semibold text-primary">
                  {formatFullNumber(hoveredKafka.kafdropCount)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted">Databricks:</span>
                <span className="font-mono font-semibold text-success">
                  {formatFullNumber(hoveredKafka.databricksCount)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted">Aderência:</span>
                <span className="font-mono text-foreground">
                  {hoveredKafka.kafdropCount > 0
                    ? `${(
                        (hoveredKafka.databricksCount / hoveredKafka.kafdropCount) *
                        100
                      ).toFixed(1)}%`
                    : "0.0%"}
                </span>
              </div>
              <div className="mt-0.5 flex justify-between gap-4 border-t border-border pt-1 text-[10px] text-muted">
                <span>Snapshot:</span>
                <span className="font-mono">
                  {hoveredKafka.dateIso ? `${hoveredKafka.label} ${hoveredKafka.snapshotAt}` : hoveredKafka.snapshotAt}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
