import { ChanceFlame } from '@/shared/icons/ChanceFlame';
import './LogoCompleta.css';

export default function LogoCompleta({
  as = 'div',
  className = '',
  label = 'nossovoto.org'
}) {
  const Element = as;
  const classNames = ['logo-completa', className].filter(Boolean).join(' ');

  return (
    <Element className={classNames} aria-label={label}>
      <ChanceFlame className="logo-completa__flame" size={62} />
      <span className="logo-completa__text">
        nossovoto<em>.org</em>
      </span>
    </Element>
  );
}
