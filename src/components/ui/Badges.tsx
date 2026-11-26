import type { Environment, JobStatus } from "@/types/monitoring";

export function EnvBadge({ env }: { env: Environment }) {
  const styles =
    env === "prd"
      ? "border-primary/40 text-primary bg-primary/5"
      : "border-warning/50 text-warning bg-warning/5";

  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase leading-none ${styles}`}
    >
      {env}
    </span>
  );
}

const JOB_STATUS_META: Record<JobStatus, { label: string; className: string }> = {
  OK: { label: "Ended OK", className: "border-success/50 text-success" },
  NOT_OK: { label: "Ended Not OK", className: "border-error/60 text-error" },
  RUNNING: { label: "Executando", className: "border-warning/60 text-warning" },
  PENDING: { label: "Pendente", className: "border-border text-muted" },
  HELD: { label: "Em Hold", className: "border-primary/50 text-primary" },
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const meta = JOB_STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

export function JobStatusDot({
  status,
  anomaly,
  title,
  onClick,
}: {
  status: JobStatus;
  anomaly?: boolean;
  title?: string;
  onClick?: () => void;
}) {
  const colorMap: Record<JobStatus, string> = {
    OK: "bg-success",
    NOT_OK: "bg-error",
    RUNNING: "bg-warning animate-pulse",
    PENDING: "bg-muted/45",
    HELD: "bg-primary/65",
  };

  const anomalyRing =
    anomaly && status === "OK"
      ? "ring-2 ring-warning ring-offset-1 ring-offset-surface"
      : "";

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-block h-3 w-3 rounded-full transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-primary ${colorMap[status]} ${anomalyRing}`}
    />
  );
}
