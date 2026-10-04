/**
 * Server-side client for the Google Apps Script web app used by the
 * Android scanner. Keeping this adapter in one place makes the Next.js
 * dashboard and the APK read/write the same GAS-backed spreadsheet.
 */

const DEFAULT_GAS_WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbwZUgoSA9BIOF5Cf4UEl60eSP3uHW6nUy9-S_rophLJBfs9GGD_B0fE1i0wdoMrUzdd/exec";

export type GasStudent = {
  studentId?: unknown;
  studentName?: unknown;
  className?: unknown;
  academicYear?: unknown;
  parentName?: unknown;
  parentPhone?: unknown;
  address?: unknown;
  photo?: unknown;
  school?: unknown;
};

export type GasAttendance = {
  id?: unknown;
  studentId?: unknown;
  studentName?: unknown;
  className?: unknown;
  status?: unknown;
  timestamp?: unknown;
  dateString?: unknown;
  timeString?: unknown;
  dateLabel?: unknown;
  timeLabel?: unknown;
  school?: unknown;
};


export type GasLog = {
  timestamp?: unknown;
  action?: unknown;
  status?: unknown;
  ipAddress?: unknown;
};

export type GasResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  [key: string]: unknown;
};

function gasUrl(): string {
  return (process.env.GAS_WEB_APP_URL || DEFAULT_GAS_WEB_APP_URL).trim();
}

function text(value: unknown): string {
  return value == null ? "" : String(value);
}

function endpoint(action: string, params: Record<string, unknown> = {}, includeEmpty = false): string {
  const url = new URL(gasUrl());
  url.searchParams.set("action", action);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && (includeEmpty || value !== "")) {
      url.searchParams.set(key, text(value));
    }
  }
  return url.toString();
}

async function request<T>(
  action: string,
  params: Record<string, unknown> = {},
  method: "GET" | "POST" = "GET",
  includeEmpty = false,
): Promise<T> {
  const controller = new AbortController();
  // Apps Script can cold-start and serialize a large Students response with
  // base64 photos. Give the shared backend enough time before failing over.
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const init: RequestInit = {
      method,
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    };

    if (method === "POST") {
      init.headers = { ...init.headers, "Content-Type": "application/json" };
      init.body = JSON.stringify({ action, ...params });
    }

    const response = await fetch(method === "GET" ? endpoint(action, params, includeEmpty) : gasUrl(), init);
    const raw = await response.text();
    let parsed: T;
    try {
      parsed = JSON.parse(raw) as T;
    } catch {
      throw new Error(`Respons GAS bukan JSON (HTTP ${response.status}).`);
    }

    if (!response.ok) {
      const message = (parsed as GasResponse<unknown> | null)?.message;
      throw new Error(message || `GAS mengembalikan HTTP ${response.status}.`);
    }
    return parsed;
  } finally {
    clearTimeout(timeout);
  }
}

export async function gasGetStudents(school = ""): Promise<GasResponse<GasStudent[]>> {
  return request<GasResponse<GasStudent[]>>("getStudents", { school });
}

export async function gasGetAttendance(school = ""): Promise<GasResponse<GasAttendance[]>> {
  return request<GasResponse<GasAttendance[]>>("getAttendance", { school });
}

export async function gasRecordAttendance(input: {
  studentId: string;
  status?: string;
  notes?: string;
  school?: string;
}): Promise<GasResponse<unknown>> {
  // GAS redirects can turn a POST into a GET in some runtimes. This action is
  // deliberately GET-compatible and the Android client uses the same path.
  return request<GasResponse<unknown>>("recordAttendance", input, "GET");
}

export async function gasSaveStudent(input: {
  studentId: string;
  studentName: string;
  className: string;
  academicYear?: string;
  parentName?: string;
  parentPhone?: string;
  address?: string;
  photoDataUrl?: string;
  school?: string;
}): Promise<GasResponse<unknown>> {
  // Avoid the Apps Script POST redirect for ordinary student edits. A photo
  // can make the query string too large, so retain POST for photo uploads.
  const hasPhoto = Boolean(input.photoDataUrl);
  const method = hasPhoto ? "POST" : "GET";
  return request<GasResponse<unknown>>("saveStudent", input, method);
}


export async function gasImportStudents(rows: Array<Record<string, unknown>>): Promise<GasResponse<unknown>> {
  return request<GasResponse<unknown>>("importStudents", { rows }, "POST");
}

export async function gasDeleteStudent(studentId: string, school = ""): Promise<GasResponse<unknown>> {
  return request<GasResponse<unknown>>("deleteStudent", { studentId, school }, "GET");
}

export async function gasGetLogs(limit = 250): Promise<GasResponse<GasLog[]>> {
  return request<GasResponse<GasLog[]>>("getLogs", { limit, adminSecret: process.env.GAS_ADMIN_SECRET || "" }, "POST");
}

export async function gasBackupDatabase(): Promise<GasResponse<{ name?: string; url?: string; id?: string }>> {
  return request<GasResponse<{ name?: string; url?: string; id?: string }>>("backupDatabase", { adminSecret: process.env.GAS_ADMIN_SECRET || "" }, "POST");
}

export async function gasGetSettings(): Promise<GasResponse<Record<string, string>>> {
  return request<GasResponse<Record<string, string>>>("getSettings");
}

export async function gasSaveSettings(settings: Record<string, unknown>): Promise<GasResponse<unknown>> {
  const hasImage = Object.values(settings).some((value) => String(value || "").startsWith("data:image/"));
  const queryLength = endpoint("saveSettings", settings, true).length;
  const method = !hasImage && queryLength < 6_000 ? "GET" : "POST";
  return request<GasResponse<unknown>>("saveSettings", settings, method, true);
}

export function mapGasStudent(student: GasStudent): Record<string, string> {
  return {
    Student_ID: text(student.studentId),
    Student_Name: text(student.studentName),
    Class_Name: text(student.className),
    Academic_Year: text(student.academicYear),
    Parent_Name: text(student.parentName),
    Parent_Phone: text(student.parentPhone),
    Address: text(student.address),
    Photo: text(student.photo),
    School: text(student.school),
  };
}

export function mapGasAttendance(attendance: GasAttendance, school = ""): Record<string, string> {
  return {
    ID: text(attendance.id),
    Student_ID: text(attendance.studentId),
    Student_Name: text(attendance.studentName),
    Class_Name: text(attendance.className),
    Status: text(attendance.status),
    Timestamp: text(attendance.timestamp),
    Date_String: text(attendance.dateString),
    Time_String: text(attendance.timeString),
    School: text(attendance.school || school),
  };
}

export function toGasStudentInput(body: Record<string, unknown>) {
  return {
    studentId: text(body.Student_ID),
    studentName: text(body.Student_Name),
    className: text(body.Class_Name),
    academicYear: text(body.Academic_Year),
    parentName: text(body.Parent_Name),
    parentPhone: text(body.Parent_Phone),
    address: text(body.Address),
    // A missing/empty photo means "keep the current photo" for an update.
    // This keeps ordinary edits GET-compatible with Apps Script redirects.
    photoDataUrl: body.Photo ? text(body.Photo) : undefined,
    school: text(body.School),
  };
}
