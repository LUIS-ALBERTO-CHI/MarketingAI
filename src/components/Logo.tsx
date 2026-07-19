// Logo de MarketingAI: línea de crecimiento ascendente + chispa de IA,
// sobre un cuadrado con el degradado azul→violeta de la marca.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="MarketingAI"
    >
      <defs>
        <linearGradient
          id="mai-logo-grad"
          x1="4"
          y1="4"
          x2="44"
          y2="44"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#3B82F6" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill="url(#mai-logo-grad)" />
      {/* Línea de crecimiento */}
      <path
        d="M12 32 L19 26 L25 29 L33 19"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="32" r="1.7" fill="white" />
      <circle cx="19" cy="26" r="1.7" fill="white" />
      <circle cx="25" cy="29" r="1.7" fill="white" />
      {/* Chispa de IA */}
      <path
        d="M37 9.7 L38.13 13.37 L41.8 14.5 L38.13 15.63 L37 19.3 L35.87 15.63 L32.2 14.5 L35.87 13.37 Z"
        fill="white"
      />
    </svg>
  );
}
