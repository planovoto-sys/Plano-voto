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
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 21.1c-3.9-5.18-5.85-8.63-5.85-11.05A5.85 5.85 0 0 1 12 4.2a5.85 5.85 0 0 1 5.85 5.85c0 2.42-1.95 5.87-5.85 11.05Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10.05" r="1.7" fill="currentColor" />
    </svg>
  );
}

export function DeputadoNavIcon({ className = 'app-icon' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.8 6.6h18.4c-.7 7.1-4.34 11.4-9.2 11.4S3.5 13.7 2.8 6.6Z" fill="currentColor" />
    </svg>
  );
}

export function SenadoNavIcon({ className = 'app-icon' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.9 17.7c.92-7 4.58-11.35 9.1-11.35s8.18 4.35 9.1 11.35H2.9Z" fill="currentColor" />
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
