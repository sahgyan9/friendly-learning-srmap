import os
import json
import time
import base64
import urllib.request
import fitz
from concurrent.futures import ThreadPoolExecutor, as_completed

SUPABASE_URL = "https://ruapdkrgcbqrhvsayvpf.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1YXBka3JnY2Jxcmh2c2F5dnBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA4ODU5NzMsImV4cCI6MjA1NjQ2MTk3M30.V5jQfO-__C1gSbX33c2M-iBouFVWbO1bSPnRlc9iw1s"
OCR_ENDPOINT = f"{SUPABASE_URL}/functions/v1/parse-doc-ocr"

TRANSCRIPTION_DIR = "tools/code_of_conduct_transcriptions"
os.makedirs(TRANSCRIPTION_DIR, exist_ok=True)

def transcribe_page_with_ocr(page_num, img_path):
    cache_path = os.path.join(TRANSCRIPTION_DIR, f"page_{page_num:02d}.txt")
    if os.path.exists(cache_path):
        with open(cache_path, "r", encoding="utf-8") as f:
            content = f.read().strip()
            if content and len(content) > 50:
                return page_num, content

    with open(img_path, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode()

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {ANON_KEY}",
        "apikey": ANON_KEY
    }
    payload = {
        "imageBase64": img_b64,
        "mimeType": "image/jpeg",
        "pageNum": page_num
    }
    req = urllib.request.Request(OCR_ENDPOINT, data=json.dumps(payload).encode(), headers=headers)
    
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=50) as resp:
                data = json.loads(resp.read().decode())
                text = data.get("text", "").strip()
                if text:
                    with open(cache_path, "w", encoding="utf-8") as f:
                        f.write(text)
                    print(f"  [OK] Page {page_num}/41 transcribed ({len(text)} chars).")
                    return page_num, text
        except Exception as e:
            time.sleep(3 * (attempt + 1))

    print(f"  [WARN] Page {page_num}/41 failed after retries.")
    return page_num, ""

def parse_academic_calendar():
    print("\n--- Parsing Academic Calendar AY 2026-27 ---")
    doc = fitz.open("University_Data/Academic Calendar AY2026-27.pdf")
    sections = []

    # Page 1: Odd Sem
    sections.append({
        "document_slug": "academic-calendar-2026-27",
        "document_title": "Academic Calendar AY 2026-27",
        "academic_year": "2026-27",
        "category": "academic_calendar",
        "section_heading": "Odd Semester Key Academic Dates & Timelines",
        "content": doc[0].get_text().strip(),
        "page_number": 1,
        "source_filename": "Academic Calendar AY2026-27.pdf"
    })

    # Page 2: Even Sem
    sections.append({
        "document_slug": "academic-calendar-2026-27",
        "document_title": "Academic Calendar AY 2026-27",
        "academic_year": "2026-27",
        "category": "academic_calendar",
        "section_heading": "Even Semester Key Academic Dates & Timelines",
        "content": doc[1].get_text().strip(),
        "page_number": 2,
        "source_filename": "Academic Calendar AY2026-27.pdf"
    })

    # Page 3: Odd Sem Working Days
    sections.append({
        "document_slug": "academic-calendar-2026-27",
        "document_title": "Academic Calendar AY 2026-27",
        "academic_year": "2026-27",
        "category": "academic_calendar",
        "section_heading": "Odd Semester Working Days, Day Orders & Holidays",
        "content": doc[2].get_text().strip(),
        "page_number": 3,
        "source_filename": "Academic Calendar AY2026-27.pdf"
    })

    # Page 4: Even Sem Working Days
    sections.append({
        "document_slug": "academic-calendar-2026-27",
        "document_title": "Academic Calendar AY 2026-27",
        "academic_year": "2026-27",
        "category": "academic_calendar",
        "section_heading": "Even Semester Working Days, Day Orders & Holidays",
        "content": doc[3].get_text().strip(),
        "page_number": 4,
        "source_filename": "Academic Calendar AY2026-27.pdf"
    })

    # Pages 5-15: Events AY 2026-27
    events_text = "\n\n".join([doc[p].get_text().strip() for p in range(4, 15)])
    sections.append({
        "document_slug": "academic-calendar-2026-27",
        "document_title": "Academic Calendar AY 2026-27",
        "academic_year": "2026-27",
        "category": "academic_calendar",
        "section_heading": "University Events, Fests, Workshops & Conferences Schedule (AY 2026-27)",
        "content": events_text,
        "page_number": 5,
        "source_filename": "Academic Calendar AY2026-27.pdf"
    })

    # Pages 16-17: Statutory Meetings
    meetings_text = "\n\n".join([doc[p].get_text().strip() for p in range(15, len(doc))])
    sections.append({
        "document_slug": "academic-calendar-2026-27",
        "document_title": "Academic Calendar AY 2026-27",
        "academic_year": "2026-27",
        "category": "academic_calendar",
        "section_heading": "Statutory Meetings (Academic Council, Finance Committee, Governing Body)",
        "content": meetings_text,
        "page_number": 16,
        "source_filename": "Academic Calendar AY2026-27.pdf"
    })

    print(f"Generated {len(sections)} sections for Academic Calendar.")
    return sections

def process_code_of_conduct():
    print("\n--- Processing Student Code of Conduct (41 Pages Parallel) ---")
    doc = fitz.open("University_Data/01. Student Code of Conduct of SRM UNIVERSITY AP.pdf")
    os.makedirs("tools/code_of_conduct_pages", exist_ok=True)

    tasks = []
    for i, page in enumerate(doc):
        page_num = i + 1
        img_path = f"tools/code_of_conduct_pages/page_{page_num:02d}.jpg"
        if not os.path.exists(img_path):
            pix = page.get_pixmap(dpi=120)
            pix.save(img_path, "jpeg")
        tasks.append((page_num, img_path))

    results = {}
    # Use 3 concurrent workers with automatic backoff
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {executor.submit(transcribe_page_with_ocr, pnum, path): pnum for pnum, path in tasks}
        for future in as_completed(futures):
            pnum, text = future.result()
            if text:
                results[pnum] = text

    sections = []
    for p_num in sorted(results.keys()):
        p_text = results[p_num].strip()
        lines = [l.strip() for l in p_text.split("\n") if l.strip() and not l.startswith("|")]
        heading = lines[0].replace("#", "").strip() if lines else f"Section on Page {p_num}"
        if len(heading) > 80:
            heading = heading[:77] + "..."

        sections.append({
            "document_slug": "code-of-conduct",
            "document_title": "Student Code of Conduct",
            "academic_year": "2026-27",
            "category": "code_of_conduct",
            "section_heading": f"Page {p_num}: {heading}",
            "content": p_text,
            "page_number": p_num,
            "source_filename": "01. Student Code of Conduct of SRM UNIVERSITY AP.pdf"
        })

    print(f"Generated {len(sections)} page-level sections for Code of Conduct.")
    return sections

def generate_sql_insert_file(sections):
    print(f"\n--- Generating SQL Insert File for {len(sections)} sections ---")
    sql_lines = [
        "-- Ingestion of Campus Documents",
        "DELETE FROM public.campus_documents WHERE document_slug IN ('academic-calendar-2026-27', 'code-of-conduct');",
        ""
    ]

    for s in sections:
        slug = s["document_slug"].replace("'", "''")
        title = s["document_title"].replace("'", "''")
        ay = s["academic_year"].replace("'", "''")
        cat = s["category"].replace("'", "''")
        heading = s["section_heading"].replace("'", "''")
        content = s["content"].replace("'", "''")
        pnum = s["page_number"]
        fname = s["source_filename"].replace("'", "''")

        sql_lines.append(
            f"INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)\n"
            f"VALUES ('{slug}', '{title}', '{ay}', '{cat}', '{heading}', '{content}', {pnum}, '{fname}', true);"
        )

    out_sql = "tools/insert_campus_documents.sql"
    with open(out_sql, "w", encoding="utf-8") as f:
        f.write("\n".join(sql_lines))

    print(f"Generated {out_sql} with {len(sections)} insert statements.")

def main():
    calendar_sections = parse_academic_calendar()
    conduct_sections = process_code_of_conduct()
    all_sections = calendar_sections + conduct_sections
    
    with open("tools/campus_documents_data.json", "w", encoding="utf-8") as f:
        json.dump(all_sections, f, indent=2)

    generate_sql_insert_file(all_sections)
    print("\n[DONE] Extraction, OCR, and SQL generation complete.")

if __name__ == "__main__":
    main()
