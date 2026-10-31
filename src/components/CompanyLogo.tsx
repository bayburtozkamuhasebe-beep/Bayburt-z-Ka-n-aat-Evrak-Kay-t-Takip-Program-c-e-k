import React, { useState } from 'react';

interface CompanyLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  className = 'w-10 h-10',
  size = 'md',
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className={`relative rounded-xl overflow-hidden shadow-[0_0_20px_rgba(59,130,246,0.25)] bg-slate-950 flex items-center justify-center p-[2px] border border-blue-500/40 shrink-0 ${className}`}
    >
      {!imgError ? (
        <img
          src="/logo.svg"
          alt="Bayburt Öz-Ka Logo"
          className="w-full h-full object-contain"
          onError={(e) => {
            const target = e.currentTarget;
            if (target.src.includes('logo.svg')) {
              target.src = '/Adsız.png';
            } else if (target.src.includes('Adsız.png')) {
              target.src = '/logo.png';
            } else {
              setImgError(true);
            }
          }}
        />
      ) : (
        /* Vektörel Kusursuz Öz-Ka Amblemi */
        <svg
          viewBox="0 0 200 240"
          className="w-full h-full drop-shadow"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <clipPath id="fallback-ozka-clip">
              <circle cx="100" cy="140" r="88" />
            </clipPath>
          </defs>
          <circle cx="100" cy="140" r="88" fill="#221d45" />
          <polygon points="73,44 85,38 85,130 73,130" fill="#426bc7" />
          <polygon points="85,38 97,32 97,130 85,130" fill="#6f96ec" />
          <polygon points="103,12 115,18 115,130 103,130" fill="#6f96ec" />
          <polygon points="115,18 127,24 127,130 115,130" fill="#426bc7" />
          <g clipPath="url(#fallback-ozka-clip)">
            <path d="M 100,92 L 188,154 L 176,168 L 100,114 L 24,168 L 12,154 Z" fill="#ffffff" />
            <path d="M 100,124 L 176,178 L 166,190 L 100,144 L 34,190 L 24,178 Z" fill="#628ee8" />
            <path d="M 100,154 L 128,172 L 128,230 L 72,230 L 72,172 Z" fill="#628ee8" />
            <path d="M 100,172 L 114,182 L 114,230 L 86,230 L 86,182 Z" fill="#221d45" />
          </g>
        </svg>
      )}
    </div>
  );
};
