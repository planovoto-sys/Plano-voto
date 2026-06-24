export default function LogoCompleta({
  as = 'div',
  className = '',
  label = 'nossovoto.org'
}) {
  const Element = as;

  // Junta a classe base com qualquer classe de tamanho/posicionamento vinda das telas (ex: tela de login)
  const classNames = ['logo-completa', className].filter(Boolean).join(' ');

  return (
    <Element className={classNames} aria-label={label}>
      <img 
        src="/logo-horizontal.svg" 
        alt="Logo Nosso Voto" 
        className="logo-completa__image"
      />
    </Element>
  );
}