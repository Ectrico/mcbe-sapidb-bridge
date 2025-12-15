"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logOperation = logOperation;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const LOG_TO_CSV = ["1", "true", "yes"].includes(String(process.env.LOG_TO_CSV || "").toLowerCase()) || false;
const LOG_DIR = path_1.default.resolve(process.cwd(), "logs");
function ensureLogFile(filePath) {
    if (!fs_1.default.existsSync(LOG_DIR)) {
        fs_1.default.mkdirSync(LOG_DIR, { recursive: true });
    }
    if (!fs_1.default.existsSync(filePath)) {
        fs_1.default.writeFileSync(filePath, "timestamp,level,action,status,message,detail\n", {
            encoding: "utf8"
        });
    }
}
function getLogFilePath(now) {
    const datePart = now.toISOString().split("T")[0]; // YYYY-MM-DD
    return path_1.default.join(LOG_DIR, `log-${datePart}.csv`);
}
function escapeCsv(value) {
    const cleaned = value.replace(/"/g, '""').replace(/\r?\n/g, " ");
    return `"${cleaned}"`;
}
function serializeDetail(detail) {
    if (detail === null || detail === undefined)
        return "";
    if (typeof detail === "string")
        return detail;
    if (typeof detail === "number" || typeof detail === "boolean")
        return String(detail);
    try {
        return JSON.stringify(detail);
    }
    catch {
        return String(detail);
    }
}
function logOperation(entry) {
    const now = new Date();
    const timestamp = now.toISOString();
    const level = entry.level ?? "INFO";
    const status = entry.status ?? "ok";
    const message = entry.message ?? "";
    const detail = entry.detail;
    const prefix = `[${timestamp}] [${level}] [${entry.action}] ${status}`;
    const line = message ? `${prefix} - ${message}` : prefix;
    if (level === "ERROR") {
        console.error(line, detail ?? "");
    }
    else {
        console.log(line, detail ?? "");
    }
    if (!LOG_TO_CSV)
        return;
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
        fs_1.default.appendFileSync(filePath, row.join(",") + "\n", { encoding: "utf8" });
    }
    catch (err) {
        console.error("[logger] failed to write csv log", err);
    }
}
