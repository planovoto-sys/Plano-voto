export function ChanceFlame({
  color = '#ff7a35',
  className = '',
  size = 30
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 38"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      style={{ color }}
    >
      <path
        fill="currentColor"
        d="M22.8.5c1.4 5.3-1.6 8.4-4.6 11.6C23.8 10.7 29.8 6.1 31.2.4c.2 9-3 14.9-6.7 19.4 4.6-1.3 7.1-4.2 7.5-6.1.2 10.9-6.4 22.5-19.1 23.8 3.2-2.9 3.2-6.8 1.9-9.7-1.7 3.1-4.9 5.8-8.9 6.5 1.9-3.1 1.2-6.4-.8-9C3.1 22.6.2 19.3.2 13.9c2.1 3.2 5.7 4.4 8 4.4-2.5-6.4 1.9-10.5 6.3-13.5-.3 3.9 1.3 6.3 3.6 7.6.7-4.8 3.7-7.2 4.7-11.9Z"
      />
    </svg>
  );
}
