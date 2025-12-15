import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

type LogLevel = "INFO" | "ERROR";

export interface LogEntry {
  action: string;
  status?: string;
  message?: string;
  level?: LogLevel;
  detail?: unknown;
}

const LOG_TO_CSV =
  ["1", "true", "yes"].includes(String(process.env.LOG_TO_CSV || "").toLowerCase()) || false;
const LOG_DIR = path.resolve(process.cwd(), "logs");

function ensureLogFile(filePath: string) {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "timestamp,level,action,status,message,detail\n", {
      encoding: "utf8"
    });
  }
}

function getLogFilePath(now: Date) {
  const datePart = now.toISOString().split("T")[0]; // YYYY-MM-DD
  return path.join(LOG_DIR, `log-${datePart}.csv`);
}

function escapeCsv(value: string): string {
  const cleaned = value.replace(/"/g, '""').replace(/\r?\n/g, " ");
  return `"${cleaned}"`;
}

function serializeDetail(detail: unknown): string {
  if (detail === null || detail === undefined) return "";
  if (typeof detail === "string") return detail;
  if (typeof detail === "number" || typeof detail === "boolean") return String(detail);
  try {
    return JSON.stringify(detail);
  } catch {
    return String(detail);
  }
}

export function logOperation(entry: LogEntry): void {
  const now = new Date();
  const timestamp = now.toISOString();
  const level: LogLevel = entry.level ?? "INFO";
  const status = entry.status ?? "ok";
  const message = entry.message ?? "";
  const detail = entry.detail;

  const prefix = `[${timestamp}] [${level}] [${entry.action}] ${status}`;
  const line = message ? `${prefix} - ${message}` : prefix;

  if (level === "ERROR") {
    console.error(line, detail ?? "");
  } else {
    console.log(line, detail ?? "");
  }

  if (!LOG_TO_CSV) return;

  try {
    const filePath = getLogFilePath(now);
    ensureLogFile(filePath);

    const row = [
      timestamp,
      level,
      entry.action,
      status,
      message,
      serializeDetail(detail)
    ].map(escapeCsv);

    fs.appendFileSync(filePath, row.join(",") + "\n", { encoding: "utf8" });
  } catch (err) {
    console.error("[logger] failed to write csv log", err);
  }
}
