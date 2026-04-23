type ErrorViewProps = {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
};

export function ErrorView({
  title,
  description,
  actionLabel,
  onAction,
}: ErrorViewProps): React.JSX.Element {
  return (
    <main className="state-shell">
      <section className="error-state">
        <div className="error-state__signal" />
        <p className="meta-label">Application Error</p>
        <h1>{title}</h1>
        <p>{description}</p>
        <button className="button-link" onClick={onAction} type="button">
          {actionLabel}
        </button>
      </section>
    </main>
  );
}
