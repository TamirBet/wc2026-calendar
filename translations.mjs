// מילוני תרגום אנגלית→עברית עבור מונדיאל 2026
// כל ערך שאין לו תרגום — מוחזר כמות שהוא (fallback בטוח).

// 48 הנבחרות (לפי השמות במקור openfootball)
export const NATIONS = {
  "Algeria": "אלג'יריה",
  "Argentina": "ארגנטינה",
  "Australia": "אוסטרליה",
  "Austria": "אוסטריה",
  "Belgium": "בלגיה",
  "Bosnia & Herzegovina": "בוסניה והרצגובינה",
  "Brazil": "ברזיל",
  "Canada": "קנדה",
  "Cape Verde": "כף ורדה",
  "Colombia": "קולומביה",
  "Croatia": "קרואטיה",
  "Curaçao": "קוראסאו",
  "Czech Republic": "צ'כיה",
  "DR Congo": "קונגו הדמוקרטית",
  "Ecuador": "אקוודור",
  "Egypt": "מצרים",
  "England": "אנגליה",
  "France": "צרפת",
  "Germany": "גרמניה",
  "Ghana": "גאנה",
  "Haiti": "האיטי",
  "Iran": "איראן",
  "Iraq": "עיראק",
  "Ivory Coast": "חוף השנהב",
  "Japan": "יפן",
  "Jordan": "ירדן",
  "Mexico": "מקסיקו",
  "Morocco": "מרוקו",
  "Netherlands": "הולנד",
  "New Zealand": "ניו זילנד",
  "Norway": "נורווגיה",
  "Panama": "פנמה",
  "Paraguay": "פרגוואי",
  "Portugal": "פורטוגל",
  "Qatar": "קטאר",
  "Saudi Arabia": "ערב הסעודית",
  "Scotland": "סקוטלנד",
  "Senegal": "סנגל",
  "South Africa": "דרום אפריקה",
  "South Korea": "דרום קוריאה",
  "Spain": "ספרד",
  "Sweden": "שוודיה",
  "Switzerland": "שווייץ",
  "Tunisia": "תוניסיה",
  "Turkey": "טורקיה",
  "USA": "ארה\"ב",
  "Uruguay": "אורוגוואי",
  "Uzbekistan": "אוזבקיסטן",
};

// אצטדיונים: שדה ground במקור → שם אצטדיון, עיר ומדינה בעברית
export const VENUES = {
  "Mexico City":                                { stadium: "אצטדיון אסטקה",        city: "מקסיקו סיטי",                 country: "מקסיקו" },
  "Guadalajara (Zapopan)":                      { stadium: "אצטדיון אקרון",        city: "גוודלחרה",                    country: "מקסיקו" },
  "Monterrey (Guadalupe)":                      { stadium: "אצטדיון BBVA",         city: "מונטריי",                     country: "מקסיקו" },
  "Toronto":                                    { stadium: "BMO Field",            city: "טורונטו",                     country: "קנדה" },
  "Vancouver":                                  { stadium: "BC Place",             city: "ונקובר",                      country: "קנדה" },
  "Atlanta":                                    { stadium: "מרצדס-בנץ סטדיום",     city: "אטלנטה",                      country: "ארה\"ב" },
  "San Francisco Bay Area (Santa Clara)":       { stadium: "אצטדיון ליווייס",      city: "מפרץ סן פרנסיסקו (סנטה קלרה)", country: "ארה\"ב" },
  "Los Angeles (Inglewood)":                    { stadium: "אצטדיון SoFi",         city: "לוס אנג'לס (אינגלווד)",       country: "ארה\"ב" },
  "Seattle":                                    { stadium: "Lumen Field",          city: "סיאטל",                       country: "ארה\"ב" },
  "New York/New Jersey (East Rutherford)":      { stadium: "מטלייף סטדיום",        city: "ניו יורק / ניו ג'רזי",        country: "ארה\"ב" },
  "Boston (Foxborough)":                        { stadium: "ג'ילט סטדיום",         city: "בוסטון (פוקסבורו)",           country: "ארה\"ב" },
  "Philadelphia":                               { stadium: "לינקולן פייננשל פילד", city: "פילדלפיה",                    country: "ארה\"ב" },
  "Miami (Miami Gardens)":                      { stadium: "הארד רוק סטדיום",      city: "מיאמי",                       country: "ארה\"ב" },
  "Houston":                                    { stadium: "NRG Stadium",          city: "יוסטון",                      country: "ארה\"ב" },
  "Kansas City":                                { stadium: "אארוהד סטדיום",        city: "קנזס סיטי",                   country: "ארה\"ב" },
  "Dallas (Arlington)":                         { stadium: "AT&T Stadium",         city: "דאלאס (ארלינגטון)",           country: "ארה\"ב" },
};

// שלבי הטורניר: השדה round → טקסט עברי. למשחקי בתים מטופל בנפרד (כולל מספר המחזור).
export const STAGES = {
  "Round of 32":          "שמינית גמר 32",
  "Round of 16":          "שמינית הגמר",
  "Quarter-final":        "רבע גמר",
  "Semi-final":           "חצי גמר",
  "Match for third place":"משחק על המקום השלישי",
  "Final":                "הגמר",
};

// המרת אות לטינית לאות עברית (A→א, B→ב, ...)
const GROUP_LETTERS = { A:"א", B:"ב", C:"ג", D:"ד", E:"ה", F:"ו", G:"ז", H:"ח", I:"ט", J:"י", K:"כ", L:"ל" };
function groupLetter(l) { return GROUP_LETTERS[l] || l; }

// תרגום שם קבוצה — כולל placeholders של הנוקאאוט.
export function teamName(t) {
  if (NATIONS[t]) return NATIONS[t];
  // placeholders: "1A" מנצחת בית, "2B" סגנית בית
  let m = /^([12])([A-L])$/.exec(t);
  if (m) return (m[1] === "1" ? "מנצחת בית " : "סגנית בית ") + groupLetter(m[2]);
  // "3A/B/C/D/F" — אחת מהמדורגות השלישיות
  if (/^3[A-L/]+$/.test(t)) {
    const letters = t.slice(1).split("/").map(groupLetter).join("/");
    return "מדורגת 3 (בתים " + letters + ")";
  }
  // "W74" מנצחת משחק, "L101" מפסידת משחק
  m = /^W(\d+)$/.exec(t); if (m) return "מנצחת משחק " + m[1];
  m = /^L(\d+)$/.exec(t); if (m) return "מפסידת משחק " + m[1];
  return t; // fallback
}

// תרגום השלב לטקסט עברי. למשחקי בתים מוסיף את מספר המחזור והבית.
export function stageName(round, group) {
  if (STAGES[round]) return STAGES[round];
  const m = /^Matchday\s+(\d+)$/.exec(round);
  if (m) {
    const g = group ? " (בית " + groupLetter(group.replace("Group ", "")) + ")" : "";
    return "שלב הבתים – מחזור " + m[1] + g;
  }
  return round; // fallback
}

// תרגום מיקום (ground) למבנה {stadium, city, country}. fallback אם לא מוכר.
export function venue(ground) {
  return VENUES[ground] || { stadium: ground, city: ground, country: "" };
}
