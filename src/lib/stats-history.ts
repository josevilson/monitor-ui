import { formatDuration, formatShortDate } from "@/lib/format";
import type {
  ControlMJob,
  JobStatPoint,
  KafkaDatabricksPair,
  SnapshotSummary,
  VolumetryStatPoint,
} from "@/types/monitoring";

const MONTH_LABELS = [
  "Dez/25",
  "Jan/26",
  "Fev/26",
  "Mar/26",
  "Abr/26",
  "Mai/26",
  "Jun/26",
  "Jul/26",
  "Ago/26",
  "Set/26",
  "Out/26",
  "Nov/26",
];

function shiftIso(baseIso: string, deltaDays: number): string {
  const d = new Date(`${baseIso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) % 997;
  }
  return h;
}

export function getJobStatsSeries(job: ControlMJob): {
  daily: JobStatPoint[];
  yearly: JobStatPoint[];
  minDate: string;
  maxDate: string;
} {
  if (job.dailyStatsHistory && job.yearlyStatsHistory) {
    const first = job.dailyStatsHistory[0]?.dateIso ?? "2026-10-27";
    const last =
      job.dailyStatsHistory[job.dailyStatsHistory.length - 1]?.dateIso ?? "2026-11-25";
    return {
      daily: job.dailyStatsHistory,
      yearly: job.yearlyStatsHistory,
      minDate: first,
      maxDate: last,
    };
  }

  const seed = hashSeed(job.id);
  const firstRunDate = job.runs[0]?.dateIso ?? "2026-11-12";

  // 16 days prior + 14 actual runs = 30-day daily history
  const priorDaily: JobStatPoint[] = Array.from({ length: 16 }, (_, idx) => {
    const iso = shiftIso(firstRunDate, -(16 - idx));
    const isFail = (seed + idx) % 13 === 0;
    const isAnom = !isFail && (seed + idx) % 17 === 0;
    return {
      dateIso: iso,
      label: formatShortDate(iso),
      okCount: isFail ? 0 : 1,
      notOkCount: isFail ? 1 : 0,
      runningCount: 0,
      pendingCount: 0,
      anomalyCount: isAnom ? 1 : 0,
      okRate: isFail ? 0 : 100,
      avgDurationLabel: formatDuration(
        isFail ? 65 : isAnom ? job.avgDurationSec * 2 : job.avgDurationSec
      ),
    };
  });

  const recentDaily: JobStatPoint[] = job.runs.map((run) => {
    const okCount = run.status === "OK" ? 1 : 0;
    const notOkCount = run.status === "NOT_OK" ? 1 : 0;
    const runningCount = run.status === "RUNNING" ? 1 : 0;
    const pendingCount = run.status === "PENDING" || run.status === "HELD" ? 1 : 0;
    const anomalyCount = run.status === "OK" && run.anomaly ? 1 : 0;
    return {
      dateIso: run.dateIso,
      label: formatShortDate(run.dateIso),
      okCount,
      notOkCount,
      runningCount,
      pendingCount,
      anomalyCount,
      okRate: okCount === 1 ? 100 : 0,
      avgDurationLabel: formatDuration(run.durationSec ?? job.avgDurationSec),
    };
  });

  const daily = [...priorDaily, ...recentDaily];

  const yearly: JobStatPoint[] = MONTH_LABELS.map((label, idx) => {
    if (idx === MONTH_LABELS.length - 1) {
      const ok = daily.reduce((a, d) => a + d.okCount, 0);
      const notOk = daily.reduce((a, d) => a + d.notOkCount, 0);
      const running = daily.reduce((a, d) => a + d.runningCount, 0);
      const pending = daily.reduce((a, d) => a + d.pendingCount, 0);
      const anomaly = daily.reduce((a, d) => a + d.anomalyCount, 0);
      const tot = Math.max(ok + notOk + running + pending, 1);
      return {
        label,
        okCount: ok,
        notOkCount: notOk,
        runningCount: running,
        pendingCount: pending,
        anomalyCount: anomaly,
        okRate: Number(((ok / tot) * 100).toFixed(1)),
        avgDurationLabel: formatDuration(job.avgDurationSec),
      };
    }

    const totalDays = idx === 2 ? 28 : idx % 2 === 1 ? 31 : 30;
    const fails = (seed + idx) % 5 === 0 ? 1 : (seed + idx) % 11 === 0 ? 2 : 0;
    const anomaly = (seed + idx) % 4 === 0 ? 1 : 0;
    const ok = totalDays - fails;
    return {
      label,
      okCount: ok,
      notOkCount: fails,
      runningCount: 0,
      pendingCount: 0,
      anomalyCount: anomaly,
      okRate: Number(((ok / totalDays) * 100).toFixed(1)),
      avgDurationLabel: formatDuration(job.avgDurationSec),
    };
  });

  return {
    daily,
    yearly,
    minDate: "2025-12-01",
    maxDate: daily[daily.length - 1]?.dateIso ?? "2026-11-25",
  };
}

export function getKafkaStatsSeries(pair: KafkaDatabricksPair): {
  daily: VolumetryStatPoint[];
  yearly: VolumetryStatPoint[];
  snapshots: SnapshotSummary;
  minDate: string;
  maxDate: string;
} {
  const seed = hashSeed(pair.id);
  const firstIso = pair.daily[0]?.dateIso ?? "2026-11-12";
  const baseVol = Math.max(
    pair.daily[0]?.kafdropCount ?? 100000,
    1000
  );

  const priorDaily: VolumetryStatPoint[] = Array.from({ length: 16 }, (_, idx) => {
    const iso = shiftIso(firstIso, -(16 - idx));
    const factor = 0.88 + ((seed + idx) % 7) * 0.04;
    const k = Math.round(baseVol * factor);
    const hasDiff = (seed + idx) % 15 === 0;
    const d = hasDiff ? Math.round(k * 0.91) : k;
    return {
      dateIso: iso,
      label: formatShortDate(iso),
      kafdropCount: k,
      databricksCount: d,
      status: hasDiff ? "DIFF" : "OK",
      snapshotAt: "09:30",
    };
  });

  const recentDaily: VolumetryStatPoint[] = pair.daily.map((p) => ({
    dateIso: p.dateIso,
    label: formatShortDate(p.dateIso),
    kafdropCount: p.kafdropCount,
    databricksCount: p.databricksCount,
    status: p.status,
    snapshotAt: p.status === "LAG" ? "09:30 (sem D)" : "09:30",
  }));

  const daily = pair.dailyStatsHistory ?? [...priorDaily, ...recentDaily];

  const yearly: VolumetryStatPoint[] =
    pair.yearlyStatsHistory ??
    MONTH_LABELS.map((label, idx) => {
      if (idx === MONTH_LABELS.length - 1) {
        const kSum = daily.reduce((a, d) => a + d.kafdropCount, 0);
        const dSum = daily.reduce((a, d) => a + d.databricksCount, 0);
        return {
          label,
          kafdropCount: kSum,
          databricksCount: dSum,
          status:
            pair.lagStatus === "LAG"
              ? "LAG"
              : dSum < kSum * 0.995
                ? "DIFF"
                : "OK",
          snapshotAt: "25/11 09:30",
        };
      }
      const monthlyK = Math.round(baseVol * 28.5 * (0.9 + ((seed + idx) % 5) * 0.04));
      const hasDiff = (seed + idx) % 6 === 0;
      const monthlyD = hasDiff ? Math.round(monthlyK * 0.985) : monthlyK;
      return {
        label,
        kafdropCount: monthlyK,
        databricksCount: monthlyD,
        status: hasDiff ? "DIFF" : "OK",
        snapshotAt: `Fim ${label}`,
      };
    });

  const latestPoint = recentDaily[recentDaily.length - 1];
  const prevPoint = recentDaily[recentDaily.length - 2];

  const snapshots: SnapshotSummary = pair.snapshotSummary ?? {
    lastKafdropAt: "26/11 09:30:12",
    lastDatabricksAt:
      pair.lagStatus === "LAG" ? "25/11 18:12:04" : "26/11 09:28:45",
    captureSuccessCount: pair.lagStatus === "LAG" ? 161 : 166,
    captureTotalCount: 168,
    cadenceLabel: "A cada 1h",
    clockSkewLabel: pair.lagStatus === "LAG" ? "Atraso captura DBX" : "Δ entre fontes: 1m 27s",
    recentCaptures: [
      {
        capturedAt: "26/11 09:30",
        kafdropCount: latestPoint?.kafdropCount ?? 0,
        databricksCount:
          pair.lagStatus === "LAG" ? null : (latestPoint?.databricksCount ?? 0),
        latencyLabel: pair.lagStatus === "LAG" ? "Timeout DBX" : "OK (1.2s)",
        status: pair.lagStatus === "LAG" ? "PARTIAL" : "OK",
      },
      {
        capturedAt: "26/11 08:30",
        kafdropCount: Math.round((latestPoint?.kafdropCount ?? 0) * 0.94),
        databricksCount:
          pair.lagStatus === "LAG"
            ? null
            : Math.round((latestPoint?.databricksCount ?? 0) * 0.94),
        latencyLabel: pair.lagStatus === "LAG" ? "Timeout DBX" : "OK (0.9s)",
        status: pair.lagStatus === "LAG" ? "ERROR" : "OK",
      },
      {
        capturedAt: "25/11 23:30",
        kafdropCount: prevPoint?.kafdropCount ?? 0,
        databricksCount: prevPoint?.databricksCount ?? 0,
        latencyLabel: "OK (1.1s)",
        status: "OK",
      },
    ],
  };

  return {
    daily,
    yearly,
    snapshots,
    minDate: "2025-12-01",
    maxDate: daily[daily.length - 1]?.dateIso ?? "2026-11-25",
  };
}
