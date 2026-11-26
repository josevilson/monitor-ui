export type Environment = "prd" | "hk";
export type EnvironmentFilter = Environment | "all";

export type MonitorTab = "jobs" | "kafka";

export type JobStatus = "OK" | "NOT_OK" | "RUNNING" | "PENDING" | "HELD";

export type JobGrouping = "process" | "folder" | "job";
export type TimelineAxisMode = "ODATE" | "EXEC";

export type StatsPeriodPreset = "week" | "month" | "year" | "custom";
export type StatsViewMode = "chart" | "table";

export interface ControlMJobRun {
  dateIso: string;
  odateIso: string;
  status: JobStatus;
  durationSec: number | null;
  anomaly?: boolean;
  startTime?: string;
  endTime?: string;
  orderId: string;
  waitingFor?: string;
  logSnippet: string;
}

export interface JobStatPoint {
  dateIso?: string;
  label: string;
  okCount: number;
  notOkCount: number;
  runningCount: number;
  pendingCount: number;
  anomalyCount: number;
  okRate: number;
  avgDurationLabel: string;
}

export interface ControlMJob {
  id: string;
  env: Environment;
  monitoredEnvs: Environment[];
  jobName: string;
  folder: string;
  processName: string;
  host: string;
  avgDurationSec: number;
  runs: ControlMJobRun[];
  dailyStatsHistory?: JobStatPoint[];
  yearlyStatsHistory?: JobStatPoint[];
}

export type VolumetryDayStatus = "OK" | "DIFF" | "LAG";

export interface DailyVolumePoint {
  dateIso: string;
  kafdropCount: number;
  databricksCount: number;
  status: VolumetryDayStatus;
}

export interface VolumetryStatPoint {
  dateIso?: string;
  label: string;
  kafdropCount: number;
  databricksCount: number;
  status: VolumetryDayStatus;
  snapshotAt: string;
}

export interface SnapshotCaptureEntry {
  capturedAt: string;
  kafdropCount: number | null;
  databricksCount: number | null;
  latencyLabel: string;
  status: "OK" | "PARTIAL" | "ERROR";
}

export interface SnapshotSummary {
  lastKafdropAt: string;
  lastDatabricksAt: string;
  captureSuccessCount: number;
  captureTotalCount: number;
  cadenceLabel: string;
  clockSkewLabel: string;
  recentCaptures?: SnapshotCaptureEntry[];
}

export type SchemaColumnState = "MATCH" | "MISSING_DBX" | "MISSING_KAFDROP";

export interface SchemaColumnDiff {
  column: string;
  inKafdrop: boolean;
  inDatabricks: boolean;
  state: SchemaColumnState;
  detectedAt?: string;
}

export interface KafkaDatabricksPair {
  id: string;
  env: Environment;
  monitoredEnvs: Environment[];
  topic: string;
  tableName: string;
  consumerGroup: string;
  lagStatus: "OK" | "LAG";
  lagLabel: string;
  schemaStatus: "SYNCED" | "DRIFT";
  schemaLabel: string;
  volumeStatus: "OK" | "VOLUME_DIFF";
  linkedJobs: string[];
  daily: DailyVolumePoint[];
  schemaDiff: SchemaColumnDiff[];
  dailyStatsHistory?: VolumetryStatPoint[];
  yearlyStatsHistory?: VolumetryStatPoint[];
  snapshotSummary?: SnapshotSummary;
}
