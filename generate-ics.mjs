// מייצר קובץ worldcup.ics עם המשחקים הנבחרים של מונדיאל 2026.
// מקור נתונים: openfootball/worldcup.json (חופשי, ללא מפתח API).
// כל הנוקאאוט + משחקי בתים של נבחרות בולטות/מארחות. שפה: עברית.
//
// הרצה:  node generate-ics.mjs
import { writeFileSync } from "node:fs";
import { teamName, stageName, venue } from "./translations.mjs";

const SOURCE_URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

// נבחרות שמשחקי הבתים שלהן ייכללו (בולטות + שלוש המארחות). שמות לפי המקור.
const BIG_NATIONS = new Set([
  "Brazil", "Argentina", "France", "England", "Spain", "Germany",
  "Portugal", "Netherlands", "Italy", "Belgium", "Croatia",
  "USA", "Mexico", "Canada",
]);

// ---- שליפת הנתונים ----
async function fetchMatches() {
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`fetch failed: HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data.matches)) throw new Error("unexpected JSON: no matches[]");
  return data.matches;
}

// ---- סינון "משחקים מעניינים" ----
function isInteresting(m) {
  const isGroup = /^Matchday/.test(m.round);
  if (!isGroup) return true; // כל הנוקאאוט תמיד נכלל
  return BIG_NATIONS.has(m.team1) || BIG_NATIONS.has(m.team2);
}

// ---- זמן: "13:00 UTC-6" + תאריך → אובייקט Date (רגע מדויק ב-UTC) ----
function parseKickoff(dateStr, timeStr) {
  const m = /^(\d{1,2}):(\d{2})\s*UTC([+-]\d{1,2})$/.exec(timeStr.trim());
  if (!m) return null;
  const [, hh, mm, off] = m;
  const sign = off[0] === "-" ? "-" : "+";
  const offh = String(Math.abs(parseInt(off, 10))).padStart(2, "0");
  // ISO עם offset → JS מחשב את הרגע ב-UTC נכון
  return new Date(`${dateStr}T${hh.padStart(2, "0")}:${mm}:00${sign}${offh}:00`);
}

// פורמט UTC ל-ICS: YYYYMMDDTHHMMSSZ
function icsUTC(d) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// שעת ישראל בעברית: "יום חמישי, 11 ביוני 2026, 22:00"
const ILfmt = new Intl.DateTimeFormat("he-IL", {
  timeZone: "Asia/Jerusalem",
  weekday: "long", day: "numeric", month: "long", year: "numeric",
  hour: "2-digit", minute: "2-digit", hour12: false,
});
function israelTime(d) {
  return ILfmt.format(d).replace(" בשעה ", ", ");
}

// ---- בניית VEVENT ----
function escapeICS(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;")
    .replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

// קיפול שורות ארוכות לפי RFC 5545 (75 octets, המשך עם רווח מוביל)
function fold(line) {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const out = [];
  let chunk = "";
  for (const ch of line) {
    const cand = chunk + ch;
    if (Buffer.byteLength(cand, "utf8") > 73) { out.push(chunk); chunk = " " + ch; }
    else chunk = cand;
  }
  out.push(chunk);
  return out.join("\r\n");
}

function buildEvent(m, idx, stamp) {
  const start = parseKickoff(m.date, m.time);
  if (!start) return null;
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // 2 שעות

  const t1 = teamName(m.team1), t2 = teamName(m.team2);
  const stage = stageName(m.round, m.group);
  const v = venue(m.ground);
  const loc = [v.stadium, [v.city, v.country].filter(Boolean).join(", ")]
    .filter(Boolean).join(" – ");

  const summary = `${t1} נגד ${t2}`;
  const description = [
    `שלב: ${stage}`,
    `אצטדיון: ${v.stadium}`,
    `מיקום: ${[v.city, v.country].filter(Boolean).join(", ")}`,
    `שעת ישראל: ${israelTime(start)}`,
    ``,
    `(${m.team1} vs ${m.team2} — ${m.round})`,
  ].join("\n");

  // UID יציב: num של המשחק אם קיים, אחרת מיקום במערך. כך עדכון נבחרת = החלפה, לא כפילות.
  const uid = `wc2026-${m.num != null ? "m" + m.num : "i" + idx}@openfootball`;

  return [
    "BEGIN:VEVENT",
    fold(`UID:${uid}`),
    `DTSTAMP:${stamp}`,
    `DTSTART:${icsUTC(start)}`,
    `DTEND:${icsUTC(end)}`,
    `SEQUENCE:${Math.floor(Date.now() / 1000)}`,
    `LAST-MODIFIED:${stamp}`,
    fold(`SUMMARY:${escapeICS(summary)}`),
    fold(`LOCATION:${escapeICS(loc)}`),
    fold(`DESCRIPTION:${escapeICS(description)}`),
    "END:VEVENT",
  ].join("\r\n");
}

// ---- בניית הלוח המלא ----
function buildCalendar(matches) {
  const stamp = icsUTC(new Date());
  const events = matches
    .filter(isInteresting)
    .map((m, i) => buildEvent(m, matches.indexOf(m), stamp))
    .filter(Boolean);

  const header = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//wc2026//selected-matches//HE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    fold("X-WR-CALNAME:מונדיאל 2026 – משחקים נבחרים"),
    "X-WR-TIMEZONE:Asia/Jerusalem",
    "X-PUBLISHED-TTL:PT12H",
    "REFRESH-INTERVAL;VALUE=DURATION:PT12H",
  ].join("\r\n");

  return [header, ...events, "END:VCALENDAR"].join("\r\n") + "\r\n";
}

// ---- main ----
const matches = await fetchMatches();
const ics = buildCalendar(matches);
writeFileSync("worldcup.ics", ics, "utf8");

const total = matches.length;
const selected = matches.filter(isInteresting).length;
console.log(`נוצר worldcup.ics — ${selected} מתוך ${total} משחקים נבחרו.`);
