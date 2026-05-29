const DEFAULT_FEATURES = [
  'salvar seu plano',
  'continuar depois',
  'visualizar campos completos',
  'compartilhar seu plano'
];

export default function DesktopLockedFeatureList({ items = DEFAULT_FEATURES }) {
  return (
    <ul className="desktop-locked-feature-list">
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}
