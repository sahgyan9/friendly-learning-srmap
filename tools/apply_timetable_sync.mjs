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

const subjectMap = {};
const subjectTableMatch = html.match(/<table[^>]*id=["']tblSubjectList["'][^>]*>([\s\S]*?)<\/table>/i);
if (subjectTableMatch) {
  for (const trMatch of subjectTableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...trMatch[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => stripTags(m[1]));
    if (cells.length >= 4) {
      const code = cells[0].toUpperCase().trim();
      if (/^[A-Z]{2,4}\s*\d{3}[A-Z0-9]*$/i.test(code)) {
        let fac = cells[3] || "";
        fac = fac.replace(/\s*\(\s*\d+\s*\)$/, "").trim();
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

const timings = [];
const subheaderMatch = html.match(/<tr[^>]*class=["'][^"']*subheader[^"']*["'][^>]*>([\s\S]*?)<\/tr>/i);
if (subheaderMatch) {
  const timeCells = [...subheaderMatch[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => stripTags(m[1]));
  for (let i = 1; i < timeCells.length; i++) {
    const tStr = timeCells[i].trim();
    const match = tStr.match(/(\d{1,2}):(\d{2})\s*(?:To|-)\s*(\d{1,2}):(\d{2})/i);
    if (match) {
      let startH = parseInt(match[1], 10);
      const startM = match[2];
      let endH = parseInt(match[3], 10);
      const endM = match[4];

      if (startH >= 1 && startH <= 7) startH += 12;
      if (endH >= 1 && endH <= 7) endH += 12;

      timings.push({
        hour: i,
        startTime: `${String(startH).padStart(2, "0")}:${startM}:00`,
        endTime: `${String(endH).padStart(2, "0")}:${endM}:00`,
      });
    }
  }
}

const dayMap = {
  monday: 1, mon: 1,
  tuesday: 2, tue: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

const slots = [];
for (const trMatch of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
  const rowHtml = trMatch[1];
  const cells = [...rowHtml.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)];
  if (cells.length < 2) continue;

  const firstCellText = stripTags(cells[0][1]).trim().toLowerCase();
  if (!dayMap[firstCellText]) continue;

  const dayName = firstCellText.charAt(0).toUpperCase() + firstCellText.slice(1);
  const dayOrder = dayMap[firstCellText];

  for (let colIdx = 1; colIdx < cells.length; colIdx++) {
    const cellTag = cells[colIdx][0];
    const cellHtml = cells[colIdx][1];
    const cellText = stripTags(cellHtml).trim();
    if (!cellText || cellText === "-" || /^(free|lunch|break|nil|na)$/i.test(cellText)) continue;

    const titleMatch = cellTag.match(/title=["']([^"']*)["']/i);
    const titleAttr = titleMatch ? titleMatch[1].trim() : "";

    const hour = colIdx;
    const timing = timings.find((t) => t.hour === hour) || {
      hour,
      startTime: `${String(8 + hour).padStart(2, "0")}:00:00`,
      endTime: `${String(8 + hour).padStart(2, "0")}:50:00`,
    };

    const codeMatch = cellText.match(/([A-Z]{2,4}\s*\d{3}[A-Z0-9]*)/i);
    if (!codeMatch) continue;

    const courseCode = codeMatch[1].toUpperCase().replace(/\s+/, " ");
    const roomParenMatch = cellText.match(/\(([^)]+)\)/);
    let roomNumber = roomParenMatch ? roomParenMatch[1].trim() : null;

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

const userId = "54774a25-67a8-48da-abc7-3621f35fbb26";
const registerNumber = "AP23111260062";

const sqlValues = slots.map((s) => {
  const fName = s.facultyName ? `'${s.facultyName.replace(/'/g, "''")}'` : "NULL";
  const rNum = s.roomNumber ? `'${s.roomNumber.replace(/'/g, "''")}'` : "NULL";
  const cName = `'${s.courseName.replace(/'/g, "''")}'`;
  return `('${userId}', '${registerNumber}', ${s.dayOrder}, '${s.dayName}', ${s.hour}, '${s.startTime}', '${s.endTime}', NULL, '${s.courseCode}', ${cName}, ${fName}, ${rNum}, ${s.isLab}, now())`;
}).join(",\n  ");

const fullSql = `
INSERT INTO public.student_timetables (
  user_id, register_number, day_order, day_name, hour, start_time, end_time, slot, course_code, course_name, faculty_name, room_number, is_lab, last_synced_at
)
VALUES
  ${sqlValues}
ON CONFLICT (user_id, day_name, hour, course_code) DO UPDATE SET
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  course_name = EXCLUDED.course_name,
  faculty_name = EXCLUDED.faculty_name,
  room_number = EXCLUDED.room_number,
  is_lab = EXCLUDED.is_lab,
  last_synced_at = now();
`;

fs.writeFileSync(path.join(__dirname, "..", ".tmp", "insert_timetable.sql"), fullSql, "utf8");
console.log(`Generated SQL for ${slots.length} slots at .tmp/insert_timetable.sql`);
