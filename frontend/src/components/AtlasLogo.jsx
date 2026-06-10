function AtlasLogo({ className = "h-10 w-10" }) {
  return (
    <div
      aria-hidden="true"
      className={`relative flex items-center justify-center rounded-2xl bg-[#07111f] shadow-lg shadow-cyan-950/30 ring-1 ring-cyan-100/15 ${className}`}
    >
      <svg
        className="relative z-10 h-[76%] w-[76%]"
        fill="none"
        viewBox="0 0 64 64"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M18 14H39L48 23V50H18V14Z"
          fill="url(#atlas-doc-fill)"
          stroke="url(#atlas-stroke)"
          strokeLinejoin="round"
          strokeWidth="2.5"
        />
        <path
          d="M39 14V23H48"
          stroke="#A5F3FC"
          strokeLinejoin="round"
          strokeWidth="2.5"
        />
        <path
          d="M25 30H39M25 37H34"
          stroke="#CBD5E1"
          strokeLinecap="round"
          strokeWidth="2.5"
        />
        <circle
          cx="40"
          cy="40"
          fill="#0F172A"
          r="8"
          stroke="#67E8F9"
          strokeWidth="2.5"
        />
        <path
          d="M45.5 45.5L52 52"
          stroke="#A5B4FC"
          strokeLinecap="round"
          strokeWidth="3"
        />
        <path
          d="M17 23L10 19M17 41L10 45M48 31L55 28"
          stroke="url(#atlas-network)"
          strokeLinecap="round"
          strokeWidth="2"
        />
        <circle cx="9" cy="18.5" fill="#67E8F9" r="2.5" />
        <circle cx="9" cy="45.5" fill="#818CF8" r="2.5" />
        <circle cx="56" cy="27.5" fill="#A5F3FC" r="2.5" />
        <defs>
          <linearGradient
            gradientUnits="userSpaceOnUse"
            id="atlas-stroke"
            x1="18"
            x2="51"
            y1="14"
            y2="50"
          >
            <stop stopColor="#67E8F9" />
            <stop offset="1" stopColor="#818CF8" />
          </linearGradient>
          <linearGradient
            gradientUnits="userSpaceOnUse"
            id="atlas-network"
            x1="9"
            x2="56"
            y1="19"
            y2="46"
          >
            <stop stopColor="#67E8F9" />
            <stop offset="1" stopColor="#A5B4FC" />
          </linearGradient>
          <linearGradient
            gradientUnits="userSpaceOnUse"
            id="atlas-doc-fill"
            x1="18"
            x2="48"
            y1="14"
            y2="50"
          >
            <stop stopColor="#172554" />
            <stop offset="1" stopColor="#0F172A" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute inset-1 rounded-[1rem] bg-cyan-300/8 blur-md" />
    </div>
  );
}

export default AtlasLogo;
