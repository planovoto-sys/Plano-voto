export function MenuIcon({ className = 'app-icon' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 5.6h20M2 12h20M2 18.4h20" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" />
    </svg>
  );
}

export function InfoIcon({ className = 'app-icon' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.1c5.75 0 10 3.89 10 9.11 0 5.35-4.35 9.14-10.13 9.14-1.2 0-2.35-.16-3.41-.49L2.8 21.9l1.65-5.15A8.62 8.62 0 0 1 2 10.98C2 5.87 6.31 2.1 12 2.1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M12 10.25v5.55" fill="none" stroke="currentColor" strokeWidth="2.35" strokeLinecap="round" />
      <circle cx="12" cy="7.05" r="1.35" fill="currentColor" />
    </svg>
  );
}

export function ShareSolidIcon({ className = 'app-icon' }) {
  return (
    <svg className={`${className} share-icon-solid`} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M18.28 15.16a3.81 3.81 0 0 0-2.92 1.36l-5.58-2.96c.1-.36.1-.55.1-.88 0-.31-.04-.61-.11-.9l5.59-2.97a3.82 3.82 0 1 0-1.11-2.67c0 .31.04.61.11.9l-5.59 2.98a3.82 3.82 0 1 0 .03 5.31l5.56 2.95c-.07.29-.11.59-.11.9a3.82 3.82 0 1 0 4.03-4.02Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ClearIcon({ className = 'app-icon' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 7l10 10M17 7 7 17" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" />
    </svg>
  );
}

export function SearchIcon({ className = 'app-icon' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.8" cy="10.8" r="6.4" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <path d="m15.6 15.6 4.2 4.2" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function BackIcon({ className = 'app-icon' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15.5 5 8.5 12l7 7" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function EstadoNavIcon({ className = 'app-icon' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 21.2c-3.95-5.2-6.1-8.75-6.1-11.2A6.1 6.1 0 0 1 12 3.9a6.1 6.1 0 0 1 6.1 6.1c0 2.45-2.15 6-6.1 11.2Z"
        fill="currentColor"
      />
      <circle cx="12" cy="10" r="2.25" fill="#ffffff" />
    </svg>
  );
}

export function DeputadoNavIcon({ className = 'app-icon' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 8.1h16c-.6 5.05-3.78 8.3-8 8.3S4.6 13.15 4 8.1Z" fill="currentColor" />
    </svg>
  );
}

export function SenadoNavIcon({ className = 'app-icon' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.1 16.3c.8-4.95 3.95-8.15 7.9-8.15s7.1 3.2 7.9 8.15H4.1Z" fill="currentColor" />
    </svg>
  );
}

export function ResultadoNavIcon({ className = 'app-icon' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="8.3" cy="8.7" r="3" fill="currentColor" />
      <circle cx="15.7" cy="8.7" r="3" fill="currentColor" />
      <path d="M3.35 18.7c.25-3.15 2.25-5.2 4.95-5.2s4.7 2.05 4.95 5.2H3.35Z" fill="currentColor" />
      <path d="M10.75 18.7c.25-3.15 2.25-5.2 4.95-5.2s4.7 2.05 4.95 5.2h-9.9Z" fill="currentColor" />
    </svg>
  );
}

export function OptionsNavIcon({ className = 'app-icon' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3.5 6h17M3.5 12h17M3.5 18h17" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="square" />
    </svg>
  );
}
