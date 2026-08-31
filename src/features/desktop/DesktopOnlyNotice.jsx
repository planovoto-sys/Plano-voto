import './DesktopOnlyNotice.css';

export default function DesktopOnlyNotice() {
  return (
    <main className="desktop-only-notice">
      <div className="desktop-only-notice__content">
        <img
          className="desktop-only-notice__logo"
          src="/icone-com-nome.svg"
          alt="Bom de Voto"
        />
        <p>Para uma melhor experiência, acessar pelo seu smartphone.</p>
      </div>
    </main>
  );
}
