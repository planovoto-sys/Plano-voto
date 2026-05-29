const notificationLabels = {
  success: 'Sucesso',
  error: 'Erro',
  warning: 'Aviso',
  info: 'Informação',
  loading: 'Carregando',
  undo: 'Ação disponível'
};

export default function HeadsUpNotification({ notification, onDismiss }) {
  const { id, type, message, action } = notification;
  const isAssertive = type === 'error' || type === 'warning';
  const label = notificationLabels[type] || notificationLabels.info;

  return (
    <article
      className={`heads-up-notification heads-up-notification--${type}`}
      role={isAssertive ? 'alert' : 'status'}
      aria-live={isAssertive ? 'assertive' : 'polite'}
      aria-label={`${label}: ${message}`}
    >
      <span className="heads-up-notification__icon" aria-hidden="true" />
      <div className="heads-up-notification__copy">
        <span>{message}</span>
      </div>
      {action && (
        <button
          className="heads-up-notification__action"
          type="button"
          onClick={() => {
            action.onClick?.();
            onDismiss(id);
          }}
        >
          {action.label}
        </button>
      )}
      <button
        className="heads-up-notification__close"
        type="button"
        onClick={() => onDismiss(id)}
        aria-label="Fechar notificação"
      >
        ×
      </button>
    </article>
  );
}
