/**
 * Self-contained decorative illustration for the login page's brand panel.
 * Plain inline SVG (no external image/font requests) so the page has zero
 * network dependency and stays crisp at any size.
 */
export function EducationIllustration() {
  return (
    <svg viewBox="0 0 480 480" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
      <defs>
        <linearGradient id="blob1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3fa9c0" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#14586c" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="card" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#eef2f2" />
        </linearGradient>
      </defs>

      <circle cx="120" cy="360" r="140" fill="url(#blob1)" />
      <circle cx="400" cy="100" r="90" fill="url(#blob1)" />

      {/* Open book */}
      <g transform="translate(120 210)">
        <path d="M0 20 C40 0 100 0 120 20 L120 140 C100 120 40 120 0 140 Z" fill="url(#card)" stroke="#156d85" strokeWidth="3" />
        <path d="M240 20 C200 0 140 0 120 20 L120 140 C140 120 200 120 240 140 Z" fill="url(#card)" stroke="#156d85" strokeWidth="3" />
        <path d="M20 35 C50 22 90 22 110 35" stroke="#7fcbda" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M20 55 C50 42 90 42 110 55" stroke="#7fcbda" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M20 75 C50 62 90 62 110 75" stroke="#7fcbda" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M130 35 C150 22 190 22 220 35" stroke="#7fcbda" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M130 55 C150 42 190 42 220 55" stroke="#7fcbda" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M130 75 C150 62 190 62 220 75" stroke="#7fcbda" strokeWidth="3" strokeLinecap="round" fill="none" />
      </g>

      {/* Graduation cap */}
      <g transform="translate(190 90)">
        <polygon points="60,0 120,26 60,52 0,26" fill="#0f4a5c" />
        <polygon points="60,52 100,36 100,60 60,78 20,60 20,36" fill="#156d85" />
        <line x1="112" y1="30" x2="112" y2="66" stroke="#0f4a5c" strokeWidth="3" strokeLinecap="round" />
        <circle cx="112" cy="70" r="4" fill="#0f4a5c" />
      </g>

      {/* Floating dots */}
      <circle cx="80" cy="120" r="6" fill="#3fa9c0" opacity="0.7" />
      <circle cx="410" cy="260" r="8" fill="#3fa9c0" opacity="0.5" />
      <circle cx="370" cy="380" r="5" fill="#7fcbda" opacity="0.8" />
      <circle cx="60" cy="60" r="5" fill="#7fcbda" opacity="0.7" />
    </svg>
  );
}
