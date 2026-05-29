import HeadsUpNotification from './HeadsUpNotification';

export default function NotificationStack({ notifications, onDismiss }) {
  if (!notifications.length) return null;

  return (
    <div className="notification-stack" aria-label="Notificações do aplicativo">
      {notifications.map((notification) => (
        <HeadsUpNotification
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}
