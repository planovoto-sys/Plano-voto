import { ChanceFlame } from '@/shared/icons/ChanceFlame';

const LOADING_WORD = 'nossovoto';

export default function LoadingScreen({ className = '' }) {
  return (
    <div className={`loading loading--intro ${className}`.trim()} role="status" aria-live="polite">
      <div className="loading-intro" aria-label="Carregando">
        <span className="loading-intro__mark" aria-hidden="true">
          <ChanceFlame className="loading-intro__flame loading-intro__flame--base" size={82} />
          <span className="loading-intro__flame-fill">
            <ChanceFlame className="loading-intro__flame loading-intro__flame--fill" size={82} />
          </span>
        </span>
        <span className="loading-intro__word" aria-hidden="true">
          {Array.from(LOADING_WORD).map((letter, index) => (
            <span
              key={`${letter}-${index}`}
              style={{ '--letter-index': index }}
            >
              {letter}
            </span>
          ))}
        </span>
        <span className="sr-only">Carregando nossovoto</span>
      </div>
    </div>
  );
}
