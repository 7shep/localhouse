import { PageFrame } from "../../components/page-frame";

export default function MinecraftPage() {
  return <PageFrame title="Minecraft">
    <section className="secondary-grid" aria-label="Minecraft server details">
      <article className="secondary-panel secondary-panel--wide"><div className="secondary-panel-heading"><div><p className="secondary-label">LocalHouse SMP</p><div className="secondary-value"><span className="status-dot" />Online</div></div><span className="online-badge"><span className="status-dot" />v1.20.4</span></div><p className="secondary-copy">Survival world · play.localhouse.lan. Live RCON telemetry and server chat remain available from the home overview.</p></article>
      <article className="secondary-panel"><p className="secondary-label">Players online</p><div className="secondary-value">3 <small>/ 12</small></div><div className="player-stack player-stack--large"><span>A</span><span>J</span><span>M</span></div></article>
      <article className="secondary-panel"><p className="secondary-label">World status</p><div className="secondary-value">Day 0</div><p className="secondary-copy">Clear weather · Overworld.</p></article>
    </section>
  </PageFrame>;
}
