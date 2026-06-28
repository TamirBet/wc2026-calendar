// מייצר קובץ worldcup.ics עם המשחקים הנבחרים של מונדיאל 2026.
// מקור נתונים: openfootball/worldcup.json (חופשי, ללא מפתח API).
// כל הנוקאאוט + משחקי בתים של נבחרות בולטות. שפה: עברית.
//
// הרצה:  node generate-ics.mjs
import { writeFileSync } from "node:fs";
import { teamName, stageName, venue } from "./translations.mjs";

const SOURCE_URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

// נבחרות שמשחקי הבתים שלהן ייכללו. שמות לפי המקור.
const BIG_NATIONS = new Set([
  "Brazil", "Argentina", "France", "England", "Spain", "Germany",
  "Portugal", "Netherlands", "Italy",
]);

// משחק הפתיחה (מקסיקו–דרום אפריקה, 11.6, 13:00 UTC-6) — נכלל תמיד.
const OPENING_MATCH = { date: "2026-06-11", team1: "Mexico", team2: "South Africa" };

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
  if (m.date === OPENING_MATCH.date && m.team1 === OPENING_MATCH.team1) return true; // משחק הפתיחה
  return BIG_NATIONS.has(m.team1) || BIG_NATIONS.has(m.team2);
}

// ---- זמן: "13:00 UTC-6" + תאריך → אובייקט Date (רגע מדויק ב-UTC) ----
function parseKickoff(dateStr, timeStr) {
  const m = /^(\d{1,2}):(\d{2})\s*UTC([+-]\d{1,2})$/.exec(timeStr.trim());
  if (!m) return null;
  const [, hh, mm, off] = m;
  const sign = off[0] === "-" ? "-" : "+";
  const offh = String(Math.abs(parseInt(off, 10))).padStart(2, "0");
  return new Date(`${dateStr}T${hh.padStart(2, "0")}:${mm}:00${sign}${offh}:00`);
}

// פורמט UTC ל-ICS: YYYYMMDDTHHMMSSZ
function icsUTC(d) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// שעת ישראל מלאה: "יום חמישי, 11 ביוני 2026, 22:00"
const ILfmt = new Intl.DateTimeFormat("he-IL", {
  timeZone: "Asia/Jerusalem",
  weekday: "long", day: "numeric", month: "long", year: "numeric",
  hour: "2-digit", minute: "2-digit", hour12: false,
});
function israelTime(d) {
  return ILfmt.format(d).replace(" בשעה ", ", ");
}

// שעת ישראל קצרה (ללא שנה): "יום שישי, 4 ביולי, 22:00"
const ILfmtShort = new Intl.DateTimeFormat("he-IL", {
  timeZone: "Asia/Jerusalem",
  weekday: "long", day: "numeric", month: "long",
  hour: "2-digit", minute: "2-digit", hour12: false,
});
function israelTimeShort(d) {
  return ILfmtShort.format(d).replace(" בשעה ", ", ");
}

// ---- פתרון "מי תהיה היריבה הבאה" לפי מפתח (W74, L101, או שם אמיתי) ----
function resolveOpponent(key, matchByNum) {
  if (!key) return "";
  // שם אמיתי של נבחרת
  if (!/^[WL]/.test(key)) return teamName(key);
  // W{N} = מנצחת משחק N
  const wm = /^W(\d+)$/.exec(key);
  if (wm) {
    const ref = matchByNum[+wm[1]];
    if (ref && ref.team1 && ref.team2 && !/^[WL]/.test(ref.team1) && !/^[WL]/.test(ref.team2)) {
      return `מנצחת ${teamName(ref.team1)}–${teamName(ref.team2)}`;
    }
    return teamName(key); // fallback: "מנצחת משחק N"
  }
  // L{N} = מפסידת משחק N (מופיע רק במשחק המקום השלישי)
  const lm = /^L(\d+)$/.exec(key);
  if (lm) {
    const ref = matchByNum[+lm[1]];
    if (ref && ref.team1 && ref.team2 && !/^[WL]/.test(ref.team1) && !/^[WL]/.test(ref.team2)) {
      return `מפסידת ${teamName(ref.team1)}–${teamName(ref.team2)}`;
    }
    return teamName(key);
  }
  return teamName(key);
}

// ---- בניית VEVENT ----
function escapeICS(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;")
    .replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

// קיפול שורות ארוכות לפי RFC 5545 (75 octets)
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

function buildEvent(m, idx, stamp, ctx) {
  const start = parseKickoff(m.date, m.time);
  if (!start) return null;
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // 2 שעות

  const t1 = teamName(m.team1), t2 = teamName(m.team2);
  const stage = stageName(m.round, m.group);
  const v = venue(m.ground);
  const loc = [v.stadium, [v.city, v.country].filter(Boolean).join(", ")]
    .filter(Boolean).join(" – ");

  // ---- מידע בראקט: "המנצחת תפגוש" (למשחקי נוקאאוט בלבד) ----
  let bracketLine = "";
  const isGroup = /^Matchday/.test(m.round);
  if (!isGroup && m.num != null && ctx) {
    const { matchByNum, feedsInto } = ctx;
    const nextMatch = feedsInto[`W${m.num}`];
    if (nextMatch) {
      const myKey = `W${m.num}`;
      const opponentKey = nextMatch.team1 === myKey ? nextMatch.team2 : nextMatch.team1;
      const opponent = resolveOpponent(opponentKey, matchByNum);
      const nextStart = parseKickoff(nextMatch.date, nextMatch.time);
      const nextStage = stageName(nextMatch.round, nextMatch.group);
      const timeStr = nextStart ? israelTimeShort(nextStart) : "";
      bracketLine = `המנצחת תפגוש: ${opponent} — ${timeStr} [${nextStage}]`;
    }
  }

  const descLines = [
    `שלב: ${stage}`,
    `אצטדיון: ${v.stadium}`,
    `מיקום: ${[v.city, v.country].filter(Boolean).join(", ")}`,
    `שעת ישראל: ${israelTime(start)}`,
  ];
  if (bracketLine) descLines.push(bracketLine);
  descLines.push(``, `(${m.team1} vs ${m.team2} — ${m.round})`);
  const description = descLines.join("\n");

  const uid = `wc2026-${m.num != null ? "m" + m.num : "i" + idx}@openfootball`;

  return [
    "BEGIN:VEVENT",
    fold(`UID:${uid}`),
    `DTSTAMP:${stamp}`,
    `DTSTART:${icsUTC(start)}`,
    `DTEND:${icsUTC(end)}`,
    `SEQUENCE:${Math.floor(Date.now() / 1000)}`,
    `LAST-MODIFIED:${stamp}`,
    fold(`SUMMARY:${escapeICS(t1 + " נגד " + t2)}`),
    fold(`LOCATION:${escapeICS(loc)}`),
    fold(`DESCRIPTION:${escapeICS(description)}`),
    "END:VEVENT",
  ].join("\r\n");
}

// ---- בניית הלוח המלא ----
function buildCalendar(allMatches, ctx) {
  const stamp = icsUTC(new Date());
  const events = allMatches
    .filter(isInteresting)
    .map((m, i) => buildEvent(m, i, stamp, ctx))
    .filter(Boolean);

  const header = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//wc2026//selected-matches//HE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    fold("X-WR-CALNAME:מונדיאל 2026 – משחקים נבחרים"),
    "X-WR-TIMEZONE:Asia/Jerusalem",
    "X-PUBLISHED-TTL:PT1H",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
  ].join("\r\n");

  return [header, ...events, "END:VCALENDAR"].join("\r\n") + "\r\n";
}

// ---- main ----
const allMatches = await fetchMatches();

// מספור רציף לכל המשחקים (1-104) — משמש לבניית מפת הבראקט
allMatches.forEach((m, i) => { m.num = i + 1; });

// מיפוי num → match
const matchByNum = {};
allMatches.forEach(m => { matchByNum[m.num] = m; });

// מיפוי "W{N}" / "L{N}" → המשחק שמכיל את ה-placeholder הזה כצוות
const feedsInto = {};
for (const m of allMatches) {
  for (const key of [m.team1, m.team2]) {
    if (key && /^[WL]\d+$/.test(key)) feedsInto[key] = m;
  }
}

const ctx = { matchByNum, feedsInto };
const ics = buildCalendar(allMatches, ctx);
writeFileSync("worldcup.ics", ics, "utf8");

const selected = allMatches.filter(isInteresting).length;
console.log(`נוצר worldcup.ics — ${selected} מתוך ${allMatches.length} משחקים נבחרו.`);
