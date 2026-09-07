import React, { useState, useEffect } from "react";
import { Download, Check, Copy, Terminal, Zap, Shield, Clock, FileText, Cpu, Laptop, ChevronDown, AlertTriangle, FileArchive } from "lucide-react";
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

  const handleCopy = () => {
    navigator.clipboard.writeText(oneLinerCommand);
    setCopied(true);
    recordAppDownload("oberleaf", "powershell_copy");
    setTimeout(() => setCopied(false), 2500);
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
          <div className="w-20 h-20 mx-auto rounded-2xl p-2 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-md flex items-center justify-center">
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

          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight font-serif">
            Ober<span className="text-emerald-600 dark:text-emerald-400 italic">leaf</span>
          </h1>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            {/*
              The .zip is the primary download on purpose. Chrome and Edge treat
              a bare .bat as a dangerous file type and block or hard-warn on it,
              and the extracted bundle ships install.ps1 alongside the launcher,
              so setup never has to fetch and run a remote script.
            */}
            <a
              href="/downloads/Oberleaf-Setup.zip"
              download="Oberleaf-Setup.zip"
              onClick={handleDownloadClick("setup_zip")}
              className="w-full sm:w-auto"
            >
              <Button size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-6 text-base rounded-xl shadow-lg hover:shadow-emerald-600/25 transition flex items-center justify-center space-x-2">
                <FileArchive className="w-5 h-5 mr-2" />
                <span>Download for Windows (.zip)</span>
              </Button>
            </a>

            <a
              href="https://github.com/sahgyan9/Oberleaf"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto"
            >
              <Button variant="outline" size="lg" className="w-full py-6 text-base rounded-xl">
                View on GitHub
              </Button>
            </a>
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
            <span>Supports Windows 10 & 11 • Automatic package resolution via <code className="bg-muted px-1 py-0.5 rounded">winget</code></span>
            {stats && stats.total_downloads > 0 && (
              <>
                <span>•</span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                  <Download className="w-3.5 h-3.5" />
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
          className="mt-auto pt-6 flex flex-col items-center gap-1 text-xs text-muted-foreground/60 hover:text-foreground transition-colors cursor-pointer"
        >
          <ChevronDown className="w-4 h-4 animate-bounce" />
        </a>
      </section>

      {/* Guide & Content Sections (Accessible by scrolling down) */}
      <section id="setup-guide" className="pb-16 pt-8 scroll-mt-20">
        <div className="container px-4 md:px-6 max-w-5xl mx-auto space-y-16">
          {/* Quick 3-Step Setup Guide */}
          <div className="border border-border/80 rounded-2xl p-6 md:p-8 bg-card/60 backdrop-blur-xs shadow-sm">
            <h2 className="text-2xl font-bold text-center mb-8 font-serif">
              Simple 1-Click Installation
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-5 rounded-xl border border-border bg-background/50 space-y-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg">
                  1
                </div>
                <h3 className="font-semibold text-base">Download & Extract</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Grab <code className="text-emerald-600 dark:text-emerald-400">Oberleaf-Setup.zip</code> above, then right-click it and choose <strong>Extract All</strong>. Keep both files in the same folder.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-border bg-background/50 space-y-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg">
                  2
                </div>
                <h3 className="font-semibold text-base">Run the Setup</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Double-click <code className="text-emerald-600 dark:text-emerald-400">Oberleaf-Setup.bat</code>. The interactive wizard lets you customize your installation folder and shortcut preferences, and displays live progress as components configure.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-border bg-background/50 space-y-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg">
                  3
                </div>
                <h3 className="font-semibold text-base">Write & Compile</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Oberleaf opens ready to write. Projects are kept safe in <code className="text-emerald-600 dark:text-emerald-400">Documents\Oberleaf Projects</code> with 1-click Explorer reveal, live daemon status, and clean uninstallation in Windows Settings.
                </p>
              </div>
            </div>
          </div>

          {/* Feature Highlights Grid */}
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl md:text-3xl font-bold font-serif">
                Why SRM AP Scholars Choose Oberleaf
              </h2>
              <p className="text-sm text-muted-foreground">
                Eliminate the frustrations of cloud compile quotas and slow remote queues.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-6 rounded-xl border border-border bg-card space-y-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-base">No Compute Timeouts</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Cloud Overleaf cuts you off after 60 seconds on free accounts. Oberleaf runs locally on your CPU with zero timeout limits.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-border bg-card space-y-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-base">Instant Equation Preview</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  KaTeX live math tooltip renders math equations immediately beneath your cursor with 0ms latency as you type.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-border bg-card space-y-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-base">100% Offline & Private</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your research papers, patents, and sensitive data stay on your laptop. Write on flights, trains, or during hostel Wi-Fi downtime.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-border bg-card space-y-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Cpu className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-base">Sub-Second Compilation</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Compiles standard 1–2 page papers in under 1 second using your machine's multi-core CPU and native SSD cache.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-border bg-card space-y-3">
                <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <Laptop className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-base">Desktop & Explorer Integration</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  1-click desktop and start menu shortcuts, live bottom status bar with daemon/compiler telemetry, and instant reveal in Windows File Explorer.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-border bg-card space-y-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-base">Overleaf Compatibility</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Import and export your Overleaf `.zip` projects seamlessly. Includes IEEE conference and thesis templates out of the box.
                </p>
              </div>
            </div>
          </div>

          {/* Troubleshooting — Windows blocks unsigned installers by default,
              and students hit this before they ever reach the app. */}
          <div id="troubleshooting" className="border border-amber-500/30 rounded-2xl p-6 md:p-8 bg-amber-500/5 space-y-6 scroll-mt-20">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <h2 className="text-xl font-bold font-serif">Blocked by Windows or your antivirus?</h2>
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
              <div className="p-4 rounded-xl border border-border bg-background/60 space-y-1.5">
                <h3 className="font-semibold text-sm">"Windows protected your PC" (blue box)</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Click <strong>More info</strong>, then <strong>Run anyway</strong>. This is
                  SmartScreen reacting to a new file, not a virus detection.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-background/60 space-y-1.5">
                <h3 className="font-semibold text-sm">The browser refuses to save the .bat file</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Chrome and Edge block <code>.bat</code> downloads by default. Use the{" "}
                  <strong>.zip</strong> button above instead &mdash; it contains the same two
                  files and downloads without complaint.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-background/60 space-y-1.5">
                <h3 className="font-semibold text-sm">Antivirus quarantined the file</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Some scanners flag any script that installs software. In Windows Security
                  open <strong>Protection history</strong>, find the Oberleaf entry and choose{" "}
                  <strong>Allow on device</strong>, then run setup again. If your college
                  laptop is managed by IT and you cannot override it, clone the repository
                  from GitHub and run <code>npm install</code> instead.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-background/60 space-y-1.5">
                <h3 className="font-semibold text-sm">The window closed instantly</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Fixed &mdash; the setup window now stays open until you close it and prints
                  the reason for any failure. If you are still seeing this, you are running an
                  old copy: download it again from the button above. Every run also writes a
                  log to <code>%TEMP%\oberleaf-setup.log</code>; send that file when reporting
                  a problem.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-background/60 space-y-1.5">
                <h3 className="font-semibold text-sm">Installs fail with a permissions error</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Right-click <code>Oberleaf-Setup.bat</code> and choose{" "}
                  <strong>Run as administrator</strong>. Without it, Git, Node.js and MiKTeX
                  are installed for your user account only, which some managed machines
                  disallow.
                </p>
              </div>
            </div>
          </div>

          {/* Alternative: PowerShell Command for Advanced Users */}
          <div className="border border-border rounded-xl p-6 bg-muted/40 space-y-3">
            <div className="flex items-center space-x-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Terminal className="w-4 h-4" />
              <span>Alternative: Run in PowerShell</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-stone-900 text-stone-100 font-mono text-xs overflow-x-auto">
              <span className="truncate pr-4">{oneLinerCommand}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="text-stone-300 hover:text-white hover:bg-stone-800 flex-shrink-0 h-8 px-2"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span className="ml-1.5 text-[11px]">{copied ? 'Copied' : 'Copy'}</span>
              </Button>
            </div>
          </div>

        </div>
      </section>
      <Footer />
    </div>
  );
};

export default OberleafLanding;
