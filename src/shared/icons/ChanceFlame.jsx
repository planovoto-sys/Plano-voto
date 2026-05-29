import flameIconUrl from '@/assets/icone-fogo-2.png';

export function ChanceFlame({
  color = '#ff7a35',
  className = '',
  size = 30,
  style
}) {
  const imageStyle = {
    color,
    display: 'inline-block',
    objectFit: 'contain',
    verticalAlign: 'middle',
    ...style
  };

  return (
    <img
      className={className}
      src={flameIconUrl}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable="false"
      decoding="async"
      style={imageStyle}
    />
  );
}
