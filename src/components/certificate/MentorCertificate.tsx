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

          {/* Shadow for ribbon and badge -- kept light on purpose, flat shapes
              only need enough shadow to lift off the page, not a 3D bevel. */}
          <filter id="cert-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.18" />
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

        {/* Left Ribbon: one flat shape, one flat color -- no navy backing, no
            gradient, no gold trim lines. A modern badge ribbon reads as a
            single die-cut tail, not a layered 3D column. */}
        <g id="cert-ribbon-bar" filter="url(#cert-shadow)">
          <path
            d="M 128 40 L 220 40 L 220 340 L 174 300 L 128 340 Z"
            fill="#1e40af"
          />
        </g>

        {/* Solid Badge (pinned near the top of the ribbon, not mid-ribbon) */}
        <g id="cert-badge">
          <g filter="url(#cert-shadow)">
            <circle cx="174" cy="132" r="56" fill="#d97706" />
            <circle cx="174" cy="132" r="48" fill="none" stroke="#ffffff" strokeWidth="3" />
          </g>
          <path
            d="M 154 132 L 168 146 L 196 116"
            fill="none"
            stroke="#ffffff"
            strokeWidth="7"
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
