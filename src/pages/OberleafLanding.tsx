import React, { useState, useEffect } from "react";
import { Download, Check, Copy, Terminal, Zap, Shield, Clock, FileText, Cpu, Laptop, ChevronDown, AlertTriangle, FileArchive, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { ROUTE_META } from "@/lib/seo/route-meta";
import { PRIMARY_DOMAIN } from "@/lib/constants";
import {
  getAppDownloadStats,
  recordAppDownload,
  type AppDownloadStats,
} from "@/integrations/supabase/services/app-downloads";

const OberleafLanding: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<AppDownloadStats | null>(null);
  // Downloads to a file and runs it with -File rather than piping into `iex`.
  // `irm ... | iex` is the single most heavily flagged PowerShell pattern there
  // is, so Defender's AMSI scanner was killing the old one-liner outright; it
  // also pointed at friendlylearning.in, which does not serve this site and
  // answered every request with a 404 page.
  const oneLinerCommand =
    `curl.exe -fsSL ${PRIMARY_DOMAIN}/downloads/install.ps1 -o "$env:TEMP\\oberleaf.ps1"; ` +
    `powershell -ExecutionPolicy Bypass -File "$env:TEMP\\oberleaf.ps1"`;

  useEffect(() => {
    getAppDownloadStats("oberleaf").then((data) => {
      if (data) setStats(data);
    });
  }, []);

  const handleDownloadClick = (type: "setup_zip" | "setup_bat") => () => {
    // Record download telemetry
    recordAppDownload("oberleaf", type);
    setStats((prev) =>
      prev
        ? { ...prev, total_downloads: prev.total_downloads + 1 }
        : {
            app_name: "oberleaf",
            total_downloads: 1,
            downloads_7d: 1,
            downloads_30d: 1,
            by_type: { [type]: 1 },
          }
    );
    if (typeof window !== "undefined" && (window as any).posthog) {
      (window as any).posthog.capture("oberleaf_download_click", { type });
    }
  };

  const [copyFailed, setCopyFailed] = useState(false);

  // navigator.clipboard is undefined outside a secure context and rejects when
  // the document is not focused, so the old one-liner failed silently and left
  // the button claiming nothing had happened. Fall back to a selection-based
  // copy, and say so plainly if even that is refused.
  const handleCopy = async () => {
    const markCopied = () => {
      setCopied(true);
      setCopyFailed(false);
      recordAppDownload("oberleaf", "powershell_copy");
      setTimeout(() => setCopied(false), 2500);
    };

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(oneLinerCommand);
        markCopied();
        return;
      }
      throw new Error("Clipboard API unavailable");
    } catch {
      try {
        const scratch = document.createElement("textarea");
        scratch.value = oneLinerCommand;
        scratch.setAttribute("readonly", "");
        scratch.style.position = "fixed";
        scratch.style.opacity = "0";
        document.body.appendChild(scratch);
        scratch.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(scratch);
        if (!ok) throw new Error("execCommand copy refused");
        markCopied();
      } catch {
        setCopyFailed(true);
        setTimeout(() => setCopyFailed(false), 4000);
      }
    }
  };

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Oberleaf",
    "operatingSystem": "Windows 10, Windows 11",
    "applicationCategory": "DeveloperApplication",
    "description": "Fast, local-first LaTeX desktop studio for students, scholars, and professors at SRM University-AP. Zero cloud timeouts, offline privacy, and live equation preview.",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "INR",
    },
    "downloadUrl": `${PRIMARY_DOMAIN}/downloads/Oberleaf-Setup.zip`,
    "publisher": {
      "@type": "Organization",
      "name": "Friendly Learning SRMAP",
      "url": PRIMARY_DOMAIN,
    },
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <SEOHead
        title={ROUTE_META["/oberleaf"].title}
        description={ROUTE_META["/oberleaf"].description}
        keywords="Oberleaf, LaTeX editor, Overleaf alternative, SRM AP LaTeX, local LaTeX compiler, MiKTeX, TeX studio, offline LaTeX writing, research paper writing SRM University-AP"
        canonical={`${PRIMARY_DOMAIN}/oberleaf`}
        structuredData={softwareSchema}
      />

      {/* Clean Hero Landing (Clean initial viewport above the fold) */}
      <section className="min-h-[calc(100vh-4rem)] min-h-[calc(100dvh-4rem)] flex flex-col items-center justify-center text-center px-4 md:px-6 relative py-12">
        <div className="max-w-3xl mx-auto space-y-6 my-auto">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-xl border border-border bg-card p-2 shadow-card">
            <img
              src="/downloads/oberleaf-icon.svg"
              alt="Oberleaf Logo"
              className="w-16 h-16 object-contain"
              onError={(e) => {
                // Fallback if SVG hasn't cached yet
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>

          {/* The green "leaf" is the product's own wordmark, not a UI accent */}
          <h1 className="font-serif text-4xl font-semibold tracking-tight md:text-5xl">
            Ober<span className="italic text-emerald-600 dark:text-emerald-400">leaf</span>
          </h1>

          {/* The hero used to be a logo, the product name and a download button
              with nothing in between. A visitor arriving from search had to
              scroll past the fold before anything said what the download was. */}
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            A LaTeX editor that runs on your own laptop. Same workflow as Overleaf
            &mdash; live PDF preview, instant equation rendering, project history
            &mdash; with no compile queue, no 60-second timeout, and nothing leaving
            your machine.
          </p>

          <p className="text-sm text-muted-foreground">
            Free and open source. Setup installs Git, Node.js and MiKTeX for you if
            they are missing.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            {/*
              The .zip is the primary download on purpose. Chrome and Edge treat
              a bare .bat as a dangerous file type and block or hard-warn on it,
              and the extracted bundle ships install.ps1 alongside the launcher,
              so setup never has to fetch and run a remote script.
            */}
            <Button asChild size="lg" className="h-12 w-full px-6 text-base sm:w-auto">
              <a
                href="/downloads/Oberleaf-Setup.zip"
                download="Oberleaf-Setup.zip"
                onClick={handleDownloadClick("setup_zip")}
              >
                <FileArchive aria-hidden />
                Download for Windows (.zip)
              </a>
            </Button>

            <Button asChild variant="outline" size="lg" className="h-12 w-full px-6 text-base sm:w-auto">
              <a href="https://github.com/sahgyan9/Oberleaf" target="_blank" rel="noopener noreferrer">
                View on GitHub
              </a>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Prefer a single file?{" "}
            <a
              href="/downloads/Oberleaf-Setup.bat"
              download="Oberleaf-Setup.bat"
              onClick={handleDownloadClick("setup_bat")}
              className="underline underline-offset-4 hover:text-foreground transition-colors"
            >
              Download Oberleaf-Setup.bat
            </a>{" "}
            &mdash; your browser will warn you about the file type.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>Windows 10 and 11 &middot; Dependencies installed with <code className="rounded bg-muted px-1 py-0.5">winget</code></span>
            {stats && stats.total_downloads > 0 && (
              <>
                <span aria-hidden>&middot;</span>
                <span className="tabular inline-flex items-center gap-1 font-medium text-foreground">
                  <Download className="h-3.5 w-3.5" aria-hidden />
                  {stats.total_downloads} {stats.total_downloads === 1 ? "download" : "downloads"}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Subtle scroll cue to indicate guides and details below */}
        <a
          href="#setup-guide"
          aria-label="Scroll to setup guide"
          className="mt-auto flex cursor-pointer flex-col items-center gap-1 pt-6 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Setup guide
          <ChevronDown className="h-4 w-4" aria-hidden />
        </a>
      </section>

      {/* Guide & Content Sections (Accessible by scrolling down) */}
      <section id="setup-guide" className="pb-16 pt-8 scroll-mt-20">
        <div className="container px-4 md:px-6 max-w-5xl mx-auto space-y-16">
          {/* Quick 3-Step Setup Guide */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-card md:p-8">
            <h2 className="mb-8 font-serif text-2xl font-semibold">
              Install in three steps
            </h2>

            <ol className="grid gap-6 md:grid-cols-3">
              <li className="min-w-0 space-y-2 border-t-2 border-foreground pt-4">
                <span className="tabular text-sm font-medium text-muted-foreground">01</span>
                <h3 className="text-base font-semibold">Download and extract</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Grab <code className="rounded bg-muted px-1 py-0.5 text-foreground">Oberleaf-Setup.zip</code> above, then right-click it and choose <strong>Extract All</strong>. Keep both files in the same folder.
                </p>
              </li>

              <li className="min-w-0 space-y-2 border-t-2 border-foreground pt-4">
                <span className="tabular text-sm font-medium text-muted-foreground">02</span>
                <h3 className="text-base font-semibold">Run setup</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Double-click <code className="rounded bg-muted px-1 py-0.5 text-foreground">Oberleaf-Setup.bat</code>. The interactive wizard lets you customize your installation folder and shortcut preferences, and displays live progress as components configure.
                </p>
              </li>

              <li className="min-w-0 space-y-2 border-t-2 border-foreground pt-4">
                <span className="tabular text-sm font-medium text-muted-foreground">03</span>
                <h3 className="text-base font-semibold">Write and compile</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Oberleaf opens ready to write. Projects are kept safe in <code className="rounded bg-muted px-1 py-0.5 text-foreground">Documents\Oberleaf Projects</code> with 1-click Explorer reveal, live daemon status, and clean uninstallation in Windows Settings.
                </p>
              </li>
            </ol>
          </div>

          {/* Already installed? The app self-updates from GitHub, but nothing on
              this page said so, and students who installed weeks ago had no way
              to know newer fixes existed or how to pull them in. */}
          <div id="updating" className="scroll-mt-20 space-y-5 rounded-xl border border-border bg-card p-6 md:p-8">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 flex-shrink-0 text-muted-foreground" aria-hidden />
              <h2 className="font-serif text-xl font-semibold">Already installed? Updates are automatic</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Oberleaf checks GitHub for a newer version a couple of seconds after it
              starts and offers the update in a dialog. Accepting it stashes anything
              you changed locally, pulls the latest code and reinstalls dependencies.
              Your work lives in{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-foreground">Documents\Oberleaf Projects</code>{" "}
              and is never touched by an update. Re-downloading the installer is only
              necessary if the app will not start at all.
            </p>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Recently shipped</h3>
              <ul className="space-y-2.5 text-sm leading-relaxed text-muted-foreground">
                <li className="flex gap-2">
                  <span className="flex-shrink-0 text-muted-foreground" aria-hidden>&bull;</span>
                  <span>
                    <strong className="text-foreground">Errors that point at the right line.</strong>{" "}
                    TeX reports a fault where it finally gave up, not where you made the
                    mistake. Oberleaf now reads your source alongside the log, explains
                    the error in plain English, and offers a one-click fix for the common
                    ones &mdash; a missing <code>\usepackage</code>, a matrix used outside
                    math mode, a stray delimiter.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 text-muted-foreground" aria-hidden>&bull;</span>
                  <span>
                    <strong className="text-foreground">Font maps checked on first run.</strong>{" "}
                    A fresh MiKTeX install can leave pdfTeX's font table unbuilt, which
                    kills any document using <code>microtype</code> with a message that
                    explains nothing. The dependency doctor now compiles a probe document
                    to detect it and prints the exact command that fixes it.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 text-muted-foreground" aria-hidden>&bull;</span>
                  <span>
                    <strong className="text-foreground">No more phantom errors.</strong>{" "}
                    A previous run's log could survive into the next compile, so a mistake
                    you had already fixed kept being reported. Every build now starts from
                    a clean log.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 text-muted-foreground" aria-hidden>&bull;</span>
                  <span>
                    <strong className="text-foreground">Safer sharing and safer saves.</strong>{" "}
                    Invite links now carry a per-session token, so a shared workspace is
                    reachable only by the people you sent the link to. Switching files or
                    closing the window also flushes any unsaved edit to disk first,
                    instead of dropping it.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Feature Highlights Grid */}
          <div className="space-y-8">
            <div className="space-y-2">
              <h2 className="font-serif text-2xl font-semibold md:text-3xl">
                Why use Oberleaf
              </h2>
              <p className="text-muted-foreground">
                No cloud compile quotas and no remote queue.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-3 rounded-xl border border-border bg-card p-6">
                <Clock className="h-5 w-5 text-muted-foreground" aria-hidden />
                <h3 className="text-base font-semibold">No compile timeouts</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Cloud Overleaf cuts you off after 60 seconds on free accounts. Oberleaf runs locally on your CPU with zero timeout limits.
                </p>
              </div>

              <div className="space-y-3 rounded-xl border border-border bg-card p-6">
                <Zap className="h-5 w-5 text-muted-foreground" aria-hidden />
                <h3 className="text-base font-semibold">Instant equation preview</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  A KaTeX preview renders each equation beneath your cursor as you type.
                </p>
              </div>

              <div className="space-y-3 rounded-xl border border-border bg-card p-6">
                <Shield className="h-5 w-5 text-muted-foreground" aria-hidden />
                <h3 className="text-base font-semibold">Offline and private</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Your research papers, patents, and sensitive data stay on your laptop. Write on flights, trains, or during hostel Wi-Fi downtime.
                </p>
              </div>

              <div className="space-y-3 rounded-xl border border-border bg-card p-6">
                <Cpu className="h-5 w-5 text-muted-foreground" aria-hidden />
                <h3 className="text-base font-semibold">Sub-second compilation</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Compiles standard 1–2 page papers in under 1 second using your machine's multi-core CPU and native SSD cache.
                </p>
              </div>

              <div className="space-y-3 rounded-xl border border-border bg-card p-6">
                <Laptop className="h-5 w-5 text-muted-foreground" aria-hidden />
                <h3 className="text-base font-semibold">Desktop and Explorer integration</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  1-click desktop and start menu shortcuts, live bottom status bar with daemon/compiler telemetry, and instant reveal in Windows File Explorer.
                </p>
              </div>

              <div className="space-y-3 rounded-xl border border-border bg-card p-6">
                <FileText className="h-5 w-5 text-muted-foreground" aria-hidden />
                <h3 className="text-base font-semibold">Overleaf compatibility</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Import and export your Overleaf .zip projects. Includes IEEE conference and thesis templates out of the box.
                </p>
              </div>
            </div>
          </div>

          {/* Troubleshooting — Windows blocks unsigned installers by default,
              and students hit this before they ever reach the app. */}
          <div id="troubleshooting" className="scroll-mt-20 space-y-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 md:p-8">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
              <h2 className="font-serif text-xl font-semibold">Blocked by Windows or your antivirus?</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Oberleaf is free and open source, so it is not code-signed &mdash; a signing
              certificate costs more per year than this project has ever spent. Windows
              treats every unsigned installer with suspicion, which produces the warnings
              below. All of them are safe to dismiss, and you can read every line of the
              installer{" "}
              <a
                href="https://github.com/sahgyan9/Oberleaf/blob/main/scripts/install.ps1"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 hover:text-foreground"
              >
                on GitHub
              </a>{" "}
              before running it.
            </p>

            <div className="space-y-4">
              <div className="space-y-1.5 rounded-lg border border-border bg-background p-4">
                <h3 className="text-sm font-semibold">"Windows protected your PC" (blue box)</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Click <strong>More info</strong>, then <strong>Run anyway</strong>. This is
                  SmartScreen reacting to a new file, not a virus detection.
                </p>
              </div>

              <div className="space-y-1.5 rounded-lg border border-border bg-background p-4">
                <h3 className="text-sm font-semibold">The browser refuses to save the .bat file</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Chrome and Edge block <code>.bat</code> downloads by default. Use the{" "}
                  <strong>.zip</strong> button above instead &mdash; it contains the same two
                  files and downloads without complaint.
                </p>
              </div>

              <div className="space-y-1.5 rounded-lg border border-border bg-background p-4">
                <h3 className="text-sm font-semibold">Antivirus quarantined the file</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Some scanners flag any script that installs software. In Windows Security
                  open <strong>Protection history</strong>, find the Oberleaf entry and choose{" "}
                  <strong>Allow on device</strong>, then run setup again. If your college
                  laptop is managed by IT and you cannot override it, clone the repository
                  from GitHub and run <code>npm install</code> instead.
                </p>
              </div>

              <div className="space-y-1.5 rounded-lg border border-border bg-background p-4">
                <h3 className="text-sm font-semibold">The window closed instantly</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Fixed &mdash; the setup window now stays open until you close it and prints
                  the reason for any failure. If you are still seeing this, you are running an
                  old copy: download it again from the button above. Every run also writes a
                  log to <code>%TEMP%\oberleaf-setup.log</code>; send that file when reporting
                  a problem.
                </p>
              </div>

              <div className="space-y-1.5 rounded-lg border border-border bg-background p-4">
                <h3 className="text-sm font-semibold">Installs fail with a permissions error</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Right-click <code>Oberleaf-Setup.bat</code> and choose{" "}
                  <strong>Run as administrator</strong>. Without it, Git, Node.js and MiKTeX
                  are installed for your user account only, which some managed machines
                  disallow.
                </p>
              </div>
            </div>
          </div>

          {/* Alternative: PowerShell Command for Advanced Users */}
          <div className="space-y-3 rounded-xl border border-border bg-card p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Terminal className="h-4 w-4 text-muted-foreground" aria-hidden />
              Or install from PowerShell
            </h2>
            <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-stone-900 p-3 font-mono text-xs text-stone-100">
              {/* `truncate` here beat the container's horizontal scroll, so the
                  command was permanently cut off and unreadable. */}
              <span className="min-w-0 overflow-x-auto whitespace-nowrap py-1">{oneLinerCommand}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-8 flex-shrink-0 px-2 font-sans text-xs text-stone-300 hover:bg-stone-800 hover:text-white"
                aria-live="polite"
              >
                {copied ? <Check className="text-green-400" aria-hidden /> : <Copy aria-hidden />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            {copyFailed && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Your browser blocked the clipboard. Select the command above and copy
                it with Ctrl+C.
              </p>
            )}
          </div>

        </div>
      </section>
      <Footer />
    </div>
  );
};

export default OberleafLanding;
