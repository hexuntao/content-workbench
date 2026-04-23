type LoadingViewProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function LoadingView({ eyebrow, title, description }: LoadingViewProps): React.JSX.Element {
  return (
    <main className="state-shell" id="main-content">
      <section className="loading-state">
        <p className="meta-label">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
        <div aria-hidden="true" className="loading-state__bars">
          <span />
          <span />
          <span />
        </div>
      </section>
    </main>
  );
}
