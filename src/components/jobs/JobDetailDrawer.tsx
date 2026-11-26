"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Clock } from "lucide-react";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { EnvBadge, JobStatusBadge } from "@/components/ui/Badges";
import { StatsControlsBar } from "@/components/ui/StatsControlsBar";
import { InteractiveLineChart } from "@/components/ui/InteractiveLineChart";
import { formatDuration, formatShortDate, getScopeLabel } from "@/lib/format";
import { getJobStatsSeries } from "@/lib/stats-history";
import type {
  ControlMJob,
  StatsPeriodPreset,
  StatsViewMode,
  TimelineAxisMode,
} from "@/types/monitoring";

interface JobDetailDrawerProps {
  job: ControlMJob | null;
  runIndex: number;
  axisMode: TimelineAxisMode;
  onClose: () => void;
}

export function JobDetailDrawer({
  job,
  runIndex,
  axisMode,
  onClose,
}: JobDetailDrawerProps) {
  const [periodPreset, setPeriodPreset] = useState<StatsPeriodPreset>("week");
  const [viewMode, setViewMode] = useState<StatsViewMode>("chart");
  const [startDate, setStartDate] = useState("2026-11-19");
  const [endDate, setEndDate] = useState("2026-11-25");

  const statsBundle = useMemo(
    () => (job ? getJobStatsSeries(job) : null),
    [job]
  );

  const normalizedRange = useMemo(() => {
    const start = startDate <= endDate ? startDate : endDate;
    const end = startDate <= endDate ? endDate : startDate;
    return { start, end };
  }, [startDate, endDate]);

  const points = useMemo(() => {
    if (!statsBundle) return [];
    if (periodPreset === "year") return statsBundle.yearly;
    return statsBundle.daily.filter(
      (d) =>
        d.dateIso &&
        d.dateIso >= normalizedRange.start &&
        d.dateIso <= normalizedRange.end
    );
  }, [statsBundle, periodPreset, normalizedRange]);

  if (!job || !statsBundle) return null;

  const run = job.runs[runIndex] ?? job.runs[job.runs.length - 1];
  const displayDate =
    axisMode === "ODATE"
      ? formatShortDate(run.odateIso)
      : formatShortDate(run.dateIso);

  const okTotal = points.reduce((acc, p) => acc + p.okCount, 0);
  const notOkTotal = points.reduce((acc, p) => acc + p.notOkCount, 0);
  const runningTotal = points.reduce((acc, p) => acc + p.runningCount, 0);
  const pendingTotal = points.reduce((acc, p) => acc + p.pendingCount, 0);
  const anomalyTotal = points.reduce((acc, p) => acc + p.anomalyCount, 0);
  const totalExecs = Math.max(
    okTotal + notOkTotal + runningTotal + pendingTotal,
    1
  );
  const successRate = ((okTotal / totalExecs) * 100).toFixed(1);

  const handlePresetChange = (preset: "week" | "month" | "year") => {
    setPeriodPreset(preset);
    const { daily, maxDate, minDate } = statsBundle;
    if (preset === "week") {
      const idx = Math.max(0, daily.length - 7);
      setStartDate(daily[idx]?.dateIso ?? "2026-11-19");
      setEndDate(maxDate);
    } else if (preset === "month") {
      setStartDate(daily[0]?.dateIso ?? "2026-10-27");
      setEndDate(maxDate);
    } else {
      setStartDate(minDate);
      setEndDate(maxDate);
    }
  };

  const metricRows = [
    {
      label: "Ended OK",
      dotClass: "bg-success",
      valClass: "text-success",
      get: (p: (typeof points)[number]) => p.okCount,
      total: okTotal,
    },
    {
      label: "Ended Not OK",
      dotClass: "bg-error",
      valClass: "text-error font-semibold",
      get: (p: (typeof points)[number]) => p.notOkCount,
      total: notOkTotal,
    },
    {
      label: "Executando",
      dotClass: "bg-warning",
      valClass: "text-warning font-semibold",
      get: (p: (typeof points)[number]) => p.runningCount,
      total: runningTotal,
    },
    {
      label: "Pendente",
      dotClass: "bg-muted/50",
      valClass: "text-foreground",
      get: (p: (typeof points)[number]) => p.pendingCount,
      total: pendingTotal,
    },
    {
      label: "OK c/ Duração Anômala",
      dotClass: "bg-success ring-2 ring-warning",
      valClass: "text-warning font-semibold",
      get: (p: (typeof points)[number]) => p.anomalyCount,
      total: anomalyTotal,
    },
  ];

  return (
    <DetailDrawer
      open={Boolean(job)}
      onClose={onClose}
      kicker={`Control-M · ${job.env.toUpperCase()} · ${displayDate} (${axisMode})`}
      title={job.jobName}
    >
      <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
        <div className="flex items-center gap-2">
          <EnvBadge env={job.env} />
          <span className="text-muted">Status em {displayDate}</span>
        </div>
        <JobStatusBadge status={run.status} />
      </div>

      {run.anomaly && run.status === "OK" && (
        <div className="flex items-start gap-2.5 rounded-lg border border-warning/50 bg-warning/5 p-3">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div>
            <div className="font-semibold text-warning">
              Duração Anômala Detectada
            </div>
            <p className="mt-0.5 text-[11px] text-muted">
              Job finalizou OK, porém com tempo ({formatDuration(run.durationSec)}) muito acima da média histórica ({formatDuration(job.avgDurationSec)}).
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border p-3">
          <div className="text-[11px] text-muted">Pasta (Folder)</div>
          <div className="mt-1 font-mono font-medium text-foreground">{job.folder}</div>
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="text-[11px] text-muted">Processo / Escopo</div>
          <div className="mt-1 font-medium text-foreground">{job.processName}</div>
          <div className="mt-0.5 text-[10px] text-muted">
            {getScopeLabel(job.monitoredEnvs)}
          </div>
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="text-[11px] text-muted">Order ID · ODATE</div>
          <div className="mt-1 font-mono text-foreground">
            {run.orderId} · {run.odateIso}
          </div>
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="text-[11px] text-muted">Duração · Média</div>
          <div className="mt-1 font-mono tabular-nums text-foreground">
            {formatDuration(run.durationSec)} ·{" "}
            <span className="text-muted">{formatDuration(job.avgDurationSec)}</span>
          </div>
        </div>
        <div className="col-span-2 rounded-lg border border-border p-3">
          <div className="text-[11px] text-muted">Agente / Execução Real</div>
          <div className="mt-1 flex items-center justify-between font-mono text-foreground">
            <span>{job.host}</span>
            <span className="text-muted">
              {run.dateIso} {run.startTime ? `(${run.startTime} → ${run.endTime})` : ""}
            </span>
          </div>
        </div>
      </div>

      {run.waitingFor && (
        <div className="flex items-start gap-2.5 rounded-lg border border-warning/40 bg-background p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div>
            <div className="font-semibold text-warning">
              Motivo da Pendência / Bloqueio
            </div>
            <div className="mt-1 font-mono text-[11px] text-foreground">
              {run.waitingFor}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="font-semibold text-foreground">Sysout / Log Resumido</div>
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-border bg-background p-3 font-mono text-[11px] leading-relaxed text-foreground">
          {run.logSnippet}
        </pre>
      </div>

      {/* Bottom Statistics Section: Execution OK vs Not OK + All 5 Statuses */}
      <div className="space-y-3.5 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-foreground">
            Estatísticas de Execução (Todos os Status)
          </h3>
          <span className="font-mono text-[11px] text-muted">
            {points.length} {periodPreset === "year" ? "meses" : "dias"}
          </span>
        </div>

        <StatsControlsBar
          startDate={normalizedRange.start}
          endDate={normalizedRange.end}
          minDate={statsBundle.minDate}
          maxDate={statsBundle.maxDate}
          periodPreset={periodPreset}
          viewMode={viewMode}
          onStartDateChange={(val) => {
            setPeriodPreset("custom");
            setStartDate(val);
          }}
          onEndDateChange={(val) => {
            setPeriodPreset("custom");
            setEndDate(val);
          }}
          onPresetChange={handlePresetChange}
          onViewModeChange={setViewMode}
        />

        <div className="grid grid-cols-3 gap-3 font-mono tabular-nums">
          <div className="rounded-lg border border-border bg-background p-3">
            <div className="font-sans text-[11px] text-muted">Ended OK</div>
            <div className="mt-1 text-base font-semibold text-success">
              {successRate}%
            </div>
            <div className="mt-0.5 font-sans text-[10px] text-muted">
              {okTotal} de {totalExecs} execuções
            </div>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <div className="font-sans text-[11px] text-muted">
              Not OK · Pendente · Exec.
            </div>
            <div className="mt-1 text-base font-semibold text-error">
              {notOkTotal}{" "}
              <span className="text-xs font-normal text-muted">
                · {pendingTotal} · {runningTotal}
              </span>
            </div>
            <div className="mt-0.5 font-sans text-[10px] text-muted">
              {anomalyTotal} OK c/ duração anômala
            </div>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <div className="font-sans text-[11px] text-muted">Período</div>
            <div className="mt-1.5 font-sans text-xs font-semibold text-foreground">
              {periodPreset === "week"
                ? "Semanal (7d)"
                : periodPreset === "month"
                  ? "Mensal (30d)"
                  : periodPreset === "year"
                    ? "Anual (12m)"
                    : "Manual"}
            </div>
          </div>
        </div>

        {viewMode === "chart" ? (
          <InteractiveLineChart mode="job" points={points} />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-background">
            <table className="w-full border-collapse text-left text-[11px]">
              <thead className="border-b border-border text-muted">
                <tr>
                  <th className="sticky left-0 z-10 min-w-[175px] border-r border-border bg-background px-3 py-2 font-medium">
                    Métrica
                  </th>
                  {points.map((p, idx) => (
                    <th
                      key={`${p.label}-${idx}`}
                      className="whitespace-nowrap px-2.5 py-2 text-right font-mono font-medium tabular-nums"
                    >
                      {p.label}
                    </th>
                  ))}
                  <th className="sticky right-0 z-10 min-w-[76px] border-l border-border bg-background px-3 py-2 text-right font-medium">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono tabular-nums">
                {metricRows.map((row) => (
                  <tr key={row.label}>
                    <td className="sticky left-0 z-10 whitespace-nowrap border-r border-border bg-background px-3 py-1.5 font-sans font-medium text-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${row.dotClass}`} />
                        <span>{row.label}</span>
                      </span>
                    </td>
                    {points.map((p, idx) => {
                      const val = row.get(p);
                      return (
                        <td
                          key={`${row.label}-${idx}`}
                          className={`px-2.5 py-1.5 text-right ${
                            val > 0 ? row.valClass : "text-muted/50"
                          }`}
                        >
                          {val}
                        </td>
                      );
                    })}
                    <td
                      className={`sticky right-0 z-10 border-l border-border bg-background px-3 py-1.5 text-right font-semibold ${
                        row.total > 0 ? row.valClass : "text-muted"
                      }`}
                    >
                      {row.total}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="sticky left-0 z-10 border-r border-border bg-background px-3 py-1.5 font-sans font-medium text-muted">
                    Taxa OK
                  </td>
                  {points.map((p, idx) => (
                    <td
                      key={`rate-${idx}`}
                      className={`px-2.5 py-1.5 text-right ${
                        p.okRate < 100 ? "text-warning" : "text-muted"
                      }`}
                    >
                      {p.okRate.toFixed(0)}%
                    </td>
                  ))}
                  <td className="sticky right-0 z-10 border-l border-border bg-background px-3 py-1.5 text-right font-semibold text-foreground">
                    {successRate}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DetailDrawer>
  );
}
