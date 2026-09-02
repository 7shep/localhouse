import { PageFrame } from "../../components/page-frame";

export default function NetworkPage() {
  return (
    <PageFrame title="Network">
      <section className="secondary-grid" aria-label="Network status">
        <article className="secondary-panel secondary-panel--wide">
          <p className="secondary-label">Internet connection</p>
          <div className="secondary-value">
            <span className="status-dot" />
            Online
          </div>
          <p className="secondary-copy">
            LocalHouse has a stable connection with 14 ms latency. Last outage
            was 3 days ago for 2 minutes.
          </p>
        </article>
        <article className="secondary-panel">
          <p className="secondary-label">Local presence</p>
          <div className="presence-summary">
            <span className="profile-avatar">A</span>
            <div>
              <strong>Alex</strong>
              <span>
                <span className="status-dot" />
                Home · iPhone
              </span>
            </div>
          </div>
          <p className="secondary-copy">
            Last seen on the local network just now.
          </p>
        </article>
        <article className="secondary-panel">
          <p className="secondary-label">Guest network</p>
          <div className="secondary-value">LocalHouse-Guest</div>
          <p className="secondary-copy">
            Open Wi-Fi access from the home dashboard to share the scannable QR
            code.
          </p>
        </article>
      </section>
    </PageFrame>
  );
}
