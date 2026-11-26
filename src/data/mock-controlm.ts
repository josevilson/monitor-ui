import type { ControlMJob, ControlMJobRun, JobStatus } from "@/types/monitoring";

export const CONTROLM_DATES_ISO = [
  "2026-11-12",
  "2026-11-13",
  "2026-11-14",
  "2026-11-15",
  "2026-11-16",
  "2026-11-17",
  "2026-11-18",
  "2026-11-19",
  "2026-11-20",
  "2026-11-21",
  "2026-11-22",
  "2026-11-23",
  "2026-11-24",
  "2026-11-25",
];

function prevIso(dateIso: string): string {
  const d = new Date(`${dateIso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

interface RunOverride {
  status?: JobStatus;
  durationSec?: number | null;
  anomaly?: boolean;
  waitingFor?: string;
  logSnippet?: string;
}

function buildRuns(
  jobName: string,
  env: "prd" | "hk",
  avgSec: number,
  baseOrderPrefix: string,
  overrides: Record<number, RunOverride> = {},
  defaultStatus: JobStatus = "OK"
): ControlMJobRun[] {
  return CONTROLM_DATES_ISO.map((dateIso, idx) => {
    const ov = overrides[idx] ?? {};
    const status = ov.status ?? defaultStatus;
    const orderId = `${baseOrderPrefix}${(10 + idx).toString(16)}`;
    const odateIso = prevIso(dateIso);

    if (status === "PENDING") {
      return {
        dateIso,
        odateIso,
        status,
        durationSec: null,
        orderId,
        waitingFor: ov.waitingFor ?? "Condição predecessora pendente",
        logSnippet:
          ov.logSnippet ??
          `[02:15:00] WAIT [${env.toUpperCase()}] ${jobName} aguardando condição de entrada (${ov.waitingFor ?? "ODAT anterior"}).`,
      };
    }

    if (status === "HELD") {
      return {
        dateIso,
        odateIso,
        status,
        durationSec: null,
        orderId,
        waitingFor: ov.waitingFor ?? "Job pausado manualmente (HOLD) pelo operador",
        logSnippet:
          ov.logSnippet ??
          `[01:00:00] HELD [${env.toUpperCase()}] Execução segurada por janela de manutenção.`,
      };
    }

    if (status === "RUNNING") {
      return {
        dateIso,
        odateIso,
        status,
        durationSec: ov.durationSec ?? Math.round(avgSec * 0.55),
        startTime: "05:19:01",
        endTime: "Em execução...",
        orderId,
        logSnippet:
          ov.logSnippet ??
          `[05:19:01] INFO [${env.toUpperCase()}] ${jobName} em processamento ativo no agente...`,
      };
    }

    if (status === "NOT_OK") {
      return {
        dateIso,
        odateIso,
        status,
        durationSec: ov.durationSec ?? 75,
        startTime: "02:10:04",
        endTime: "02:11:19",
        orderId,
        logSnippet:
          ov.logSnippet ??
          `[02:10:04] INFO [${env.toUpperCase()}] Iniciando ${jobName}\n[02:11:19] ERROR Exit code 137: Falha crítica durante execução do pipeline.`,
      };
    }

    const durationSec = ov.durationSec ?? avgSec + ((idx % 3) - 1) * 18;
    return {
      dateIso,
      odateIso,
      status: "OK",
      durationSec: Math.max(15, durationSec),
      anomaly: ov.anomaly,
      startTime: "02:00:02",
      endTime: "02:12:30",
      orderId,
      logSnippet:
        ov.logSnippet ??
        `[02:00:02] INFO [${env.toUpperCase()}] ${jobName} executado com sucesso (Exit code 0).`,
    };
  });
}

export const MOCK_CONTROLM_JOBS: ControlMJob[] = [
  // ======================== PRD JOBS ========================
  {
    id: "j1-prd",
    env: "prd",
    monitoredEnvs: ["prd", "hk"],
    jobName: "CM_INGEST_CARDS_TX",
    folder: "FIN_CARTOES_PRD",
    processName: "Fechamento Cartões",
    host: "lnx-ctm-prd-01",
    avgDurationSec: 720,
    runs: buildRuns("CM_INGEST_CARDS_TX", "prd", 720, "4k", {
      13: {
        status: "NOT_OK",
        durationSec: 75,
        logSnippet:
          "[02:10:04] INFO [PRD] Starting spark-submit ingest_cards_tx\n[02:11:12] WARN Executor lost heartbeat\n[02:11:19] ERROR Exit code 137: Container killed by YARN (OOM)",
      },
    }),
  },
  {
    id: "j2-prd",
    env: "prd",
    monitoredEnvs: ["prd"],
    jobName: "CM_CONSOLIDATE_CARDS",
    folder: "FIN_CARTOES_PRD",
    processName: "Fechamento Cartões",
    host: "lnx-ctm-prd-01",
    avgDurationSec: 1080,
    runs: buildRuns("CM_CONSOLIDATE_CARDS", "prd", 1080, "4c", {
      13: {
        status: "PENDING",
        waitingFor: "CM_INGEST_CARDS_TX-ENDED-OK (ODAT 2411)",
        logSnippet:
          "[02:15:00] WAIT [PRD] Bloqueado aguardando CM_INGEST_CARDS_TX finalizar OK.",
      },
    }),
  },
  {
    id: "j3-prd",
    env: "prd",
    monitoredEnvs: ["prd"],
    jobName: "CM_EXPORT_CONTABIL",
    folder: "FIN_CARTOES_PRD",
    processName: "Fechamento Cartões",
    host: "lnx-ctm-prd-02",
    avgDurationSec: 480,
    runs: buildRuns("CM_EXPORT_CONTABIL", "prd", 480, "4e", {
      6: {
        status: "NOT_OK",
        durationSec: 42,
        logSnippet: "[03:00:42] ERROR [PRD] SFTP destination unreachable.",
      },
      13: {
        status: "PENDING",
        waitingFor: "CM_CONSOLIDATE_CARDS-ENDED-OK",
        logSnippet:
          "[02:15:00] WAIT [PRD] Em espera em cascata pela falha de CM_INGEST_CARDS_TX.",
      },
    }),
  },
  {
    id: "j4-prd",
    env: "prd",
    monitoredEnvs: ["prd", "hk"],
    jobName: "CM_CRM_CUSTOMERS_DELTA",
    folder: "CRM_CLIENTES_PRD",
    processName: "Carga CRM 360",
    host: "lnx-ctm-prd-04",
    avgDurationSec: 1440,
    runs: buildRuns("CM_CRM_CUSTOMERS_DELTA", "prd", 1440, "5m", {
      13: {
        status: "OK",
        durationSec: 4680,
        anomaly: true,
        logSnippet:
          "[04:00:02] INFO [PRD] Reading partition 2026-11-25\n[04:45:10] WARN Data skew detected on customer_id (+225% duração)\n[05:18:40] INFO Finished successfully (1.42M rows)",
      },
    }),
  },
  {
    id: "j5-prd",
    env: "prd",
    monitoredEnvs: ["prd", "hk"],
    jobName: "CM_CRM_SEGMENTS_REFRESH",
    folder: "CRM_CLIENTES_PRD",
    processName: "Carga CRM 360",
    host: "lnx-ctm-prd-04",
    avgDurationSec: 540,
    runs: buildRuns("CM_CRM_SEGMENTS_REFRESH", "prd", 540, "5s", {
      13: {
        status: "RUNNING",
        durationSec: 372,
        logSnippet:
          "[05:19:01] INFO [PRD] Triggered Databricks notebook /Shared/CRM/segments_refresh...",
      },
    }),
  },
  {
    id: "j6-prd",
    env: "prd",
    monitoredEnvs: ["prd"],
    jobName: "CM_PIX_SETTLEMENT_SYNC",
    folder: "PIX_CORE_PRD",
    processName: "Conciliação PIX",
    host: "lnx-ctm-prd-07",
    avgDurationSec: 840,
    runs: buildRuns("CM_PIX_SETTLEMENT_SYNC", "prd", 840, "6p", {
      5: { status: "NOT_OK", durationSec: 110 },
      13: {
        status: "RUNNING",
        durationSec: 492,
        logSnippet: "[01:08:12] INFO [PRD] Processando lote PIX 25/11...",
      },
    }),
  },
  {
    id: "j7-prd",
    env: "prd",
    monitoredEnvs: ["prd"],
    jobName: "CM_RISK_BASEL_REPORT",
    folder: "RISCO_REGULATORIO_PRD",
    processName: "Risco & Regulatório",
    host: "lnx-ctm-prd-09",
    avgDurationSec: 2520,
    runs: buildRuns("CM_RISK_BASEL_REPORT", "prd", 2520, "7r", {
      9: { status: "NOT_OK", durationSec: 210 },
      12: { status: "NOT_OK", durationSec: 240 },
      13: {
        status: "NOT_OK",
        durationSec: 248,
        logSnippet:
          "[06:00:03] INFO [PRD] Querying Unity Catalog prod_catalog.risk\n[06:04:11] ERROR Databricks SQL Warehouse connection timeout after 240s",
      },
    }),
  },
  {
    id: "j8-prd",
    env: "prd",
    monitoredEnvs: ["prd"],
    jobName: "CM_LEGACY_COBOL_ARCHIVE",
    folder: "RISCO_REGULATORIO_PRD",
    processName: "Risco & Regulatório",
    host: "lnx-ctm-prd-09",
    avgDurationSec: 300,
    runs: buildRuns("CM_LEGACY_COBOL_ARCHIVE", "prd", 300, "7c", {
      13: {
        status: "HELD",
        waitingFor: "Mantido em HOLD durante auditoria trimestral",
      },
    }),
  },

  // ======================== HK (HOMOLOGAÇÃO) JOBS ========================
  {
    id: "j1-hk",
    env: "hk",
    monitoredEnvs: ["prd", "hk"],
    jobName: "CM_INGEST_CARDS_TX",
    folder: "FIN_CARTOES_HK",
    processName: "Fechamento Cartões",
    host: "lnx-ctm-hk-01",
    avgDurationSec: 240,
    runs: buildRuns("CM_INGEST_CARDS_TX", "hk", 240, "9k", {
      11: { status: "OK", durationSec: 225 },
    }),
  },
  {
    id: "j2-hk",
    env: "hk",
    monitoredEnvs: ["prd", "hk"],
    jobName: "CM_CRM_CUSTOMERS_DELTA",
    folder: "CRM_CLIENTES_HK",
    processName: "Carga CRM 360",
    host: "lnx-ctm-hk-03",
    avgDurationSec: 420,
    runs: buildRuns("CM_CRM_CUSTOMERS_DELTA", "hk", 420, "9m"),
  },
  {
    id: "j3-hk",
    env: "hk",
    monitoredEnvs: ["hk"],
    jobName: "CM_OPENFINANCE_V3_BETA",
    folder: "OPENFINANCE_HK_LAB",
    processName: "Open Finance v3 (Piloto)",
    host: "lnx-ctm-hk-02",
    avgDurationSec: 360,
    runs: buildRuns("CM_OPENFINANCE_V3_BETA", "hk", 360, "9o", {
      2: { status: "PENDING" },
      4: { status: "NOT_OK", durationSec: 65 },
      8: { status: "NOT_OK", durationSec: 70 },
      11: { status: "NOT_OK", durationSec: 60 },
      13: {
        status: "NOT_OK",
        durationSec: 65,
        logSnippet:
          "[10:12:04] ERROR [HK] Schema check failed: column consent_scope_v3 missing in Databricks target",
      },
    }),
  },
  {
    id: "j4-hk",
    env: "hk",
    monitoredEnvs: ["hk"],
    jobName: "CM_OPENFINANCE_PUBLISH_HK",
    folder: "OPENFINANCE_HK_LAB",
    processName: "Open Finance v3 (Piloto)",
    host: "lnx-ctm-hk-02",
    avgDurationSec: 180,
    runs: buildRuns("CM_OPENFINANCE_PUBLISH_HK", "hk", 180, "9p", {
      2: { status: "PENDING" },
      4: { status: "PENDING" },
      8: { status: "PENDING" },
      11: { status: "PENDING" },
      13: {
        status: "PENDING",
        waitingFor: "CM_OPENFINANCE_V3_BETA-ENDED-OK",
      },
    }),
  },
  {
    id: "j5-hk",
    env: "hk",
    monitoredEnvs: ["hk"],
    jobName: "CM_SANDBOX_DATA_MASKING",
    folder: "LGPD_MASKING_HK",
    processName: "Anonimização HK",
    host: "lnx-ctm-hk-05",
    avgDurationSec: 600,
    runs: buildRuns("CM_SANDBOX_DATA_MASKING", "hk", 600, "9l", {
      13: {
        status: "RUNNING",
        durationSec: 290,
        logSnippet: "[11:04:10] INFO [HK] Mascarando CPF/Email para base de homologação...",
      },
    }),
  },
];
