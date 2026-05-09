import './FlowToast.css';

export default function FlowToast({ message }) {
  if (!message) return null;

  return (
    <div className="flow-toast" role="status" aria-live="polite">
      {message}
    </div>
  );
}
