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

function parseCourseList(html) {
  const result = {};
  if (!html) return result;

  for (const trMatch of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const rowContent = trMatch[1];
    const cells = [...rowContent.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => stripTags(m[1]).trim());
    if (cells.length < 3) continue;

    let codeIndex = -1;
    for (let i = 0; i < cells.length; i++) {
      if (/^[A-Z]{2,4}\s*\d{3}[A-Z0-9]*$/i.test(cells[i])) {
        codeIndex = i;
        break;
      }
    }
    if (codeIndex === -1) continue;

    const code = cells[codeIndex].toUpperCase();
    const name = cells[codeIndex + 1] && isNaN(Number(cells[codeIndex + 1])) ? cells[codeIndex + 1] : code;

    let slot = null;
    let facultyName = null;
    let courseType = null;
    let credit = null;

    for (let i = codeIndex + 2; i < cells.length; i++) {
      const val = cells[i];
      if (!val) continue;

      if (/^[1-9]$/.test(val) && credit === null) {
        credit = parseInt(val, 10);
      } else if (/^(theory|practical|lab|project|embedded|core|elective)$/i.test(val) && !courseType) {
        courseType = val;
      } else if (/^[A-Z][0-9]?(\+[A-Z][0-9]?)*$/i.test(val) && val.length <= 6 && !slot) {
        slot = val;
      } else if ((/^(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)/i.test(val) || /^[A-Z\s\.\-]{3,50}$/i.test(val)) && !/^\d+$/.test(val) && !facultyName) {
        if (val.length >= 3 && !/^(theory|practical|lab|semester|regular|registered|enrolled|passed)$/i.test(val)) {
          facultyName = val;
        }
      }
    }

    result[code] = {
      code,
      name,
      slot,
      facultyName,
      courseType,
      credit,
    };
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
