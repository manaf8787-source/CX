# Design system: Tailwind CSS v4 + shadcn/ui

These conventions are binding for every page. Read this before you build or change a page. The decision to use Tailwind and shadcn/ui was Manaf's, on 17 Nov 2026. It reversed the earlier choice of hand-written CSS only.

Design direction (from the `ui-ux-pro-max` skill, adjusted for this product): a calm, token-based enterprise style similar to Fluent 2, with bento grids for dashboard tiles and a dense dashboard spacing scale. Motion is subtle: CSS for hover, press, stagger and loops, and `motion` (`motion/react`) for enter/exit choreography (section 8). Arabic and English are both supported, with full right-to-left layout.

## 1. Files

The whole app runs on Tailwind + shadcn/ui. The migration finished on 17 Nov 2026; there is no legacy stylesheet left.

- `src/index.css` imports Tailwind, `tw-animate-css` and `styles/theme.css`, nothing else.
- `src/styles/theme.css` holds every token (light in `:root`, dark in `.dark`), the `@theme` mapping and the global base rules (fonts, pointer cursor, reduced motion).
- `src/components/ui/*` are the shadcn components; `src/components/common/*` are the shared building blocks built on them.
- `ThemeContext` toggles the `.dark` class on `<html>`.

## 2. Tokens

The source of truth is `src/styles/theme.css`, with light values in `:root` and dark values in `.dark`. Never put a raw hex value in a component. Use the Tailwind names below.

| Tailwind name | Use | Light / dark |
|---|---|---|
| `background` / `foreground` | Page background, body text | `#F8FAFC` / `#1E293B` · `#0B1220` / `#E2E8F0` |
| `card`, `popover` (`-foreground`) | Surfaces | white · `#111A2B` |
| `primary` (`-foreground`) | Brand navy; primary buttons, links, focus | `#12385B` · `#7FB0E0` |
| `secondary`, `accent` (`-foreground`) | Quiet buttons; hover fills | slate and navy tints |
| `muted` / `muted-foreground` | Subtle fills / secondary text (≥ 4.5:1) | `#F1F5F9` / `#475569` |
| `gold`, `gold-foreground`, `gold-text` | Brand gold. **Gold fails as text on white (2.7:1).** Use it as a fill with `gold-foreground`, or use `gold-text` for text. | `#C8963E` · `#E0B15C` |
| `success`, `warning`, `destructive`, `info` (`-foreground`) | Status fills | green / amber / red / blue |
| `success-text`, `warning-text`, `danger-text`, `info-text` | Text on a 10–15% tint of the same hue (badges, callouts) | darker shades, ≥ 5:1 |
| `border` / `input` / `ring` | Dividers / input outlines (≥ 3:1) / focus ring | |
| `chart-1` … `chart-5` | Chart series that aren't per-product | navy, gold, teal, blue, pink |
| `product-re`, `-af`, `-cl`, `-to`, `-ev`, `-wl` | One fixed hue per product, read from `--p-*` in `theme.css`. **Dots, bars and fills only, never text** (several are below 4.5:1). `-wl` (PSI Wallet) is `[Proposed]`. | |
| `sidebar*` | The navy sidebar | |

The brand pair (navy `#12385B`, gold `#C8963E`) is still a **[Proposed]** placeholder until PSI's real brand colours arrive. Changing it is an edit to `theme.css` only.

Every text/background pair in `theme.css` was checked at ≥ 4.5:1 in both themes. If you add a colour, check its contrast too.

## 3. Typography, spacing, radius, motion

- **Fonts:** IBM Plex Sans (Latin) and IBM Plex Sans Arabic, weights 400–700, self-hosted from `public/fonts/` (SIL OFL, copied from @fontsource 5.3.0) and declared in `src/styles/fonts.css` with `font-display: swap`. `index.html` preloads Latin 400/600, and Arabic 400/600 only for Arabic sessions; a small inline script there also sets `lang`, `dir` and the dark class before first paint. `html:lang(ar)` switches the stack to put Arabic first. Use `font-mono` (IBM Plex Mono) only for IDs and code, not for numbers. Use `tabular-nums` for numbers.
- **Type scale** (dense dashboard; nothing below 12px):

  | Class | Size | Use |
  |---|---|---|
  | `text-xs` | 12px | Captions, badges, table headers |
  | `text-sm` | 13px | Secondary text, table cells |
  | `text-base` | 14px, line-height 1.57 | Body text |
  | `text-lg` | 16px | Card titles |
  | `text-2xl` | 22px | Page title |
  | `text-3xl` | 28px | KPI values |

- **Spacing:** 8–32px rhythm. Page sections use `gap-6`, grids `gap-4`, cards `p-4`/`p-5`, and inline groups `gap-2`.
- **Radius:** `rounded-md` for controls, `rounded-lg` for small panels, `rounded-xl` for cards and tiles, `rounded-full` for badges.
- **Elevation:** cards use `shadow-xs` with a border. `shadow-md` is for hover on interactive tiles only. No glassmorphism, no `backdrop-blur`, no decorative gradients, no emoji as icons (use Lucide only).
- **Motion:** see section 8.
- **Touch targets:** interactive controls are at least 36px high (`h-9`), with 40–48px for primary actions. Use `size-9` for icon buttons.

## 4. Right-to-left (hard requirement)

- Use logical utilities only: `ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`/`border-s`/`border-e`/`text-start`/`text-end`/`rounded-s`. **Never** use `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-` or `text-left`/`text-right` for anything that depends on direction.
- Flip directional icons (chevrons, arrows, "next", "back") with `rtl:rotate-180`. Use `rtl:-scale-x-100` for diagonal arrows. Leave non-directional icons alone.
- Radix primitives get their direction from `<Direction.Provider>` in `components/layout/UiProviders.tsx`. Don't pass `dir` to individual components.
- shadcn components were generated with `"rtl": true` in `components.json`. **In the sidebar, `side="left"` means the logical start edge**, so don't swap it by language. `Sheet` sides animate with `slide-*-start` / `slide-*-end`.
- **Charts (Recharts) do not mirror themselves.** Wrap the chart in `dir="ltr"`, reverse the data order in Arabic, put the Y axis on the right in Arabic (`orientation`), and swap left/right margins. See `pages/Home.tsx`.
- Wrap mixed-direction fragments such as `9 / 5` or `75%` in `<bdi dir="ltr">`.
- Every visible string goes through `t(en, ar)` or `L(bi)`. That includes `aria-label` and `sr-only` text.

## 5. Which component for which pattern

| Pattern | Use |
|---|---|
| Page root | `<div className="flex flex-col gap-6">` (pages are lazy-loaded in `App.tsx`; the shell's `Suspense` shows `LoadingState` while a page chunk loads) |
| Page title, lede and the sample-data badge (NFR-3) | `PageHeader` (`common/PageHeader`). `sample` is on by default; add page buttons through `actions`. |
| A titled panel | `SectionCard`, with `title`, `description`, `actions` and `children` |
| KPI or dashboard tile | `KpiTile`, with `label`, `value`, `sub`, `accent` (any CSS colour), `icon`, `to` or `onClick`, and `loading`. In a bento grid, size it with `className="md:col-span-2"`. |
| Status pill | `StatusBadge tone=…`. Map domain values through `lib/status.ts` (`SEVERITY_TONE`, `CORRECTIVE_STATUS_*`, `SHOPPER_CASE_STATUS_TONE`, `INVESTIGATION_STATUS_TONE`, `AGENT_VERDICT_TONE`, `STANDARD_STATUS_*`, `LD_REQUEST_STATUS_*`, `MS_ASSIGNMENT_STATUS_*`, `CHECKLIST_STATUS_LABEL`, `LEVEL_TONE`). Never render a raw enum value; add a bilingual label map there rather than inside pages. |
| Product label | `ProductTag` (coloured dot plus foreground text) |
| Sortable, searchable or paginated table | `DataTable` (`common/DataTable`, TanStack Table v8). Columns are `ColumnDef[]`; `cell`/`header` renderers are plain functions called directly (not components), so they must not call hooks — put stateful cell content in a named component and render it from the function. Use `SortableHeader` for sortable headers. `meta: { align: 'end' }` right-aligns numbers and turns on tabular figures. Props include `searchPlaceholder`, a `toolbar` slot for filters, `pageSize` (0 turns pagination off) and `onRowClick`. |
| Small static table | shadcn `Table` directly |
| Filter bar | A row of `Select` or `Input` controls with `size="sm"`/`h-9`, passed as `DataTable`'s `toolbar`, or a `flex flex-wrap gap-2` row |
| Tabs that change the URL | `RouteTabs` (`common/Tabs`) |
| Tabs inside a page | shadcn `Tabs` |
| Empty / loading / error | `EmptyState` / `LoadingState` (skeleton rows) / `ErrorState` (with `onRetry`). Every query-backed block shows one of the three, never a blank space. |
| Dialog with a form | shadcn `Dialog` + `Field` (`ui/field`) with React Hook Form + Zod (`@hookform/resolvers/zod`). Labels stay visible (a placeholder is never the label), errors appear under the field, and the primary action goes in the dialog footer. |
| Side panel | shadcn `Sheet` (as the AI assistant uses) |
| A page or section that should stagger in | Nothing to do inside routed pages: `RouteTransition` staggers the page root's children. Elsewhere, add `cx-stagger` to the parent. |
| Confirmation or result notice | `toast()` from `sonner` (`Toaster` is already mounted, and its position mirrors in RTL) |
| Meter or progress toward a threshold | shadcn `Progress` (fills from the inline-start edge in both directions; no per-page RTL fix needed). Recolour it with `[&>[data-slot=progress-indicator]]:bg-warning`. |
| Help text on an icon-only button | shadcn `Tooltip` (`TooltipProvider` is already mounted) plus an `aria-label` |
| Buttons | shadcn `Button`: `default` for the primary action, `outline`/`secondary` otherwise, `ghost` in toolbars, `destructive`. `variant="gold"` is reserved for the AI assistant entry point. |

Imports use the `@/` alias (for example `@/components/ui/button`). New code imports `cn` from `@/lib/utils`.

### Adding shadcn components

Run `npx shadcn@4.23.0 add <name> --yes` from `React-Frontend/`. Then check three things:

1. The CLI can append default `:root`/`.dark`/`@theme` blocks to `src/index.css`. **Delete those blocks**, because the theme lives in `styles/theme.css`.
2. Remove any `"use client"` lines.
3. Pin any new dependency to an exact version in `package.json`.

The `cn` helper is shadcn's own package `cn` (from the `shadcn-ui/cn` repo), not `clsx` + `tailwind-merge`. `ui/sonner.tsx` was rewired to our `ThemeContext` instead of `next-themes`.

## 6. Accessibility checklist (run before marking a page done)

- [ ] Text contrast is ≥ 4.5:1 in both themes, and UI boundaries such as input borders and icons are ≥ 3:1. Use the `*-text` tokens on tints.
- [ ] Every interactive element is reachable by keyboard with a visible focus ring (`focus-visible:ring-[3px] ring-ring/50`). There are no clickable `div`s without `role`/`tabIndex`/key handling.
- [ ] Icon-only buttons have an `aria-label`. Decorative icons have `aria-hidden`. When a control shows text, its accessible name must contain that text (WCAG 2.5.3): add extra context as `sr-only` text, not an `aria-label` that replaces the visible words.
- [ ] Dialogs and sheets: `ui/dialog` and `ui/sheet` return focus to whatever opened them (also when opened from state, not a `DialogTrigger`); Escape closes. Don't override `onCloseAutoFocus` without keeping that.
- [ ] Tables have proper header cells. Sortable headers set `aria-sort` (`DataTable` does this).
- [ ] Hover is never the only way to discover something, and everything clickable shows a pointer cursor.
- [ ] Hover and press states transition in 150–300ms, and `prefers-reduced-motion` is respected.
- [ ] No horizontal scroll at 375, 768, 1024 or 1440px. Grids are `grid-cols-1` at mobile width and grid children have `min-w-0`.
- [ ] Arabic/RTL is checked for mirrored layout, flipped directional icons, charts and mixed-direction numbers.
- [ ] Role-gating from `auth/permissions.ts` is unchanged.

## 7. Adding or changing a page

1. Create the page in `src/pages/`, add a `lazy(() => import(...))` route in `App.tsx`, and a nav entry in `data/nav.ts` if it is top-level.
2. Root it with `<div className="flex flex-col gap-6">` and start with `PageHeader`.
3. Build from `components/common/*` and `components/ui/*` (section 5). Use tokens only (section 2), never raw hex or inline colour styles; keep `style` for runtime values such as `--c`.
4. Every string through `t()`/`L()`; every status through a map in `lib/status.ts`; role-gating through `auth/permissions.ts`.
5. Verify with `npm run check` and `npm run test:e2e` (which includes the axe WCAG 2.1 AA scan of every route in both languages and themes, and the keyboard spec), then a Playwright click-through in English/LTR and Arabic/RTL, light and dark, at 1440px and 375px, and run the checklist in section 6.

## 8. Motion

Added 17 Nov 2026 (pass E), at Manaf's request for animation across the portal. Keep it calm: this is a working dashboard, not a landing page.

**Rules**

- 150–400ms. Enters use `ease-out` (`EASE_OUT` in `lib/motion.ts`); exits are faster than enters (`EXIT`, 150ms), or instant.
- Animate `transform` and `opacity` only (plus colours and shadows on hover). Never width, height, top or left.
- Horizontal slides mirror in Arabic: multiply x offsets by `dirSign(dir)`.
- **Reduced motion is respected everywhere.** `MotionProvider` sets `<MotionConfig reducedMotion="user">` (transform animations off, opacity kept). The `prefers-reduced-motion` block in `theme.css` cuts CSS durations and switches off the stagger, shimmer, typing dots and the login motif entirely. `useCountUp` returns the final value at once and `useChartMotion` returns `isAnimationActive: false`.
- No layout shift and no horizontal scroll: `#main` uses `overflow-x-clip`; entrance offsets are 6–12px.

**Engine.** `motion@14.9.0` (pinned). `LazyMotion` with `domAnimation` and `strict`, features loaded on demand (`lib/motionFeatures.ts`, about 18 KB gzipped, not in the first download). Because of `strict`, use `import * as m from 'motion/react-m'` and `<m.div>`, never `motion.div`. `AnimatePresence`, `MotionConfig` and hooks come from `motion/react`.

**Inventory**

| Where | What | How |
|---|---|---|
| Route change | Page content fades in and slides 12px from the reading end; the shell and sidebar stay still. Enter-only (the old page leaves instantly), which keeps lazy-route `Suspense` simple. | `components/layout/RouteTransition.tsx` in `Shell`. `scope="section"` inside `ActionsLayout` and `SettingsLayout`, so a tab change animates only the tab content (8px). |
| Page sections | Direct children of the page root rise in one after another (40ms apart, capped at 280ms). Runs on mount only, not on data refetch. | `.cx-page > * > *` in `theme.css`; `.cx-stagger` for any other container. `backwards` fill, so hover transforms are never overridden afterwards. |
| KPI values | Numbers count up from 0 (700ms, ease-out cubic); later changes count from the last value; unchanged values don't replay. Numeric strings such as `62%` keep their suffix. | `AnimatedValue` in `KpiTile`, `hooks/useCountUp.ts` |
| Charts | Recharts draw-in, 600ms ease-out; off under reduced motion. | Spread `useChartMotion()` onto each series (`Bar`, `Area`, …) |
| Buttons | Press scales to 0.97; colour and shadow transitions 150ms. | `ui/button.tsx` base classes |
| Interactive tiles and cards | Hover lifts 1px with a shadow; `motion-reduce:` cancels the lift. | `KpiTile`, login role cards |
| Tabs | Active pill and text colour transition 200ms; in-page `TabsContent` fades in. | `ui/tabs.tsx`, `common/Tabs.tsx` |
| Collapsible sections | Content fades and drops 4px in, fades out faster. No height animation. | `ui/collapsible.tsx` |
| Dialogs, sheets, menus, toasts | shadcn/tw-animate and sonner defaults (fade + zoom/slide, about 200ms), left as shipped. | — |
| Sidebar | shadcn's collapse transition, unchanged. | `ui/sidebar.tsx` |
| Loading | Skeletons show a highlight sweeping from the reading-start edge (mirrored in Arabic). | `.cx-shimmer` on `ui/skeleton.tsx` |
| AI assistant | Messages rise 8px into place; a three-dot typing indicator shows for 550ms before each scripted answer (the answer is already computed). | `components/ai/AssistantPanel.tsx`, `.cx-typing-dot` |
| Login | Brand panel staggers in; a faint line pattern drifts (40s) and gold rings turn (120s); the card slides in from the reading end; role cards lift on hover and the check mark pops in on select; the button shows a spinner, then the card fades out and the app's route transition takes over. | `pages/Login.tsx`, `.cx-drift`, `.cx-orbit` |

## 9. Sign-in (sample authentication)

There is no backend, so sign-in is a **sample**: the person picks one of the 12 roles (titles, never people's names) and optionally types a display name. No password is asked for or stored, and the page says so in both languages.

- `auth/session.ts` holds `AuthContext`, `useAuth()` and the `localStorage` session (`psicx.session`: display name and sign-in time only, read and written inside `try/catch`). `auth/AuthContext.tsx` holds `AuthProvider` and `RequireAuth`.
- The role itself stays in `RoleContext`; signing in calls `setRole`, so the demo role switch in the sidebar stays consistent with the session.
- Every route except `/login` sits behind `RequireAuth`, which redirects to `/login` with the intended path in `state.from`. After sign-in the person returns there, or to the role's home page (`roles.ts` `home`).
- Sign out is in the header user menu (initials avatar, display name, role). It navigates and clears the session in one `startTransition`, so the next person is never sent to the previous person's page.
- When a real identity provider exists, replace the body of `signIn` and the check in `RequireAuth`; the rest of the app reads only `useRole()` and `useAuth()`.
