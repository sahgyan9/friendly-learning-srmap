// Client-side text extraction for resume/LinkedIn PDF and DOCX import.
//
// Gemini's document-vision ingestion (sending the raw PDF as inlineData) has
// to OCR/parse the whole file on every request -- slow, and it means shipping
// a base64-inflated multi-MB payload over the wire twice (browser -> edge
// function -> Gemini). Most resumes are plain text underneath, so pulling the
// text out here first lets the common case skip both the big upload and the
// document-vision path entirely.
//
// For Word (.docx) files, extracting the text client-side via mammoth allows
// Gemini to parse Word resumes instantly as structured text without format friction.
//
// Lazy-imported so this never enters the SSR bundle or main client chunk.

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

/**
 * Extracts plain text from a Word (.docx) document in-browser using mammoth.
 */
export async function extractDocxText(file: File): Promise<string> {
  try {
    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return (result.value || "").trim().slice(0, MAX_TEXT_CHARS);
  } catch (err) {
    console.error("DOCX extraction error:", err);
    return "";
  }
}

/**
 * Extracts plain text from either a PDF or Word (.docx) document.
 */
export async function extractDocumentText(file: File): Promise<{ text: string; fileType: "pdf" | "docx" | "other" }> {
  const lowerName = file.name.toLowerCase();
  const isDocx =
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lowerName.endsWith(".docx");

  if (isDocx) {
    const text = await extractDocxText(file);
    return { text, fileType: "docx" };
  }

  const isPdf = file.type === "application/pdf" || lowerName.endsWith(".pdf");
  if (isPdf) {
    const text = await extractPdfText(file);
    return { text, fileType: "pdf" };
  }

  return { text: "", fileType: "other" };
}
