// Client-side text extraction for resume/LinkedIn PDF import.
//
// Gemini's document-vision ingestion (sending the raw PDF as inlineData) has
// to OCR/parse the whole file on every request -- slow, and it means shipping
// a base64-inflated multi-MB payload over the wire twice (browser -> edge
// function -> Gemini). Most resumes are plain text underneath, so pulling the
// text out here first lets the common case skip both the big upload and the
// document-vision path entirely; only a scanned/image-only PDF needs to fall
// back to sending the raw file.
//
// Lazy-imported (see ResumePdfImport.tsx) so this never enters the SSR bundle
// or the main client chunk -- it's pulled in only when someone actually
// uploads a PDF.

const MAX_PAGES = 8; // resumes/LinkedIn exports are 1-4 pages; defensive cap
const MAX_TEXT_CHARS = 20000;

/**
 * Extracts plain text from a PDF in-browser. Returns "" if the file has no
 * meaningful embedded text (e.g. a scanned/image-only PDF) or extraction
 * fails for any reason -- callers should fall back to sending the raw file.
 */
export async function extractPdfText(file: File): Promise<string> {
  try {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).href;

    const buffer = await file.arrayBuffer();
    const doc = await pdfjsLib.getDocument({ data: buffer }).promise;

    try {
      const pageCount = Math.min(doc.numPages, MAX_PAGES);
      const pageTexts: string[] = [];

      for (let i = 1; i <= pageCount; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const text = content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ");
        pageTexts.push(text);
      }

      return pageTexts.join("\n\n").trim().slice(0, MAX_TEXT_CHARS);
    } finally {
      if (typeof (doc as any).destroy === "function") {
        await (doc as any).destroy();
      }
    }
  } catch {
    // Malformed PDF, worker load failure, unsupported encoding, etc. -- the
    // caller falls back to uploading the raw file, so swallow and return "".
    return "";
  }
}
