"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { CONTROLM_DATES_ISO } from "@/data/mock-controlm";
import { EnvBadge, JobStatusBadge, JobStatusDot } from "@/components/ui/Badges";
import {
  ColumnFilterPopover,
  type FilterOption,
} from "@/components/jobs/ColumnFilterPopover";
import { JobDetailDrawer } from "@/components/jobs/JobDetailDrawer";
import { formatShortDate } from "@/lib/format";
import type {
  ControlMJob,
  EnvironmentFilter,
  JobGrouping,
  JobStatus,
  TimelineAxisMode,
} from "@/types/monitoring";

interface JobsTimelineViewProps {
  jobs: ControlMJob[];
  envFilter: EnvironmentFilter;
  searchQuery: string;
}

type StatusChipFilter = "ALL" | JobStatus;

const ALL_STATUS_META: {
  value: JobStatus;
  label: string;
  dotClass: string;
}[] = [
  { value: "OK", label: "Ended OK", dotClass: "bg-success" },
  { value: "NOT_OK", label: "Ended Not OK", dotClass: "bg-error" },
  { value: "RUNNING", label: "Executando", dotClass: "bg-warning" },
  { value: "PENDING", label: "Pendente", dotClass: "bg-muted/60" },
  { value: "HELD", label: "Em Hold", dotClass: "bg-primary/70" },
];

function worstStatus(statuses: JobStatus[]): JobStatus {
  if (statuses.includes("NOT_OK")) return "NOT_OK";
  if (statuses.includes("RUNNING")) return "RUNNING";
  if (statuses.includes("PENDING")) return "PENDING";
  if (statuses.includes("HELD")) return "HELD";
  return "OK";
}

export function JobsTimelineView({
  jobs,
  envFilter,
  searchQuery,
}: JobsTimelineViewProps) {
  const [statusFilter, setStatusFilter] = useState<StatusChipFilter>("ALL");
  const [grouping, setGrouping] = useState<JobGrouping>("process");
  const [axisMode, setAxisMode] = useState<TimelineAxisMode>("ODATE");
  const [windowDays, setWindowDays] = useState<7 | 14>(14);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [selectedRun, setSelectedRun] = useState<{
    job: ControlMJob;
    runIndex: number;
  } | null>(null);

  // Per-column filters
  const [identFilter, setIdentFilter] = useState<string[]>([]);
  const [lastStatusColFilter, setLastStatusColFilter] = useState<JobStatus[]>([]);
  const [dayColFilters, setDayColFilters] = useState<Record<number, JobStatus[]>>(
    {}
  );

  const envJobs = useMemo(
    () => jobs.filter((j) => envFilter === "all" || j.env === envFilter),
    [jobs, envFilter]
  );

  const counts = useMemo(() => {
    const map: Record<StatusChipFilter, number> = {
      ALL: envJobs.length,
      NOT_OK: 0,
      PENDING: 0,
      RUNNING: 0,
      HELD: 0,
      OK: 0,
    };
    for (const job of envJobs) {
      const latest = job.runs[job.runs.length - 1]?.status ?? "PENDING";
      map[latest] += 1;
    }
    return map;
  }, [envJobs]);

  // Options for "Identificação" column depend dynamically on the active grouping
  const identOptions: FilterOption[] = useMemo(() => {
    const counter = new Map<string, number>();
    for (const job of envJobs) {
      const key =
        grouping === "process"
          ? job.processName
          : grouping === "folder"
            ? job.folder
            : job.jobName;
      counter.set(key, (counter.get(key) ?? 0) + 1);
    }
    return Array.from(counter.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, count]) => ({
        value,
        label: value,
        count,
      }));
  }, [envJobs, grouping]);

  // Options for "Último Status" column
  const lastStatusOptions: FilterOption[] = useMemo(
    () =>
      ALL_STATUS_META.map((m) => ({
        value: m.value,
        label: m.label,
        dotClass: m.dotClass,
        count: counts[m.value],
      })),
    [counts]
  );

  const startIdx = CONTROLM_DATES_ISO.length - windowDays;
  const visibleDates = useMemo(() => {
    const refJob = envJobs[0] ?? jobs[0];
    if (!refJob) return CONTROLM_DATES_ISO.slice(startIdx).map(formatShortDate);
    return refJob.runs.slice(startIdx).map((r) =>
      axisMode === "ODATE" ? formatShortDate(r.odateIso) : formatShortDate(r.dateIso)
    );
  }, [envJobs, jobs, startIdx, axisMode]);

  // Build status options + counts for each visible date column
  const dayOptionsByAbsIdx = useMemo(() => {
    const result: Record<number, FilterOption[]> = {};
    for (let offset = 0; offset < visibleDates.length; offset++) {
      const absIdx = startIdx + offset;
      const dayCount: Record<JobStatus, number> = {
        OK: 0,
        NOT_OK: 0,
        RUNNING: 0,
        PENDING: 0,
        HELD: 0,
      };
      for (const job of envJobs) {
        const st = job.runs[absIdx]?.status ?? "PENDING";
        dayCount[st] += 1;
      }
      result[absIdx] = ALL_STATUS_META.map((m) => ({
        value: m.value,
        label: m.label,
        dotClass: m.dotClass,
        count: dayCount[m.value],
      }));
    }
    return result;
  }, [envJobs, startIdx, visibleDates.length]);

  const activeDayFilterCount = useMemo(
    () =>
      Object.values(dayColFilters).reduce(
        (acc, arr) => acc + (arr.length > 0 ? 1 : 0),
        0
      ),
    [dayColFilters]
  );

  const totalActiveColFilters =
    (identFilter.length > 0 ? 1 : 0) +
    (lastStatusColFilter.length > 0 ? 1 : 0) +
    activeDayFilterCount;

  const clearAllColumnFilters = () => {
    setIdentFilter([]);
    setLastStatusColFilter([]);
    setDayColFilters({});
  };

  const filteredJobs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return envJobs.filter((job) => {
      const latest = job.runs[job.runs.length - 1]?.status ?? "PENDING";

      const matchTopChip = statusFilter === "ALL" || latest === statusFilter;
      const matchLastStatusCol =
        lastStatusColFilter.length === 0 || lastStatusColFilter.includes(latest);

      const identKey =
        grouping === "process"
          ? job.processName
          : grouping === "folder"
            ? job.folder
            : job.jobName;
      const matchIdentCol =
        identFilter.length === 0 || identFilter.includes(identKey);

      const matchDayCols = Object.entries(dayColFilters).every(
        ([absIdxStr, allowedStatuses]) => {
          if (allowedStatuses.length === 0) return true;
          const absIdx = Number(absIdxStr);
          const dayStatus = job.runs[absIdx]?.status ?? "PENDING";
          return allowedStatuses.includes(dayStatus);
        }
      );

      const matchQuery =
        !q ||
        job.jobName.toLowerCase().includes(q) ||
        job.folder.toLowerCase().includes(q) ||
        job.processName.toLowerCase().includes(q);

      return (
        matchTopChip &&
        matchLastStatusCol &&
        matchIdentCol &&
        matchDayCols &&
        matchQuery
      );
    });
  }, [
    envJobs,
    searchQuery,
    statusFilter,
    lastStatusColFilter,
    identFilter,
    dayColFilters,
    grouping,
  ]);

  const groupedEntries = useMemo(() => {
    if (grouping === "job") return null;
    const groups = new Map<string, ControlMJob[]>();
    for (const job of filteredJobs) {
      const key = grouping === "process" ? job.processName : job.folder;
      const list = groups.get(key) ?? [];
      list.push(job);
      groups.set(key, list);
    }
    return Array.from(groups.entries());
  }, [filteredJobs, grouping]);

  const statusChips: {
    value: StatusChipFilter;
    label: string;
    dot?: string;
  }[] = [
    { value: "ALL", label: "Todos" },
    { value: "NOT_OK", label: "Com Erro", dot: "bg-error" },
    { value: "PENDING", label: "Pendentes", dot: "bg-muted/60" },
    { value: "RUNNING", label: "Executando", dot: "bg-warning" },
    { value: "HELD", label: "Hold", dot: "bg-primary/70" },
    { value: "OK", label: "OK", dot: "bg-success" },
  ];

  const identHeaderLabel =
    grouping === "process"
      ? "Identificação (Processo)"
      : grouping === "folder"
        ? "Identificação (Pasta)"
        : "Identificação (Job)";

  const identSearchPlaceholder =
    grouping === "process"
      ? "Pesquisar processo..."
      : grouping === "folder"
        ? "Pesquisar pasta..."
        : "Pesquisar job...";

  const renderJobRow = (job: ControlMJob, indented: boolean) => {
    const slice = job.runs.slice(startIdx);
    const latestRun = slice[slice.length - 1];

    return (
      <tr key={job.id} className="transition-colors hover:bg-surface-muted/50">
        <td className={`py-3 px-4 ${indented ? "pl-9" : ""}`}>
          <button
            type="button"
            onClick={() => setSelectedRun({ job, runIndex: job.runs.length - 1 })}
            className="group text-left"
          >
            <div className="flex items-center gap-2">
              <EnvBadge env={job.env} />
              <span className="font-mono font-medium text-foreground transition-colors group-hover:text-primary">
                {job.jobName}
              </span>
            </div>
            <div className="mt-0.5 text-[11px] text-muted">
              {job.folder} · {job.processName}
            </div>
          </button>
        </td>

        <td className="px-3 py-3">
          <div className="flex items-center gap-1.5">
            <JobStatusBadge status={latestRun.status} />
            {latestRun.anomaly && latestRun.status === "OK" && (
              <span className="text-[10px] font-medium text-warning">⏱ Lento</span>
            )}
          </div>
        </td>

        <td className="px-4 py-3">
          <div
            className="grid items-center justify-items-center gap-1.5"
            style={{
              gridTemplateColumns: `repeat(${slice.length}, minmax(30px, 1fr))`,
            }}
          >
            {slice.map((run, offset) => {
              const absIdx = startIdx + offset;
              const labelDate =
                axisMode === "ODATE"
                  ? formatShortDate(run.odateIso)
                  : formatShortDate(run.dateIso);
              return (
                <JobStatusDot
                  key={run.dateIso}
                  status={run.status}
                  anomaly={run.anomaly}
                  title={`${job.jobName} [${job.env.toUpperCase()}] · ${labelDate} · ${run.status}`}
                  onClick={() => setSelectedRun({ job, runIndex: absIdx })}
                />
              );
            })}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <section className="space-y-4">
      {/* Inline Status Summary Strip + Axis/Window Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {statusChips.map((chip) => {
            const active = statusFilter === chip.value;
            return (
              <button
                key={chip.value}
                type="button"
                onClick={() => setStatusFilter(chip.value)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface text-foreground hover:border-muted"
                }`}
              >
                {chip.dot && (
                  <span
                    className={`h-2 w-2 rounded-full ${
                      active ? "bg-primary-foreground" : chip.dot
                    }`}
                  />
                )}
                <span>{chip.label}</span>
                <span className="font-mono tabular-nums opacity-75">
                  {counts[chip.value]}
                </span>
              </button>
            );
          })}

          {totalActiveColFilters > 0 && (
            <button
              type="button"
              onClick={clearAllColumnFilters}
              className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20"
            >
              <X className="h-3 w-3" />
              Limpar filtros ({totalActiveColFilters})
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted">
          <div className="flex items-center gap-1.5">
            <span>Agrupar por:</span>
            <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
              {(
                [
                  { value: "process", label: "Processo" },
                  { value: "folder", label: "Pasta" },
                  { value: "job", label: "Job" },
                ] as { value: JobGrouping; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setGrouping(opt.value);
                    setIdentFilter([]);
                    setCollapsedGroups({});
                  }}
                  className={`rounded-md px-2 py-1 text-[11px] transition-colors ${
                    grouping === opt.value
                      ? "bg-primary font-medium text-primary-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span>Eixo:</span>
            <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
              {(["ODATE", "EXEC"] as TimelineAxisMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setAxisMode(mode)}
                  className={`rounded-md px-2 py-1 text-[11px] transition-colors ${
                    axisMode === mode
                      ? "bg-primary font-medium text-primary-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {mode === "ODATE" ? "ODATE" : "Execução Real"}
                </button>
              ))}
            </div>
          </div>

          <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
            {([7, 14] as const).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setWindowDays(days)}
                className={`rounded-md px-2 py-1 font-mono text-[11px] transition-colors ${
                  windowDays === days
                    ? "bg-primary font-medium text-primary-foreground"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {days}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Airflow-Style Matrix Timeline with Per-Column Searchable Filters */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border text-xs text-muted">
                <th className="min-w-[290px] px-3 py-2.5 font-medium">
                  <ColumnFilterPopover
                    label={identHeaderLabel}
                    options={identOptions}
                    selectedValues={identFilter}
                    onChange={setIdentFilter}
                    searchPlaceholder={identSearchPlaceholder}
                    align="left"
                  />
                </th>

                <th className="whitespace-nowrap px-2 py-2.5 font-medium">
                  <ColumnFilterPopover
                    label="Último Status"
                    options={lastStatusOptions}
                    selectedValues={lastStatusColFilter}
                    onChange={(vals) =>
                      setLastStatusColFilter(vals as JobStatus[])
                    }
                    searchPlaceholder="Pesquisar status..."
                    align="left"
                  />
                </th>

                <th className="px-4 py-2.5 font-medium">
                  <div
                    className="grid gap-1.5 text-center font-mono text-[11px] tabular-nums"
                    style={{
                      gridTemplateColumns: `repeat(${visibleDates.length}, minmax(30px, 1fr))`,
                    }}
                  >
                    {visibleDates.map((d, offset) => {
                      const absIdx = startIdx + offset;
                      return (
                        <div key={`${absIdx}-${d}`} className="flex justify-center">
                          <ColumnFilterPopover
                            compact
                            align="right"
                            label={d}
                            options={dayOptionsByAbsIdx[absIdx] ?? []}
                            selectedValues={dayColFilters[absIdx] ?? []}
                            onChange={(vals) =>
                              setDayColFilters((prev) => ({
                                ...prev,
                                [absIdx]: vals as JobStatus[],
                              }))
                            }
                            searchPlaceholder={`Status em ${d}...`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border text-xs">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-10 text-center text-muted">
                    Nenhum job encontrado para os filtros aplicados neste ambiente.
                  </td>
                </tr>
              ) : groupedEntries === null ? (
                filteredJobs.map((job) => renderJobRow(job, false))
              ) : (
                groupedEntries.map(([groupName, items]) => {
                  const isCollapsed = Boolean(collapsedGroups[groupName]);
                  const aggStatuses = visibleDates.map((_, offset) => {
                    const absIdx = startIdx + offset;
                    return worstStatus(
                      items.map((it) => it.runs[absIdx]?.status ?? "PENDING")
                    );
                  });
                  const latestWorst = aggStatuses[aggStatuses.length - 1];
                  const okCount = items.filter(
                    (it) => it.runs[it.runs.length - 1]?.status === "OK"
                  ).length;

                  const squareColor = (st: JobStatus) => {
                    if (st === "OK") return "bg-success/75";
                    if (st === "NOT_OK") return "bg-error";
                    if (st === "RUNNING") return "bg-warning";
                    if (st === "HELD") return "bg-primary/65";
                    return "bg-muted/40";
                  };

                  return (
                    <FragmentGroup key={groupName}>
                      <tr
                        onClick={() =>
                          setCollapsedGroups((prev) => ({
                            ...prev,
                            [groupName]: !prev[groupName],
                          }))
                        }
                        className="cursor-pointer bg-surface-muted/60 transition-colors hover:bg-surface-muted"
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            {isCollapsed ? (
                              <ChevronRight className="h-3.5 w-3.5 text-muted" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 text-muted" />
                            )}
                            <span className="font-semibold text-foreground">
                              {groupName}
                            </span>
                            <span className="font-mono text-[11px] tabular-nums text-muted">
                              {okCount}/{items.length} OK
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <JobStatusBadge status={latestWorst} />
                        </td>
                        <td className="px-4 py-2.5">
                          <div
                            className="grid items-center justify-items-center gap-1.5"
                            style={{
                              gridTemplateColumns: `repeat(${aggStatuses.length}, minmax(30px, 1fr))`,
                            }}
                          >
                            {aggStatuses.map((st, idx) => (
                              <span
                                key={idx}
                                className={`h-2.5 w-2.5 rounded-sm ${squareColor(st)}`}
                              />
                            ))}
                          </div>
                        </td>
                      </tr>
                      {!isCollapsed && items.map((job) => renderJobRow(job, true))}
                    </FragmentGroup>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Legend Footer */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border px-4 py-2.5 text-xs text-muted">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-success" /> Ended OK
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-error" /> Ended Not OK
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-warning" /> Executando
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-muted/45" /> Pendente
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-success ring-2 ring-warning ring-offset-1 ring-offset-surface" />{" "}
              OK c/ Duração Anômala
            </span>
          </div>
          <span>Clique nos cabeçalhos para filtrar por coluna ou nas bolinhas para detalhes</span>
        </div>
      </div>

      <JobDetailDrawer
        job={selectedRun?.job ?? null}
        runIndex={selectedRun?.runIndex ?? 0}
        axisMode={axisMode}
        onClose={() => setSelectedRun(null)}
      />
    </section>
  );
}

function FragmentGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
