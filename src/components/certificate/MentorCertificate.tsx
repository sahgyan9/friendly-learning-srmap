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

          <linearGradient id="fl-ribbon-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="50%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>

          {/* Shadow for ribbon and seal */}
          <filter id="cert-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="3" dy="5" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Outer White Sheet */}
        <rect width="1600" height="1131" fill="#ffffff" />

        {/* Double Gold & Navy Border Frame */}
        <rect x="40" y="40" width="1520" height="1051" fill="#ffffff" stroke="url(#fl-cert-gold)" strokeWidth="6" rx="6" />
        <rect x="52" y="52" width="1496" height="1027" fill="none" stroke="#1e3a8a" strokeWidth="2" rx="4" />
        <rect x="60" y="60" width="1480" height="1011" fill="none" stroke="url(#fl-cert-gold)" strokeWidth="1.5" rx="3" />

        {/* Corner Accents */}
        <g stroke="url(#fl-cert-gold)" strokeWidth="2" fill="none">
          <path d="M 68 84 L 84 84 L 84 68" />
          <path d="M 1532 84 L 1516 84 L 1516 68" />
          <path d="M 68 1047 L 84 1047 L 84 1063" />
          <path d="M 1532 1047 L 1516 1047 L 1516 1063" />
        </g>

        {/* Left Vertical Blue Ribbon Wrap */}
        <g filter="url(#cert-shadow)">
          <path d="M 130 40 L 250 40 L 250 480 L 190 430 L 130 480 Z" fill="url(#fl-ribbon-grad)" />
          <line x1="134" y1="40" x2="134" y2="475" stroke="url(#fl-cert-gold)" strokeWidth="2.5" />
          <line x1="246" y1="40" x2="246" y2="475" stroke="url(#fl-cert-gold)" strokeWidth="2.5" />
        </g>

        {/* Golden Medallion Seal */}
        <g filter="url(#cert-shadow)">
          <circle cx="190" cy="220" r="68" fill="url(#fl-cert-gold)" />
          <circle cx="190" cy="220" r="62" fill="#1e3a8a" stroke="url(#fl-cert-gold)" strokeWidth="2" />
          <circle cx="190" cy="220" r="54" fill="none" stroke="url(#fl-cert-gold)" strokeWidth="1.5" strokeDasharray="4 2" />

          {/* Shield & Checkmark inside Seal */}
          <path
            d="M 190 185 C 205 185 215 190 215 200 C 215 220 190 240 190 248 C 190 240 165 220 165 200 C 165 190 175 185 190 185 Z"
            fill="url(#fl-cert-gold)"
          />
          <path
            d="M 180 212 L 187 219 L 202 204"
            fill="none"
            stroke="#1e3a8a"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Header & Content - Shifted slightly right to balance with ribbon */}
        <g transform="translate(100, 0)">
          {/* Brand Header */}
          <g>
            <image
              href={LOGO_DATA_URL}
              xlinkHref={LOGO_DATA_URL}
              x="635"
              y="98"
              width="60"
              height="60"
              preserveAspectRatio="xMidYMid meet"
            />
            <text x="705" y="140" fontFamily={sans} fontSize="36" fontWeight="bold">
              <tspan fill="#1e40af">Friendly</tspan>
              <tspan fill="#0f172a">Learning</tspan>
              <tspan fill="#1e40af" fontSize="24" dx="8">SRMAP</tspan>
            </text>
          </g>
          <text x="800" y="180" textAnchor="middle" fontFamily={sans} fontSize="18" fill="#64748b">
            Student-run mentorship platform · SRM University AP
          </text>

          {/* Title */}
          <text x="800" y="280" textAnchor="middle" fontFamily={serif} fontSize="58" fontWeight="bold" fill="#0f172a" letterSpacing="1">
            Certificate of Mentorship
          </text>
          <rect x="650" y="310" width="300" height="3" rx="1.5" fill="url(#fl-cert-gold)" />

          <text x="800" y="390" textAnchor="middle" fontFamily={sans} fontSize="22" fill="#64748b">
            This is to certify that
          </text>

          {/* Recipient Name */}
          <text
            x="800"
            y="490"
            textAnchor="middle"
            fontFamily={serif}
            fontSize={nameFontSize(name)}
            fontWeight="bold"
            fill="#0f172a"
          >
            {name}
          </text>

          <text x="800" y="540" textAnchor="middle" fontFamily={sans} fontSize="21" fill="#475569">
            {[department, university].filter(Boolean).join(" · ")}
          </text>

          <text x="800" y="620" textAnchor="middle" fontFamily={sans} fontSize="22" fill="#334155">
            has given their time as a mentor on Friendly Learning, answering questions
          </text>
          <text x="800" y="655" textAnchor="middle" fontFamily={sans} fontSize="22" fill="#334155">
            from students who are a year or two behind them.
          </text>

          {/* Stat boxes */}
          {stats.map((stat, index) => {
            const x = 360 + index * 440;
            return (
              <g key={stat.label}>
                <rect x={x - 160} y="710" width="320" height="140" rx="12" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
                <rect x={x - 160} y="710" width="320" height="6" rx="3" fill="url(#fl-cert-gold)" />
                <text x={x} y="776" textAnchor="middle" fontFamily={serif} fontSize="44" fontWeight="bold" fill="#1e40af">
                  {stat.value}
                </text>
                <text x={x} y="818" textAnchor="middle" fontFamily={sans} fontSize="18" fill="#64748b">
                  {stat.label}
                </text>
              </g>
            );
          })}

          {/* Footer Info */}
          <line x1="160" y1="895" x2="1440" y2="895" stroke="#cbd5e1" strokeWidth="1.5" />

          <text x="160" y="935" fontFamily={sans} fontSize="17" fill="#94a3b8">
            Certificate number
          </text>
          <text x="160" y="962" fontFamily={sans} fontSize="20" fontWeight="bold" fill="#334155">
            {certificateNumber}
          </text>

          <text x="1440" y="935" textAnchor="end" fontFamily={sans} fontSize="17" fill="#94a3b8">
            Issued
          </text>
          <text x="1440" y="962" textAnchor="end" fontFamily={sans} fontSize="20" fontWeight="bold" fill="#334155">
            {formatCertificateDate(issuedAt)}
          </text>

          <text x="800" y="1015" textAnchor="middle" fontFamily={sans} fontSize="17" fill="#94a3b8">
            <tspan>Anyone can check this certificate at </tspan>
            <tspan fontWeight="bold" fill="#1e40af">{verifyUrl}</tspan>
          </text>
        </g>

        {sample && (
          <g aria-hidden="true">
            <text
              x="800"
              y="780"
              textAnchor="middle"
              fontFamily={sans}
              fontSize="190"
              fontWeight="bold"
              fill="#0f172a"
              opacity="0.07"
              transform="rotate(-16 800 760)"
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
