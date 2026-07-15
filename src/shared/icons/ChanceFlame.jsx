export function ChanceFlame({
  color = '#ff7a35',
  className = '',
  size = 30,
  style
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
    >
      <path
        d="M12 2C10.5 6 7 8 7 12a5 5 0 0 0 10 0c0-4-3.5-6-5-10Z"
        fill={color}
      />
      <path
        d="M12 15c-1.5 0-2.5-1-2.5-2.5 0-1.5 1.5-3.5 2.5-5 1 1.5 2.5 3.5 2.5 5 0 1.5-1 2.5-2.5 2.5Z"
        fill="#fff"
        fillOpacity="0.5"
      />
    </svg>
  );
}
