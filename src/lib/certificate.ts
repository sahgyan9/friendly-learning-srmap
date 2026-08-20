import { subMonths } from "date-fns";

/**
 * Shared rules for the mentor certificate.
 *
 * The threshold lives here and in issue_certificate_if_earned() in the
 * 20260730190000 migration. Both must move together, or the page will promise a
 * certificate the database refuses to issue.
 */
export const MIN_STUDENTS_FOR_CERTIFICATE = 3;

export interface CertificateData {
  name: string;
  department?: string | null;
  university?: string | null;
  studentsHelped: number;
  badges: number;
  mentorSince?: string | null;
  certificateNumber: string;
  issuedAt?: string | null;
  verifyUrl: string;
  /** Draws a watermark and swaps the wording. Never set for an earned certificate. */
  sample?: boolean;
}

export function formatCertificateDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export function formatMonthYear(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

/** The certificate is a fixed-size document, so long names have to be scaled, not wrapped. */
export function nameFontSize(name: string): number {
  if (name.length <= 18) return 78;
  if (name.length <= 26) return 62;
  if (name.length <= 34) return 50;
  return 40;
}

export function certificateVerifyUrl(certificateId: string): string {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://friendly-learning-srmap.vercel.app";
  return `${origin}/verify/${certificateId}`;
}

/**
 * Illustrative figures for the preview shown on the application form. Kept
 * deliberately modest -- a sample claiming 200 students would read as a
 * marketing image rather than something reachable in one semester.
 */
export function sampleCertificate(name: string): CertificateData {
  const since = subMonths(new Date(), 7);

  return {
    name: name?.trim() || "Your name",
    department: "Computer Science and Engineering",
    university: "SRM University AP",
    studentsHelped: 12,
    badges: 2,
    mentorSince: since.toISOString(),
    certificateNumber: "FL-2026-0000",
    issuedAt: new Date().toISOString(),
    verifyUrl: "friendlylearning/verify/…",
    sample: true,
  };
}

/**
 * Rasterises the certificate SVG to a PNG and downloads it.
 *
 * Done by hand rather than with a library: the certificate is already a single
 * self-contained SVG with no external images, so this is a serialise, draw and
 * export -- not worth another dependency on a repo that already has plenty.
 *
 * Fonts are the one catch. An SVG drawn into a canvas is rendered in an
 * isolated context that cannot see the page's webfonts, so the artwork asks
 * only for system families (Georgia, Helvetica) and looks the same either way.
 */
export async function downloadCertificatePng(
  svg: SVGSVGElement,
  fileName: string,
  scale = 2,
): Promise<void> {
  const source = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not render the certificate"));
      img.src = url;
    });

    const viewBox = svg.viewBox.baseVal;
    const width = (viewBox?.width || svg.clientWidth || 1600) * scale;
    const height = (viewBox?.height || svg.clientHeight || 1131) * scale;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not render the certificate");

    // The artwork assumes an opaque page; without this the PNG has a
    // transparent background and looks broken on any dark surface.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = fileName;
    link.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}
