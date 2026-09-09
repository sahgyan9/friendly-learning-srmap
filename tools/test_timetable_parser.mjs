import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(__dirname, "..", ".tmp", "report_section_10.html"), "utf8");

function stripTags(s) {
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTimetable(html) {
  const slots = [];
  if (!html) return slots;

  // 1. Extract subject details from #tblSubjectList if present
  const subjectMap = {};
  const subjectTableMatch = html.match(/<table[^>]*id=["']tblSubjectList["'][^>]*>([\s\S]*?)<\/table>/i);
  if (subjectTableMatch) {
    for (const trMatch of subjectTableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = [...trMatch[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => stripTags(m[1]));
      if (cells.length >= 4) {
        // e.g. ["PHY 424", "ELECTRONIC MATERIALS...", "2-0-2-4", "Dr. PRANAB MANDAL ( 17023 )", "(C 301),(X 312)"]
        const code = cells[0].toUpperCase().trim();
        if (/^[A-Z]{2,4}\s*\d{3}[A-Z0-9]*$/i.test(code)) {
          let fac = cells[3] || "";
          fac = fac.replace(/\s*\(\s*\d+\s*\)$/, "").trim(); // strip (17023)
          subjectMap[code] = {
            courseCode: code,
            courseName: cells[1] || code,
            ltpc: cells[2] || null,
            facultyName: fac || null,
            roomName: cells[4] || null,
          };
        }
      }
    }
  }
  console.log("Subject Map from Section 10:", subjectMap);

  // 2. Extract period timings from subheader row
  const timings = [];
  const subheaderMatch = html.match(/<tr[^>]*class=["'][^"']*subheader[^"']*["'][^>]*>([\s\S]*?)<\/tr>/i);
  if (subheaderMatch) {
    const timeCells = [...subheaderMatch[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => stripTags(m[1]));
    // First cell is &nbsp; or empty
    for (let i = 1; i < timeCells.length; i++) {
      const tStr = timeCells[i].trim();
      // e.g. "09:00 To 09:50", " 01:00 To 01:50", " 04:00 To 05:30"
      const match = tStr.match(/(\d{1,2}):(\d{2})\s*(?:To|-)\s*(\d{1,2}):(\d{2})/i);
      if (match) {
        let startH = parseInt(match[1], 10);
        const startM = match[2];
        let endH = parseInt(match[3], 10);
        const endM = match[4];

        // If time is in 12-hour format: 01:00..05:30 in afternoon are PM (13..17)
        // Periods 1..4 are morning (09..12), period 5 onwards are afternoon
        if (startH >= 1 && startH <= 7) startH += 12;
        if (endH >= 1 && endH <= 7) endH += 12;

        timings.push({
          hour: i,
          startTime: `${String(startH).padStart(2, "0")}:${startM}:00`,
          endTime: `${String(endH).padStart(2, "0")}:${endM}:00`,
          raw: tStr,
        });
      }
    }
  }
  console.log("Timings extracted from Section 10:", timings);

  // 3. Extract Day rows from #tblClassTimetable
  const dayMap = {
    monday: 1, mon: 1,
    tuesday: 2, tue: 2,
    wednesday: 3, wed: 3,
    thursday: 4, thu: 4,
    friday: 5, fri: 5,
    saturday: 6, sat: 6,
  };

  for (const trMatch of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const rowHtml = trMatch[1];
    const cells = [...rowHtml.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)];
    if (cells.length < 2) continue;

    const firstCellText = stripTags(cells[0][1]).trim().toLowerCase();
    if (!dayMap[firstCellText]) continue;

    const dayName = firstCellText.charAt(0).toUpperCase() + firstCellText.slice(1);
    const dayOrder = dayMap[firstCellText];

    // Each subsequent cell corresponds to an hour column
    for (let colIdx = 1; colIdx < cells.length; colIdx++) {
      const cellTag = cells[colIdx][0];
      const cellHtml = cells[colIdx][1];
      const cellText = stripTags(cellHtml).trim();
      if (!cellText || cellText === "-" || /^(free|lunch|break|nil|na)$/i.test(cellText)) continue;

      // Extract title attribute for course name
      const titleMatch = cellTag.match(/title=["']([^"']*)["']/i);
      const titleAttr = titleMatch ? titleMatch[1].trim() : "";

      const hour = colIdx;
      const timing = timings.find((t) => t.hour === hour) || {
        hour,
        startTime: `${String(8 + hour).padStart(2, "0")}:00:00`,
        endTime: `${String(8 + hour).padStart(2, "0")}:50:00`,
      };

      // Extract course code and room: e.g. "PHY 425(X 312)"
      const codeMatch = cellText.match(/([A-Z]{2,4}\s*\d{3}[A-Z0-9]*)/i);
      if (!codeMatch) continue;

      const courseCode = codeMatch[1].toUpperCase().replace(/\s+/, " ");

      // Room number inside parentheses: (X 312) or (C 301)
      const roomParenMatch = cellText.match(/\(([^)]+)\)/);
      let roomNumber = roomParenMatch ? roomParenMatch[1].trim() : null;

      // Course name from title attr, or subjectMap
      const subjInfo = subjectMap[courseCode];
      const courseName = titleAttr || subjInfo?.courseName || courseCode;
      const facultyName = subjInfo?.facultyName || null;

      if (!roomNumber && subjInfo?.roomName) {
        roomNumber = subjInfo.roomName;
      }

      const isLab = cellText.toLowerCase().includes("lab") || /2-0-2-4/.test(subjInfo?.ltpc || "") || courseCode.toLowerCase().includes("l");

      slots.push({
        dayOrder,
        dayName,
        hour: timing.hour,
        startTime: timing.startTime,
        endTime: timing.endTime,
        slot: null,
        courseCode,
        courseName,
        facultyName,
        roomNumber,
        isLab,
      });
    }
  }

  return slots;
}

const slots = parseTimetable(html);
console.log(`\nSuccessfully parsed ${slots.length} timetable slots:`);
console.table(slots.map(s => ({
  day: s.dayName,
  hour: s.hour,
  time: `${s.startTime}-${s.endTime}`,
  code: s.courseCode,
  name: s.courseName,
  room: s.roomNumber,
  faculty: s.facultyName,
})));
