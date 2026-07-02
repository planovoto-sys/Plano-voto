const LOADING_WORD = 'Bom de voto';

export default function LoadingScreen({ className = '' }) {
  return (
    <div className={`loading loading--intro ${className}`.trim()} role="status" aria-live="polite">
      <div className="loading-intro" aria-label="Carregando">
        <span className="loading-intro__mark" aria-hidden="true">
          
          {/* Ícone Base */}
          <img 
            src="/icone-branco.svg" 
            alt="" 
            className="loading-intro__flame loading-intro__flame--base" 
            width={82} 
            height={82} 
          />
          
          <span className="loading-intro__flame-fill">

            <img 
              src="/icone-branco.svg" 
              alt="" 
              className="loading-intro__flame loading-intro__flame--fill" 
              width={82} 
              height={82} 
            />
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
        <span className="sr-only">Carregando Bom de Voto</span>
      </div>
    </div>
  );
}