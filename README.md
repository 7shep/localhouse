# LocalHouse

Local-first house operations dashboard. This is the Phase 1 MVP: a polished, mock-backed dashboard with Internet, server, weather, presence, House AI, and a scannable guest Wi-Fi QR utility.

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Current shape

- `app/page.tsx` contains the interactive dashboard surface and mock House AI response loop.
- `app/globals.css` contains the dark tactical telemetry visual system.
- `lib/modules.ts` defines the shared feature-module interface and the mock snapshot.
- `qrcode.react` renders the guest Wi-Fi QR code in the utility modal.

The data is intentionally mocked for v0.1. Each real provider can replace one entry in `featureModules` without expanding the page into a route handler: system metrics, WAN telemetry, weather, LAN presence, then Ollama.
