# LocalHouse

## Stack

- Next.js 14 App Router, React 18, TypeScript.
- Tailwind CSS v4 + shadcn/ui (`base-rhea` preset).
- Custom dashboard styling lives in `app/globals.css`.
- Shared shadcn components live in `components/ui/`.
- Shared data/types live in `lib/`; API routes live in `app/api/`.

## Commands

```bash
npm run dev
npm run build
```

## shadcn workflow

1. Check `components/ui/` before adding a component.
2. Use the kit-specific recipe/API lookup when available:
   `node C:/Users/alex/.codex/skills/figma-shadcn-by-sitsiilia/scripts/find.mjs <query>`
3. Add only the needed component:
   `npx shadcn@latest add <component-or-registry-url>`
4. Compose components; edit local source directly when behavior or styling needs to change.
5. Use `@/components/ui/*`, `@/lib/*`, and design tokens. Keep generated shadcn files readable.
6. Run `npm run build` after component or token changes.

## Dashboard rules

- Preserve existing API behavior and interactive states.
- Keep one routable page per `app/**/page.tsx` route; shared UI belongs in `components/`.
- Keep the preset's black/gray palette, thin borders, restrained radii, Inter typography, and neutral status accents with orange warnings only.
- Prefer calm two-column layouts, clear hierarchy, generous spacing, and minimal dashboard chrome.
- Use shadcn primitives for controls, cards, badges, inputs, and dialogs; do not replace the established layout with generic card grids.
- Keep controls keyboard accessible, labeled, and usable at narrow widths.
- Use inline/project-owned icons unless a shadcn component requires an installed icon dependency.

## Change discipline

- Do not overwrite `app/globals.css` wholesale when applying shadcn updates; merge token changes with the existing LocalHouse system.
- Do not add Figma MCP work for routine UI edits. Use it only for intentional design syncs or editable Figma deliverables.
- Verify changed routes and the production build before handoff.

References: [shadcn/ui docs](https://ui.shadcn.com/docs/) · [Sitsiilia shadcn-figma kit](https://github.com/Sitsiilia/shadcn-figma)
