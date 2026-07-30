import { forwardRef } from "react";
import { LOGO_DATA_URL } from "@/assets/logoBase64";
import {
  CertificateData,
  formatCertificateDate,
  formatMonthYear,
  nameFontSize,
} from "@/lib/certificate";

interface MentorCertificateProps {
  data: CertificateData;
  className?: string;
}

/**
 * The certificate, drawn as one self-contained SVG.
 *
 * SVG rather than styled HTML for two reasons: a certificate is a fixed-ratio
 * document rather than a responsive layout, and having it as a single node makes
 * the PNG export a serialise-and-draw instead of a screenshot library.
 *
 * It is intentionally light in both themes. This is a document people download,
 * print and attach to applications -- inverting it in dark mode would produce a
 * black rectangle in someone's PDF.
 *
 * It says "Friendly Learning" throughout and never imitates a university
 * document. The platform is student-run and the certificate should look like
 * exactly that: honest about who issued it, and specific about what was done.
 */
const MentorCertificate = forwardRef<SVGSVGElement, MentorCertificateProps>(
  ({ data, className }, ref) => {
    const {
      name,
      department,
      university,
      studentsHelped,
      badges,
      mentorSince,
      certificateNumber,
      issuedAt,
      verifyUrl,
      sample = false,
    } = data;

    const serif = "Georgia, 'Times New Roman', serif";
    const sans = "Helvetica, Arial, sans-serif";

    const stats: Array<{ value: string; label: string }> = [
      {
        value: String(studentsHelped),
        label: studentsHelped === 1 ? "student helped" : "students helped",
      },
      { value: String(badges), label: badges === 1 ? "badge earned" : "badges earned" },
      { value: formatMonthYear(mentorSince), label: "mentor since" },
    ];

    // Scalloped seal lobes (16 outer circles forming the gold seal crest)
    const sealCenter = { x: 190, y: 240 };
    const sealRadius = 64;
    const scallopCount = 16;
    const scallops = Array.from({ length: scallopCount }, (_, i) => {
      const angle = (i * 360) / scallopCount * (Math.PI / 180);
      return {
        cx: sealCenter.x + sealRadius * Math.cos(angle),
        cy: sealCenter.y + sealRadius * Math.sin(angle),
      };
    });

    return (
      <svg
        ref={ref}
        viewBox="0 0 1600 1131"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={`Certificate of mentorship for ${name}, ${studentsHelped} students helped`}
        className={className}
        style={{ width: "100%", height: "auto", display: "block" }}
      >
        <defs>
          {/* Blue gradient */}
          <linearGradient id="fl-cert-blue" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1e40af" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>

          {/* Elegant gold gradient */}
          <linearGradient id="fl-cert-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="25%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#b45309" />
            <stop offset="75%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fef08a" />
          </linearGradient>

          {/* Dark Navy Column Background */}
          <linearGradient id="fl-ribbon-navy" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#111827" />
            <stop offset="50%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Inner Lighter Royal Blue Ribbon */}
          <linearGradient id="fl-ribbon-inner" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>

          {/* Shadow for ribbon and seal */}
          <filter id="cert-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="3" dy="5" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Outer White Sheet */}
        <rect width="1600" height="1131" fill="#ffffff" />

        {/* Double Gold & Navy Border Frame */}
        <rect x="40" y="40" width="1520" height="1051" fill="#ffffff" stroke="url(#fl-cert-gold)" strokeWidth="6" rx="6" />
        <rect x="52" y="52" width="1496" height="1027" fill="none" stroke="#1e293b" strokeWidth="2" rx="4" />
        <rect x="60" y="60" width="1480" height="1011" fill="none" stroke="url(#fl-cert-gold)" strokeWidth="1.5" rx="3" />

        {/* Corner Accents */}
        <g stroke="url(#fl-cert-gold)" strokeWidth="2" fill="none">
          <path d="M 68 84 L 84 84 L 84 68" />
          <path d="M 1532 84 L 1516 84 L 1516 68" />
          <path d="M 68 1047 L 84 1047 L 84 1063" />
          <path d="M 1532 1047 L 1516 1047 L 1516 1063" />
        </g>

        {/* Left Vertical Ribbon Bar (Matching Reference Image) */}
        <g id="cert-ribbon-bar" filter="url(#cert-shadow)">
          {/* Base Dark Navy Column */}
          <rect x="116" y="40" width="148" height="1051" fill="url(#fl-ribbon-navy)" />

          {/* Outer Double Gold Border Lines on Navy Column */}
          <line x1="120" y1="40" x2="120" y2="1091" stroke="url(#fl-cert-gold)" strokeWidth="1.5" />
          <line x1="124" y1="40" x2="124" y2="1091" stroke="url(#fl-cert-gold)" strokeWidth="1" />

          <line x1="260" y1="40" x2="260" y2="1091" stroke="url(#fl-cert-gold)" strokeWidth="1.5" />
          <line x1="256" y1="40" x2="256" y2="1091" stroke="url(#fl-cert-gold)" strokeWidth="1" />

          {/* Inner Lighter Royal Blue Ribbon Band with V-Notch End */}
          <path
            d="M 136 40 L 244 40 L 244 470 L 190 425 L 136 470 Z"
            fill="url(#fl-ribbon-inner)"
          />

          {/* Inner Ribbon Band Gold Borders */}
          <line x1="138" y1="40" x2="138" y2="467" stroke="url(#fl-cert-gold)" strokeWidth="1.5" />
          <line x1="242" y1="40" x2="242" y2="467" stroke="url(#fl-cert-gold)" strokeWidth="1.5" />
          <path d="M 138 467 L 190 423 L 242 467" fill="none" stroke="url(#fl-cert-gold)" strokeWidth="1.5" />
        </g>

        {/* Golden Medallion Seal (Pinned on Ribbon Bar) */}
        <g id="cert-gold-medal" filter="url(#cert-shadow)">
          {/* Scalloped Gold Outer Crest */}
          <g fill="url(#fl-cert-gold)">
            {scallops.map((scallop, index) => (
              <circle key={index} cx={scallop.cx} cy={scallop.cy} r="10" />
            ))}
            <circle cx="190" cy="240" r="64" />
          </g>

          <circle cx="190" cy="240" r="56" fill="#0f172a" stroke="url(#fl-cert-gold)" strokeWidth="2.5" />
          <circle cx="190" cy="240" r="50" fill="none" stroke="url(#fl-cert-gold)" strokeWidth="1" strokeDasharray="3 2" />

          {/* Laurel Wreath Leaves */}
          <g fill="url(#fl-cert-gold)">
            {/* Left Laurel Arc */}
            <path d="M 152 235 C 150 220 158 208 168 200 C 164 206 162 216 166 226 C 160 228 154 232 152 235 Z" />
            <path d="M 148 245 C 148 235 154 225 162 218 C 158 224 158 234 164 242 Z" />
            <path d="M 152 258 C 150 248 156 238 166 232 C 162 238 164 248 170 254 Z" />
            <path d="M 160 270 C 156 262 162 252 172 246 C 168 252 172 262 178 266 Z" />

            {/* Right Laurel Arc */}
            <path d="M 228 235 C 230 220 222 208 212 200 C 216 206 218 216 214 226 C 220 228 226 232 228 235 Z" />
            <path d="M 232 245 C 232 235 226 225 218 218 C 222 224 222 234 216 242 Z" />
            <path d="M 228 258 C 230 248 224 238 214 232 C 218 238 216 248 210 254 Z" />
            <path d="M 220 270 C 224 262 218 252 208 246 C 212 252 208 262 202 266 Z" />

            {/* Gold Star at Bottom of Laurel Wreath */}
            <polygon points="190,283 192.5,289 199,289 193.5,293 195.5,299 190,295 184.5,299 186.5,293 181,289 187.5,289" />
          </g>

          {/* Golden Shield in Center */}
          <path
            d="M 190 216 C 204 216 212 220 212 229 C 212 247 190 264 190 270 C 190 264 168 247 168 229 C 168 220 176 216 190 216 Z"
            fill="url(#fl-cert-gold)"
          />

          {/* Dark Navy Checkmark Inside Shield */}
          <path
            d="M 181 243 L 187 250 L 199 237"
            fill="none"
            stroke="#0f172a"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Header & Content - Perfectly centered in content region (x=260 to x=1540, center X = 900) */}
        <g id="cert-main-content">
          {/* Brand Header (Centered together: logo icon + text) */}
          <g>
            <image
              href={LOGO_DATA_URL}
              xlinkHref={LOGO_DATA_URL}
              x="698"
              y="94"
              width="54"
              height="54"
              preserveAspectRatio="xMidYMid meet"
            />
            <text x="760" y="134" fontFamily={sans} fontSize="34" fontWeight="bold">
              <tspan fill="#1e40af">Friendly</tspan>
              <tspan fill="#0f172a">Learning</tspan>
              <tspan fill="#1e40af" fontSize="22" dx="8">SRMAP</tspan>
            </text>
          </g>
          <text x="900" y="172" textAnchor="middle" fontFamily={sans} fontSize="18" fill="#64748b">
            Student-run mentorship platform · SRM University AP
          </text>

          {/* Title */}
          <text x="900" y="270" textAnchor="middle" fontFamily={serif} fontSize="58" fontWeight="bold" fill="#0f172a" letterSpacing="1">
            Certificate of Mentorship
          </text>
          <rect x="760" y="298" width="280" height="3" rx="1.5" fill="url(#fl-cert-gold)" />

          <text x="900" y="375" textAnchor="middle" fontFamily={sans} fontSize="22" fill="#64748b">
            This is to certify that
          </text>

          {/* Recipient Name */}
          <text
            x="900"
            y="475"
            textAnchor="middle"
            fontFamily={serif}
            fontSize={nameFontSize(name)}
            fontWeight="bold"
            fill="#0f172a"
          >
            {name}
          </text>

          <text x="900" y="525" textAnchor="middle" fontFamily={sans} fontSize="21" fill="#475569">
            {[department, university].filter(Boolean).join(" · ")}
          </text>

          <text x="900" y="605" textAnchor="middle" fontFamily={sans} fontSize="22" fill="#334155">
            has given their time as a mentor on Friendly Learning, answering questions
          </text>
          <text x="900" y="640" textAnchor="middle" fontFamily={sans} fontSize="22" fill="#334155">
            from students who are a year or two behind them.
          </text>

          {/* 3 Stat Boxes (Centered at X=510, X=900, X=1290) */}
          {stats.map((stat, index) => {
            const x = 510 + index * 390;
            return (
              <g key={stat.label}>
                <rect x={x - 160} y="695" width="320" height="140" rx="12" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
                <rect x={x - 160} y="695" width="320" height="6" rx="3" fill="url(#fl-cert-gold)" />
                <text x={x} y="761" textAnchor="middle" fontFamily={serif} fontSize="44" fontWeight="bold" fill="#1e40af">
                  {stat.value}
                </text>
                <text x={x} y="803" textAnchor="middle" fontFamily={sans} fontSize="18" fill="#64748b">
                  {stat.label}
                </text>
              </g>
            );
          })}

          {/* Footer Info */}
          <line x1="330" y1="875" x2="1470" y2="875" stroke="#cbd5e1" strokeWidth="1.5" />

          <text x="330" y="912" fontFamily={sans} fontSize="17" fill="#94a3b8">
            Certificate number
          </text>
          <text x="330" y="938" fontFamily={sans} fontSize="20" fontWeight="bold" fill="#334155">
            {certificateNumber}
          </text>

          <text x="1470" y="912" textAnchor="end" fontFamily={sans} fontSize="17" fill="#94a3b8">
            Issued
          </text>
          <text x="1470" y="938" textAnchor="end" fontFamily={sans} fontSize="20" fontWeight="bold" fill="#334155">
            {formatCertificateDate(issuedAt)}
          </text>

          <text x="900" y="990" textAnchor="middle" fontFamily={sans} fontSize="17" fill="#94a3b8">
            <tspan>Anyone can check this certificate at </tspan>
            <tspan fontWeight="bold" fill="#1e40af">{verifyUrl}</tspan>
          </text>
        </g>

        {sample && (
          <g aria-hidden="true">
            <text
              x="900"
              y="760"
              textAnchor="middle"
              fontFamily={sans}
              fontSize="190"
              fontWeight="bold"
              fill="#0f172a"
              opacity="0.07"
              transform="rotate(-16 900 740)"
              letterSpacing="14"
            >
              SAMPLE
            </text>
          </g>
        )}
      </svg>
    );
  },
);

MentorCertificate.displayName = "MentorCertificate";

export default MentorCertificate;
