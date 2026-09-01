import { PageFrame } from "../../components/page-frame";

export default function SettingsPage() {
  return <PageFrame title="Settings">
    <section className="secondary-grid" aria-label="Settings">
      <article className="secondary-panel secondary-panel--wide"><p className="secondary-label">House AI</p><div className="secondary-value">Ollama · qwen2.5:7b</div><p className="secondary-copy">The assistant runs against the local Ollama endpoint when available, with a snapshot-based fallback for common house questions.</p></article>
      <article className="secondary-panel"><p className="secondary-label">Host node</p><div className="secondary-value">homelab-01</div><p className="secondary-copy">System metrics refresh automatically every 10 seconds.</p></article>
      <article className="secondary-panel"><p className="secondary-label">Design language</p><div className="secondary-value">Warm neutral</div><p className="secondary-copy">A quiet, readable control surface for everyday home operations.</p></article>
    </section>
  </PageFrame>;
}
