import Link from "next/link";
export default function NotFound() {
  return (
    <section className="empty-state">
      <span className="eyebrow">404 · PASIKLYDOME VIRTUVĖJE</span>
      <h1>Šio puslapio neradome.</h1>
      <Link className="button button-primary" href="/">
        Atrasti receptus
      </Link>
    </section>
  );
}
