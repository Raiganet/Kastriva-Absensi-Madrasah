import { NextResponse } from "next/server";
import { google } from "googleapis";
import { readSessionNode } from "@/lib/session";

export const runtime = "nodejs";

const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "{}");
const auth = new google.auth.GoogleAuth({
  credentials: creds,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const SID = () => process.env.SPREADSHEET_ID || "";
const SHEET = "Settings";

function sheets() {
  return google.sheets({ version: "v4", auth });
}

async function ensureSheet() {
  const ss = await sheets().spreadsheets.get({ spreadsheetId: SID() });
  const exists = (ss.data.sheets || []).some((s: any) => s.properties?.title === SHEET);
  
  if (!exists) {
    await sheets().spreadsheets.batchUpdate({
      spreadsheetId: SID(),
      requestBody: { requests: [{ addSheet: { properties: { title: SHEET } } }] },
    });
    await sheets().spreadsheets.values.update({
      spreadsheetId: SID(),
      range: `${SHEET}!A1:C1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [["Key", "Value", "School"]] },
    });
  }
}

export async function GET() {
  try {
    const session = await readSessionNode();
    await ensureSheet();
    
    const res = await sheets().spreadsheets.values.get({
      spreadsheetId: SID(),
      range: `${SHEET}!A:C`,
    });
    
    const rows = (res.data.values || []) as string[][];
    if (rows.length < 2) return NextResponse.json({});
    
    const headers = rows[0];
    const keyIdx = headers.indexOf("Key");
    const valIdx = headers.indexOf("Value");
    const schoolIdx = headers.indexOf("School");
    
    const userSchool = session?.school || "all";
    const settings: Record<string, string> = {};
    
    // Filter settings berdasarkan school user
    for (let i = 1; i < rows.length; i++) {
      const key = rows[i][keyIdx];
      const value = rows[i][valIdx];
      const rowSchool = schoolIdx >= 0 ? (rows[i][schoolIdx] || "all") : "all";
      
      // Ambil settings untuk school user atau "all" (global)
      if (key && (rowSchool === userSchool || rowSchool === "all")) {
        settings[key] = value;
      }
    }
    
    return NextResponse.json(settings);
  } catch (e: any) {
    console.error("[settings] GET", e);
    return NextResponse.json({ error: "Gagal memuat pengaturan." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await readSessionNode();
    if (!session) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
    
    const body = await req.json().catch(() => ({}));
    const userSchool = session.school || "all";
    
    await ensureSheet();
    const res = await sheets().spreadsheets.values.get({
      spreadsheetId: SID(),
      range: `${SHEET}!A:C`,
    });
    
    const rows = (res.data.values || []) as string[][];
    const headers = rows[0];
    const keyIdx = headers.indexOf("Key");
    const valIdx = headers.indexOf("Value");
    const schoolIdx = headers.indexOf("School");
    
    // Update atau insert settings per school
    const updates: Promise<any>[] = [];
    
    for (const [key, value] of Object.entries(body)) {
      let foundRow = -1;
      
      // Cari row dengan key dan school yang sama
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][keyIdx] === key && (rows[i][schoolIdx] || "all") === userSchool) {
          foundRow = i;
          break;
        }
      }
      
      if (foundRow >= 0) {
        // Update existing
        updates.push(
          sheets().spreadsheets.values.update({
            spreadsheetId: SID(),
            range: `${SHEET}!${String.fromCharCode(65 + valIdx)}${foundRow + 1}`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: [[value.toString()]] },
          })
        );
      } else {
        // Insert new
        updates.push(
          sheets().spreadsheets.values.append({
            spreadsheetId: SID(),
            range: `${SHEET}!A:C`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: [[key, value.toString(), userSchool]] },
          })
        );
      }
    }
    
    await Promise.all(updates);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[settings] POST", e);
    return NextResponse.json({ error: "Gagal menyimpan pengaturan." }, { status: 500 });
  }
}
