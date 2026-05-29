export default function DesktopPageIntro({ badge, title, children, limitText }) {
  return (
    <section className="desktop-page-intro">
      {badge && <span className="desktop-page-intro__badge">{badge}</span>}
      <h1>{title}</h1>
      {children && <p>{children}</p>}
      {limitText && <p className="desktop-page-intro__limit">{limitText}</p>}
    </section>
  );
}
