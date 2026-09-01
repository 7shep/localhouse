# LocalHouse

Local-first house operations dashboard. This is the Phase 1 MVP: a polished, mock-backed dashboard with Internet, server, weather, presence, House AI, and a scannable guest Wi-Fi QR utility.

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Current shape

- `app/page.tsx` contains the interactive home dashboard and mock House AI response loop.
- `app/network/page.tsx`, `app/minecraft/page.tsx`, and `app/settings/page.tsx` are dedicated routable pages for the sidebar destinations.
- `components/page-frame.tsx` provides the shared shell for secondary pages.
- `app/globals.css` contains the warm neutral dashboard visual system.
- `lib/modules.ts` defines the shared feature-module interface and the mock snapshot.
- `qrcode.react` renders the guest Wi-Fi QR code in the home dashboard utility modal.

The data is intentionally mocked for v0.1. Each real provider can replace one entry in `featureModules` without expanding the page into a route handler: system metrics, WAN telemetry, weather, LAN presence, then Ollama.

## Local AI

House AI uses Ollama through the server-side `/api/ai` route. The default model is `qwen2.5:7b` at `http://127.0.0.1:11434`; override these with `OLLAMA_MODEL` and `OLLAMA_BASE_URL` in `.env.local` if needed. Make sure Ollama is running and the model is installed with `ollama pull qwen2.5:7b`.
