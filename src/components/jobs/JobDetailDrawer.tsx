"use client";

import { AlertTriangle, Clock } from "lucide-react";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { EnvBadge, JobStatusBadge } from "@/components/ui/Badges";
import { formatDuration, formatShortDate, getScopeLabel } from "@/lib/format";
import type { ControlMJob, TimelineAxisMode } from "@/types/monitoring";

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
  if (!job) return null;

  const run = job.runs[runIndex] ?? job.runs[job.runs.length - 1];
  const displayDate =
    axisMode === "ODATE" ? formatShortDate(run.odateIso) : formatShortDate(run.dateIso);

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
    </DetailDrawer>
  );
}
