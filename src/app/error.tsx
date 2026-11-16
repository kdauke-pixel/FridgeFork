"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="empty-state" role="alert">
      <h1>Virtuvėje kažkas užstrigo.</h1>
      <p>Pabandykime dar kartą.</p>
      <button className="button button-primary" onClick={reset}>
        Bandyti dar kartą
      </button>
    </section>
  );
}
