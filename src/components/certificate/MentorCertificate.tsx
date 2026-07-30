import { forwardRef } from "react";
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
          <linearGradient id="fl-cert-accent" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>

        <rect width="1600" height="1131" fill="#ffffff" />
        <rect x="44" y="44" width="1512" height="1043" rx="10" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
        <rect x="44" y="44" width="1512" height="12" rx="6" fill="url(#fl-cert-accent)" />

        {/* A monogram, not a seal. An ornate wax-seal emblem would be borrowing
            an authority a student platform does not have; a logo mark says who
            issued this and leaves it at that. */}
        <circle cx="168" cy="152" r="46" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="2" />
        <text x="168" y="168" textAnchor="middle" fontFamily={serif} fontSize="36" fontWeight="bold" fill="#2563eb">
          FL
        </text>

        {/* Issuer, stated first and plainly. */}
        <text x="800" y="150" textAnchor="middle" fontFamily={sans} fontSize="26" fontWeight="bold" fill="#2563eb" letterSpacing="6">
          FRIENDLY LEARNING
        </text>
        <text x="800" y="186" textAnchor="middle" fontFamily={sans} fontSize="19" fill="#64748b">
          Student-run mentorship platform · SRM University AP
        </text>

        <text x="800" y="310" textAnchor="middle" fontFamily={serif} fontSize="60" fill="#0f172a">
          Certificate of Mentorship
        </text>
        <rect x="670" y="342" width="260" height="3" rx="1.5" fill="url(#fl-cert-accent)" />

        <text x="800" y="424" textAnchor="middle" fontFamily={sans} fontSize="22" fill="#64748b">
          This is to certify that
        </text>

        <text
          x="800"
          y="524"
          textAnchor="middle"
          fontFamily={serif}
          fontSize={nameFontSize(name)}
          fontWeight="bold"
          fill="#0f172a"
        >
          {name}
        </text>

        <text x="800" y="572" textAnchor="middle" fontFamily={sans} fontSize="21" fill="#475569">
          {[department, university].filter(Boolean).join(" · ")}
        </text>

        <text x="800" y="652" textAnchor="middle" fontFamily={sans} fontSize="23" fill="#334155">
          has given their time as a mentor on Friendly Learning, answering questions
        </text>
        <text x="800" y="688" textAnchor="middle" fontFamily={sans} fontSize="23" fill="#334155">
          from students who are a year or two behind them.
        </text>

        {/* The figures. These are recomputed from the database every time the
            certificate is read, so they cannot drift from the truth. */}
        {stats.map((stat, index) => {
          const x = 340 + index * 460;
          return (
            <g key={stat.label}>
              <rect x={x - 170} y="742" width="340" height="150" rx="12" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5" />
              <text x={x} y="812" textAnchor="middle" fontFamily={serif} fontSize="46" fontWeight="bold" fill="#2563eb">
                {stat.value}
              </text>
              <text x={x} y="854" textAnchor="middle" fontFamily={sans} fontSize="19" fill="#64748b">
                {stat.label}
              </text>
            </g>
          );
        })}

        <line x1="120" y1="930" x2="1480" y2="930" stroke="#e2e8f0" strokeWidth="1.5" />

        <text x="120" y="968" fontFamily={sans} fontSize="18" fill="#94a3b8">
          Certificate number
        </text>
        <text x="120" y="996" fontFamily={sans} fontSize="21" fontWeight="bold" fill="#334155">
          {certificateNumber}
        </text>

        <text x="1480" y="968" textAnchor="end" fontFamily={sans} fontSize="18" fill="#94a3b8">
          Issued
        </text>
        <text x="1480" y="996" textAnchor="end" fontFamily={sans} fontSize="21" fontWeight="bold" fill="#334155">
          {formatCertificateDate(issuedAt)}
        </text>

        {/* Without this the certificate is only a picture, and a picture can be
            edited in a browser in half a minute.
            On its own full-width line: a verification URL carries a uuid, which
            is far too long to share a row with anything else. */}
        <text x="800" y="1050" textAnchor="middle" fontFamily={sans} fontSize="17" fill="#94a3b8">
          <tspan>Anyone can check this certificate at </tspan>
          <tspan fontWeight="bold" fill="#2563eb">{verifyUrl}</tspan>
        </text>

        {sample && (
          <g aria-hidden="true">
            {/* Sits across the middle band rather than over the name, so the
                sample still reads as a certificate while being unmistakably
                marked as one nobody has earned. */}
            <text
              x="800"
              y="800"
              textAnchor="middle"
              fontFamily={sans}
              fontSize="190"
              fontWeight="bold"
              fill="#0f172a"
              opacity="0.08"
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
