import './AppShell.css';

export default function AppShell({
  header = null,
  footer = null,
  children,
  className = '',
  mainClassName = ''
}) {
  return (
    <div className={`app-shell ${className}`.trim()}>
      {header}
      <main className={`app-main ${mainClassName}`.trim()}>
        {children}
      </main>
      {footer}
    </div>
  );
}
