import { ChanceFlame } from './ChanceFlame';

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
      <circle
        cx="12"
        cy="12"
        r="8.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <path d="M12 10.8v5.5" fill="none" stroke="currentColor" strokeWidth="2.35" strokeLinecap="round" />
      <circle cx="12" cy="7.55" r="1.25" fill="currentColor" />
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

export function ShareIcon({ className = 'app-icon' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.3 12.35 15.8 8.1M8.3 11.65l7.5 4.25" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
      <circle cx="6" cy="13" r="2.65" fill="none" stroke="currentColor" strokeWidth="2.25" />
      <circle cx="18" cy="7" r="2.65" fill="none" stroke="currentColor" strokeWidth="2.25" />
      <circle cx="18" cy="17" r="2.65" fill="none" stroke="currentColor" strokeWidth="2.25" />
    </svg>
  );
}

export function CopyIcon({ className = 'app-icon' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="8" y="7" width="10" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path d="M6 15.5H5.8A2.8 2.8 0 0 1 3 12.7V6.8A2.8 2.8 0 0 1 5.8 4h7.1A2.1 2.1 0 0 1 15 6.1V6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function DownloadIcon({ className = 'app-icon' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4v10M7.6 10.1 12 14.5l4.4-4.4" fill="none" stroke="currentColor" strokeWidth="2.35" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 18.4h14" fill="none" stroke="currentColor" strokeWidth="2.35" strokeLinecap="round" />
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
      <path d="M14.8 5.3 8.1 12l6.7 6.7" fill="none" stroke="currentColor" strokeWidth="2.55" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.9 12h10" fill="none" stroke="currentColor" strokeWidth="2.55" strokeLinecap="round" />
    </svg>
  );
}

export function EstadoNavIcon({ className = 'app-icon' }) {
  return (
    <svg className={className} viewBox="0 0 32 42" aria-hidden="true">
      <path
        d="M16 40C7.9 28.8 4 22.2 4 15.8 4 9.2 9.3 4 16 4s12 5.2 12 11.8c0 6.4-3.9 13-12 24.2Z"
        fill="currentColor"
      />
      <circle cx="16" cy="15.7" r="5.5" fill="#ffffff" />
    </svg>
  );
}

export function DeputadoNavIcon({ className = 'app-icon' }) {
  return (
    <svg className={className} viewBox="0 0 32 14" aria-hidden="true">
      <path d="M4 1h24a12 12 0 0 1-24 0Z" fill="currentColor" />
    </svg>
  );
}

export function SenadoNavIcon({ className = 'app-icon' }) {
  return (
    <svg className={className} viewBox="0 0 32 14" aria-hidden="true">
      <path d="M4 13a12 12 0 0 1 24 0H4Z" fill="currentColor" />
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

export function NossoVotoNavIcon({ className = 'app-icon' }) {
  return (
    <ChanceFlame className={className} size={26} />
  );
}
