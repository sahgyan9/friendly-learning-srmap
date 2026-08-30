import { strict as assert } from "node:assert";

function stripTags(s) {
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function calculateAttendanceMetrics(conducted, attended) {
  const percentage = conducted > 0 ? Number(((attended / conducted) * 100).toFixed(2)) : 100.0;
  const classesNeeded = percentage < 75.0 ? Math.max(0, Math.ceil(3 * conducted - 4 * attended)) : 0;
  const safeBunks = percentage >= 75.0 ? Math.max(0, Math.floor((4 * attended - 3 * conducted) / 3)) : 0;
  return { percentage, classesNeeded, safeBunks };
}

function cleanFacultyName(raw, courseName = "", courseCode = "") {
  if (!raw) return null;
  let name = stripTags(raw).trim();
  name = name.replace(/^\d+\s*[-–:]\s*/, "").replace(/\s*\(\s*\d+\s*\)$/, "");
  name = name.split(/\s*[\/\-–]\s*(?:AP|Prof|Assistant|Associate|Professor|Dept|Department|PHY|CSE|ECE|MECH|CIVIL|MATHS|BIO)/i)[0].trim();
  if (name.length < 3 || /^(tba|not assigned|staff|null|undefined|none|-|--)$/i.test(name)) return null;
  if (!/[a-zA-Z]{3,}/.test(name)) return null;

  let prefix = "";
  const prefixMatch = name.match(/^(Dr\.?|Prof\.?|Mr\.?|Ms\.?|Mrs\.?)\s+/i);
  if (prefixMatch) {
    const rawPre = prefixMatch[1].replace(/\.?$/, ".");
    prefix = rawPre.charAt(0).toUpperCase() + rawPre.slice(1).toLowerCase() + " ";
    name = name.slice(prefixMatch[0].length).trim();
  }

  if (name === name.toUpperCase() && name.length > 2) {
    name = name
      .toLowerCase()
      .split(" ")
      .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : ""))
      .join(" ");
  }

  const finalName = (prefix + name).trim();

  if (courseName && finalName.toLowerCase() === courseName.toLowerCase()) return null;
  if (courseCode && finalName.toLowerCase() === courseCode.toLowerCase()) return null;
  if (courseName && courseName.length >= 6 && (courseName.toLowerCase().includes(finalName.toLowerCase()) || finalName.toLowerCase().includes(courseName.toLowerCase()))) {
    return null;
  }

  return finalName;
}

function cleanSlot(raw) {
  if (!raw) return null;
  const slot = stripTags(raw).replace(/\s+/g, "").toUpperCase();
  if (/^[A-Z][0-9]?(\+[A-Z][0-9]?)*$/.test(slot) && slot.length <= 8) {
    if (!/^(THEORY|PRACTICAL|LAB|PROJECT|REGULAR|AUDIT|CORE|ELECTIVE|REGULAR|PASS)$/i.test(slot)) {
      return slot;
    }
  }
  return null;
}

function parseCourseList(...htmlSources) {
  const result = {};

  for (const html of htmlSources) {
    if (!html || typeof html !== "string") continue;

    const allRows = [];
    for (const trMatch of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const rowContent = trMatch[1];
      const cells = [...rowContent.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => stripTags(m[1]).trim());
      if (cells.length >= 2) {
        allRows.push(cells);
      }
    }

    if (allRows.length === 0) continue;

    const headerMap = {};
    for (const row of allRows) {
      const rowStr = row.join(" ").toLowerCase();
      if (rowStr.includes("course") || rowStr.includes("subject") || rowStr.includes("code") || rowStr.includes("faculty") || rowStr.includes("slot") || rowStr.includes("teacher")) {
        row.forEach((cell, idx) => {
          const c = cell.toLowerCase().trim();
          if (c.includes("course code") || c.includes("sub code") || c.includes("subject code") || c === "code") headerMap.code = idx;
          else if (c.includes("course title") || c.includes("course name") || c.includes("sub desc") || c.includes("subject description") || c.includes("subject name") || c.includes("description") || c.includes("title")) headerMap.name = idx;
          else if (c === "slot" || c.includes("slot code") || c.includes("course slot") || c === "batch/slot" || c.includes("slot")) headerMap.slot = idx;
          else if (c.includes("faculty") || c.includes("teacher") || c.includes("staff") || c.includes("instructor") || c.includes("handled by") || c.includes("advisor")) headerMap.faculty = idx;
          else if (c === "type" || c.includes("course type")) headerMap.type = idx;
          else if (c === "credit" || c.includes("credits")) headerMap.credit = idx;
        });
        if (headerMap.code !== undefined && (headerMap.faculty !== undefined || headerMap.slot !== undefined || headerMap.name !== undefined)) {
          break;
        }
      }
    }

    for (const cells of allRows) {
      const firstCell = (cells[0] || "").toLowerCase();
      if (firstCell.includes("s.no") || firstCell.includes("subject code") || firstCell.includes("course code") || firstCell.includes("sl.no")) {
        continue;
      }

      let code = "";
      let codeIndex = -1;

      if (headerMap.code !== undefined && /^[A-Z]{2,4}\s*\d{3}[A-Z0-9]*$/i.test(cells[headerMap.code])) {
        code = cells[headerMap.code].toUpperCase();
        codeIndex = headerMap.code;
      } else {
        for (let i = 0; i < cells.length; i++) {
          if (/^[A-Z]{2,4}\s*\d{3}[A-Z0-9]*$/i.test(cells[i])) {
            code = cells[i].toUpperCase();
            codeIndex = i;
            break;
          }
        }
      }

      if (!code) continue;

      let name = "";
      let slot = null;
      let facultyName = null;
      let courseType = null;
      let credit = null;

      if (headerMap.name !== undefined && cells[headerMap.name]) {
        name = cells[headerMap.name];
      } else if (codeIndex + 1 < cells.length && isNaN(Number(cells[codeIndex + 1]))) {
        name = cells[codeIndex + 1];
      }

      if (headerMap.slot !== undefined && cells[headerMap.slot]) {
        slot = cleanSlot(cells[headerMap.slot]);
      }

      if (headerMap.faculty !== undefined && cells[headerMap.faculty]) {
        facultyName = cleanFacultyName(cells[headerMap.faculty], name, code);
      }

      if (headerMap.type !== undefined && cells[headerMap.type]) {
        courseType = cells[headerMap.type];
      }

      if (headerMap.credit !== undefined && cells[headerMap.credit]) {
        const parsedCredit = parseInt(cells[headerMap.credit], 10);
        if (!isNaN(parsedCredit)) credit = parsedCredit;
      }

      if (!facultyName) {
        for (let i = 0; i < cells.length; i++) {
          const val = cells[i];
          if (!val) continue;

          if (/^(Dr\.?|Prof\.?|Mr\.?|Ms\.?|Mrs\.?)\s+/i.test(val) || (/\(\s*\d{4,8}\s*\)/.test(val) && /[A-Za-z]{3,}/.test(val))) {
            const candidateFaculty = cleanFacultyName(val, name, code);
            if (candidateFaculty) {
              facultyName = candidateFaculty;
            }
          }
        }
      }

      const existing = result[code] || {};
      result[code] = {
        code,
        name: name || existing.name || code,
        slot: slot || existing.slot || null,
        facultyName: facultyName || existing.facultyName || null,
        courseType: courseType || existing.courseType || null,
        credit: credit !== null ? credit : (existing.credit ?? null),
      };
    }
  }

  return result;
}

function parseAttendance(html, courseListDetails = {}) {
  const courses = [];
  if (!html) return courses;

  const allRows = [];
  for (const trMatch of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const rowContent = trMatch[1];
    const cells = [...rowContent.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => stripTags(m[1]).trim());
    if (cells.length >= 3) {
      allRows.push(cells);
    }
  }

  if (allRows.length === 0) return courses;

  const headerMap = {};

  for (const row of allRows) {
    const rowStr = row.join(" ").toLowerCase();
    if (rowStr.includes("subject") || rowStr.includes("course") || rowStr.includes("conducted") || rowStr.includes("present")) {
      row.forEach((cell, idx) => {
        const c = cell.toLowerCase().trim();
        const isPct = c.includes("%") || c.includes("percent");

        if (!isPct) {
          if (c.includes("subject code") || c.includes("course code") || c === "code") headerMap.code = idx;
          else if (c.includes("subject desc") || c.includes("course name") || c.includes("course title") || c.includes("description") || c.includes("subject name")) headerMap.name = idx;
          else if (c.includes("max") || c.includes("total planned") || c.includes("planned")) headerMap.maxHours = idx;
          else if (c.includes("conducted") || c.includes("classes held") || c.includes("total classes") || c.includes("total hrs") || c.includes("total hours")) headerMap.conducted = idx;
          else if (c.includes("present") || c.includes("attended") || c.includes("hours attended") || c.includes("attended hrs") || c === "p") headerMap.present = idx;
          else if (c.includes("absent") || c.includes("hours absent") || c.includes("absent hrs") || c === "a") headerMap.absent = idx;
          else if (c.includes("od") || c.includes("ml") || c.includes("on duty") || c.includes("medical leave")) headerMap.od = idx;
          else if (c.includes("slot")) headerMap.slot = idx;
          else if (c.includes("faculty") || c.includes("staff") || c.includes("teacher")) headerMap.faculty = idx;
        } else {
          if (c.includes("attendance") || c.includes("total") || headerMap.percentage === undefined) {
            headerMap.percentage = idx;
          }
        }
      });
      if (headerMap.code !== undefined || (headerMap.conducted !== undefined && headerMap.present !== undefined)) {
        break;
      }
    }
  }

  for (const cells of allRows) {
    if (cells[0].toLowerCase().includes("subject") || cells[0].toLowerCase().includes("s.no") || cells[1]?.toLowerCase().includes("subject description")) {
      continue;
    }

    let code = "";
    let codeIndex = -1;

    if (headerMap.code !== undefined && /^[A-Z]{2,4}\s*\d{3}[A-Z0-9]*$/i.test(cells[headerMap.code])) {
      code = cells[headerMap.code].toUpperCase();
      codeIndex = headerMap.code;
    } else {
      for (let i = 0; i < cells.length; i++) {
        if (/^[A-Z]{2,4}\s*\d{3}[A-Z0-9]*$/i.test(cells[i])) {
          code = cells[i].toUpperCase();
          codeIndex = i;
          break;
        }
      }
    }

    if (!code) continue;

    const registered = courseListDetails[code] || {};
    let name = registered.name || "";
    let slot = registered.slot || null;
    let facultyName = registered.facultyName || null;

    if (headerMap.name !== undefined && cells[headerMap.name]) {
      name = cells[headerMap.name];
    } else if (codeIndex + 1 < cells.length && isNaN(Number(cells[codeIndex + 1]))) {
      name = cells[codeIndex + 1];
    }
    if (!name) name = code;

    if (headerMap.slot !== undefined && cells[headerMap.slot]) {
      slot = cells[headerMap.slot];
    }
    if (headerMap.faculty !== undefined && cells[headerMap.faculty]) {
      facultyName = cells[headerMap.faculty];
    }

    let conducted = -1;
    let present = -1;
    let absent = -1;
    let od = 0;

    if (headerMap.conducted !== undefined && headerMap.present !== undefined) {
      const c = parseFloat(cells[headerMap.conducted]);
      const p = parseFloat(cells[headerMap.present]);
      const a = headerMap.absent !== undefined ? parseFloat(cells[headerMap.absent]) : NaN;
      const o = headerMap.od !== undefined ? parseFloat(cells[headerMap.od]) : NaN;
      if (!isNaN(c) && !isNaN(p)) {
        conducted = c;
        present = p;
        if (!isNaN(a)) absent = a;
        if (!isNaN(o)) od = o;
      }
    }

    if (conducted < 0 && cells.length >= 6 && codeIndex === 0) {
      const cond = parseFloat(cells[3]);
      const pres = parseFloat(cells[4]);
      const abs = parseFloat(cells[5]);
      const odVal = cells.length > 6 ? parseFloat(cells[6]) : 0;

      if (!isNaN(cond) && !isNaN(pres)) {
        conducted = cond;
        present = pres;
        absent = !isNaN(abs) ? abs : Math.max(0, conducted - present);
        od = !isNaN(odVal) ? odVal : 0;
      }
    }

    if (conducted < 0 && cells.length >= 5 && codeIndex === 0) {
      const c1 = parseFloat(cells[2]);
      const c2 = parseFloat(cells[3]);
      const c3 = parseFloat(cells[4]);
      if (!isNaN(c1) && !isNaN(c2) && !isNaN(c3) && (c2 + c3 === c1 || c2 <= c1)) {
        conducted = c1;
        present = c2;
        absent = c3;
      }
    }

    if (conducted < 0 || present < 0) {
      const numbers = [];
      for (let i = codeIndex + 1; i < cells.length; i++) {
        const val = parseFloat(cells[i].replace("%", "").trim());
        if (!isNaN(val)) {
          numbers.push(val);
        }
      }

      if (numbers.length >= 4 && numbers[1] >= numbers[2]) {
        conducted = numbers[1];
        present = numbers[2];
        absent = numbers[3];
        if (numbers.length >= 5 && numbers[4] < conducted) {
          od = numbers[4];
        }
      } else if (numbers.length >= 2) {
        conducted = numbers[0];
        present = numbers[1];
        absent = numbers.length >= 3 ? numbers[2] : Math.max(0, conducted - present);
      }
    }

    if (conducted >= 0 && present >= 0) {
      const effectiveAttended = Math.min(conducted, present + (isNaN(od) ? 0 : od));
      const effectiveAbsent = absent >= 0 ? absent : Math.max(0, conducted - effectiveAttended);
      const metrics = calculateAttendanceMetrics(conducted, effectiveAttended);

      courses.push({
        courseCode: code,
        courseName: name || code,
        slot,
        facultyName,
        conductedHours: conducted,
        attendedHours: effectiveAttended,
        absentHours: effectiveAbsent,
        attendancePercentage: metrics.percentage,
        classesNeeded: metrics.classesNeeded,
        safeBunks: metrics.safeBunks,
      });
    }
  }

  return courses;
}

// ------------------- TEST CASES -------------------

console.log("Running SRM Attendance Scraper tests...");

// Test Case 1: Real SRM AP Portal standard table with Max Hours (PHY 424, 426, 425)
const sampleHtml1 = `
<table>
  <tr>
    <th>Subject Code</th>
    <th>Subject Description</th>
    <th>Max Hours</th>
    <th>Hours Conducted</th>
    <th>Hours Attended</th>
    <th>Hours Absent</th>
    <th>OD / ML</th>
    <th>Present %</th>
    <th>Attendance %</th>
  </tr>
  <tr>
    <td>PHY 424</td>
    <td>ELECTRONIC MATERIALS AND DEVICE PHYSICS</td>
    <td>22</td>
    <td>16</td>
    <td>12</td>
    <td>4</td>
    <td>0</td>
    <td>75.00</td>
    <td>75.00</td>
  </tr>
  <tr>
    <td>PHY 426</td>
    <td>OPTICAL INFORMATION PROCESSING</td>
    <td>15</td>
    <td>11</td>
    <td>8</td>
    <td>3</td>
    <td>0</td>
    <td>72.73</td>
    <td>72.73</td>
  </tr>
  <tr>
    <td>PHY 425</td>
    <td>DEVICE CHARACTERIZATION AND INSTRUMENTATION</td>
    <td>22</td>
    <td>18</td>
    <td>18</td>
    <td>0</td>
    <td>0</td>
    <td>100.00</td>
    <td>100.00</td>
  </tr>
</table>
`;

// Course list with faculty and slots (ids=2)
const courseListHtml = `
<table>
  <tr>
    <th>S.No</th>
    <th>Course Code</th>
    <th>Course Title</th>
    <th>Type</th>
    <th>Credit</th>
    <th>Faculty Name</th>
    <th>Slot</th>
  </tr>
  <tr>
    <td>1</td>
    <td>PHY 424</td>
    <td>ELECTRONIC MATERIALS AND DEVICE PHYSICS</td>
    <td>Theory</td>
    <td>3</td>
    <td>Dr. Pranab Mandal</td>
    <td>A1</td>
  </tr>
  <tr>
    <td>2</td>
    <td>PHY 426</td>
    <td>OPTICAL INFORMATION PROCESSING</td>
    <td>Theory</td>
    <td>3</td>
    <td>Dr. Ranjit Thapa</td>
    <td>B1</td>
  </tr>
  <tr>
    <td>3</td>
    <td>PHY 425</td>
    <td>DEVICE CHARACTERIZATION AND INSTRUMENTATION</td>
    <td>Theory</td>
    <td>4</td>
    <td>Dr. Sabyasachi Mukhopadhyay</td>
    <td>C1</td>
  </tr>
</table>
`;

const courseMap = parseCourseList(courseListHtml);
assert.equal(courseMap["PHY 424"]?.facultyName, "Dr. Pranab Mandal");
assert.equal(courseMap["PHY 424"]?.slot, "A1");
assert.equal(courseMap["PHY 426"]?.facultyName, "Dr. Ranjit Thapa");
assert.equal(courseMap["PHY 425"]?.facultyName, "Dr. Sabyasachi Mukhopadhyay");

const parsed1 = parseAttendance(sampleHtml1, courseMap);
assert.equal(parsed1.length, 3);

// Verify PHY 424
const phy424 = parsed1.find((c) => c.courseCode === "PHY 424");
assert.equal(phy424.conductedHours, 16, "PHY 424 conducted should be 16, not 22");
assert.equal(phy424.attendedHours, 12, "PHY 424 attended should be 12, not 16");
assert.equal(phy424.absentHours, 4, "PHY 424 absent should be 4");
assert.equal(phy424.attendancePercentage, 75.0, "PHY 424 percentage should be 75%");
assert.equal(phy424.facultyName, "Dr. Pranab Mandal");
assert.equal(phy424.slot, "A1");

// Verify PHY 426
const phy426 = parsed1.find((c) => c.courseCode === "PHY 426");
assert.equal(phy426.conductedHours, 11, "PHY 426 conducted should be 11, not 15");
assert.equal(phy426.attendedHours, 8, "PHY 426 attended should be 8, not 11");
assert.equal(phy426.absentHours, 3, "PHY 426 absent should be 3");
assert.equal(phy426.attendancePercentage, 72.73, "PHY 426 percentage should be 72.73%");
assert.equal(phy426.facultyName, "Dr. Ranjit Thapa");

// Verify PHY 425
const phy425 = parsed1.find((c) => c.courseCode === "PHY 425");
assert.equal(phy425.conductedHours, 18, "PHY 425 conducted should be 18, not 22");
assert.equal(phy425.attendedHours, 18, "PHY 425 attended should be 18");
assert.equal(phy425.absentHours, 0, "PHY 425 absent should be 0");
assert.equal(phy425.attendancePercentage, 100.0, "PHY 425 percentage should be 100%");
assert.equal(phy425.facultyName, "Dr. Sabyasachi Mukhopadhyay");

// Test Case 2: OD / ML Leave Handling
const odHtml = `
<table>
  <tr>
    <td>CSE 303</td>
    <td>MACHINE LEARNING</td>
    <td>20</td>
    <td>16</td>
    <td>12</td>
    <td>2</td>
    <td>2</td>
    <td>75.00</td>
    <td>87.50</td>
  </tr>
</table>
`;
const parsedOD = parseAttendance(odHtml);
const cse303 = parsedOD[0];
assert.equal(cse303.conductedHours, 16);
assert.equal(cse303.attendedHours, 14, "Effective attended should be 12 Present + 2 OD = 14");
assert.equal(cse303.absentHours, 2);
assert.equal(cse303.attendancePercentage, 87.5);

console.log("All SRM Attendance Scraper test assertions passed successfully! ✅");
