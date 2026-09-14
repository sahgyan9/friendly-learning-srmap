# tools/

Developer-run scripts. Nothing here is part of the app build or the deployed
functions, and nothing here runs on a schedule. The GitHub repo is public, so
never put a key, password, or personal data file in this folder.

| Script | What it is for |
| --- | --- |
| `scrape_faculty_research.mjs` | Scrapes research interests, office and email from SRM AP faculty pages. Output feeds a one-time enrichment; production is already enriched. |
| `backfill_events_rich_data.mjs` | Re-fetches registration links and details for SRM AP events. `sync-srmap-events` does this on schedule now; use only to repair old rows. |
| `process_university_data.py` | Turns the PDFs in `University_Data/` into `campus_documents_data.json` and `insert_campus_documents.sql`, which `seed-campus-documents` ingests. |
| `code_of_conduct_transcriptions/` | Page-by-page text of the Code of Conduct PDF, used by the script above. |
| `srm-captcha-templates/` | Builds and validates the captcha OCR templates used by `supabase/functions/_shared/srm-portal.ts`. See the header comment there before changing anything. |
| `apply_timetable_sync.mjs`, `apply_finance_sync.mjs` | Parse saved portal HTML from `.tmp/` into timetable and fee rows for manual verification. |
| `test_*_parser.mjs`, `test_fetch_*.mjs`, `test_srmap_events_scraper.mjs` | Offline checks for the portal and events parsers against saved HTML in `.tmp/`. Run with `node tools/<file>`. |

Finished one-off scripts (the August faculty-enrichment SQL splitters and
scratch probes) were removed on 2026-09-14; they are in git history if needed.
