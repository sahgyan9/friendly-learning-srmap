import React, { useState, useEffect } from "react";
import { Download, Check, Copy, Terminal, Zap, Shield, Clock, FileText, Cpu, Laptop, ChevronDown } from "lucide-react";
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
  const oneLinerCommand = `irm https://friendlylearning.in/downloads/install.ps1 | iex`;

  useEffect(() => {
    getAppDownloadStats("oberleaf").then((data) => {
      if (data) setStats(data);
    });
  }, []);

  const handleDownloadClick = () => {
    // Record download telemetry
    recordAppDownload("oberleaf", "setup_bat");
    setStats((prev) =>
      prev
        ? { ...prev, total_downloads: prev.total_downloads + 1 }
        : {
            app_name: "oberleaf",
            total_downloads: 1,
            downloads_7d: 1,
            downloads_30d: 1,
            by_type: { setup_bat: 1 },
          }
    );
    if (typeof window !== "undefined" && (window as any).posthog) {
      (window as any).posthog.capture("oberleaf_download_click", { type: "setup_bat" });
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
    "downloadUrl": `${PRIMARY_DOMAIN}/downloads/Oberleaf-Setup.bat`,
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
            <a
              href="/downloads/Oberleaf-Setup.bat"
              download="Oberleaf-Setup.bat"
              onClick={handleDownloadClick}
              className="w-full sm:w-auto"
            >
              <Button size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-6 text-base rounded-xl shadow-lg hover:shadow-emerald-600/25 transition flex items-center justify-center space-x-2">
                <Download className="w-5 h-5 mr-2" />
                <span>Download for Windows (.bat)</span>
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
                <h3 className="font-semibold text-base">Click Download</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Download <code className="text-emerald-600 dark:text-emerald-400">Oberleaf-Setup.bat</code> directly using the button above.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-border bg-background/50 space-y-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg">
                  2
                </div>
                <h3 className="font-semibold text-base">Run the Setup</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Double-click the downloaded file. It automatically checks and installs Git, Node.js, and MiKTeX for you silently.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-border bg-background/50 space-y-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg">
                  3
                </div>
                <h3 className="font-semibold text-base">Write & Compile</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  An <strong>Oberleaf</strong> shortcut is placed on your Desktop and Start Menu. Oberleaf opens ready to compile!
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
                <h3 className="font-semibold text-base">Desktop & Start Menu Icon</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Search "Oberleaf" in Windows Search or click the desktop shortcut to launch anytime with 1 click.
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

          {/* Alternative: PowerShell Command for Advanced Users */}
          <div className="border border-border rounded-xl p-6 bg-muted/40 space-y-3">
            <div className="flex items-center space-x-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Terminal className="w-4 h-4" />
              <span>Alternative: Run in PowerShell (1 Line)</span>
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
