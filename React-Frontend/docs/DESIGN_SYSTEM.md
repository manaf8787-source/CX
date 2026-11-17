# Design system: Tailwind CSS v4 + shadcn/ui

These conventions are binding for every page. Read this before you migrate or build a page. The decision to use Tailwind and shadcn/ui was the user's, on 17 Nov 2026. It reversed the earlier choice of hand-written CSS only.

Design direction (from the `ui-ux-pro-max` skill, adjusted for this product): a calm, token-based enterprise style similar to Fluent 2, with bento grids for dashboard tiles and a dense dashboard spacing scale. Motion is subtle and CSS-only. Arabic and English are both supported, with full right-to-left layout.

## 1. Migration status

| Area | Status |
|---|---|
| Theme, tokens, fonts, providers (`index.css`, `styles/theme.css`, `UiProviders`) | Done (pass A) |
| App shell: sidebar, header, search, language/theme/role switches | Done (pass A) |
| `components/common/*` | Done (pass A). The legacy APIs `Chip`, `Tile`, `RouteTabs` and `EmptyState` still work and now render the new components. |
| Home | Done (pass A) |
| AI assistant | Hosted in a shadcn `Sheet` (pass A). Its internals still use legacy classes; they move in pass C. |
| Actions (5 tabs), Customers, Runaway, Close the loop, Personas, Surveys | Pass B |
| Intelligent CX Team, Settings and reference (12 sub-pages), AI assistant internals | Pass C |

**How the old and new styles coexist.** `src/index.css` declares the layer order `theme, base, legacy, components, utilities`. The old `styles/base.css` loads in the `legacy` layer. That puts it above Tailwind's reset, so old pages keep their element styles, and below the utilities layer, so any Tailwind class wins over it. Its element rules (`h1`–`h3`, `a`, `table`/`th`/`td`, inputs, `:focus-visible`) skip anything inside `[data-ui-v2]`.

When the last page is migrated:

1. Delete the `@import './styles/base.css' layer(legacy)` line.
2. Delete `styles/base.css`.
3. Delete the legacy-only variables in `styles/tokens.css`. Keep the product hues `--p-*` (Tailwind's `product-*` colours read them) or move them into `theme.css`.
4. Remove the `data-ui-v2` attributes.

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
| `product-re`, `-af`, `-cl`, `-to`, `-ev`, `-wl` | One fixed hue per product, read from `--p-*` in `tokens.css`. **Dots, bars and fills only, never text** (several are below 4.5:1). `-wl` (PSI Wallet) is `[Proposed]`. | |
| `sidebar*` | The navy sidebar | |

The brand pair (navy `#12385B`, gold `#C8963E`) is still a **[Proposed]** placeholder until PSI's real brand colours arrive. Changing it is an edit to `theme.css` only.

Naming gotcha: the old CSS already owns the variables `--muted` (a text colour) and `--ring` (a box-shadow). shadcn's versions are therefore stored as `--surface-muted` and `--focus-ring`. The Tailwind classes are still `bg-muted` and `ring-ring`. Do not add raw variables named `--muted` or `--ring`.

Every text/background pair in `theme.css` was checked at ≥ 4.5:1 in both themes. If you add a colour, check its contrast too.

## 3. Typography, spacing, radius, motion

- **Fonts:** IBM Plex Sans (Latin) and IBM Plex Sans Arabic, weights 400–700, loaded from Google Fonts in `index.html`. `html:lang(ar)` switches the stack to put Arabic first. Use `font-mono` (IBM Plex Mono) only for IDs and code, not for numbers. Use `tabular-nums` for numbers.
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
- **Motion:** 150–300ms, `ease-out`, and exits faster than entrances. Animate only `transform`, `opacity`, colours and shadows, never width or height. `prefers-reduced-motion` turns all motion off globally (`theme.css`). Use `motion-reduce:` for anything that moves on hover.
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
| Page root | `<div data-ui-v2 className="flex flex-col gap-6">` |
| Page title, lede and the sample-data badge (NFR-3) | `PageHeader` (`common/PageHeader`). `sample` is on by default; add page buttons through `actions`. |
| A titled panel | `SectionCard`, with `title`, `description`, `actions` and `children` |
| KPI or dashboard tile | `KpiTile`, with `label`, `value`, `sub`, `accent` (any CSS colour), `icon`, `to` or `onClick`, and `loading`. In a bento grid, size it with `className="md:col-span-2"`. |
| Status pill | `StatusBadge tone=…`. Map domain values through `lib/status.ts` (`SEVERITY_TONE`, `CORRECTIVE_STATUS_TONE`, `CORRECTIVE_STATUS_LABEL`, `SHOPPER_CASE_STATUS_TONE`, `INVESTIGATION_STATUS_TONE`, `AGENT_VERDICT_TONE`, `LEVEL_TONE`). Add new maps there rather than inside pages. |
| Product label | `ProductTag` (coloured dot plus foreground text) |
| Sortable, searchable or paginated table | `DataTable` (`common/DataTable`, TanStack Table v8). Columns are `ColumnDef[]`. Use `SortableHeader` for sortable headers. `meta: { align: 'end' }` right-aligns numbers and turns on tabular figures. Props include `searchPlaceholder`, a `toolbar` slot for filters, `pageSize` (0 turns pagination off) and `onRowClick`. |
| Small static table | shadcn `Table` directly |
| Filter bar | A row of `Select` or `Input` controls with `size="sm"`/`h-9`, passed as `DataTable`'s `toolbar`, or a `flex flex-wrap gap-2` row |
| Tabs that change the URL | `RouteTabs` (`common/Tabs`) |
| Tabs inside a page | shadcn `Tabs` |
| Empty / loading / error | `EmptyState` / `LoadingState` (skeleton rows) / `ErrorState` (with `onRetry`). Every query-backed block shows one of the three, never a blank space. |
| Dialog with a form | shadcn `Dialog` + `Field` (`ui/field`) with React Hook Form + Zod (`@hookform/resolvers/zod`). Labels stay visible (a placeholder is never the label), errors appear under the field, and the primary action goes in the dialog footer. |
| Side panel | shadcn `Sheet` (as the AI assistant uses) |
| Confirmation or result notice | `toast()` from `sonner` (`Toaster` is already mounted, and its position mirrors in RTL) |
| Meter or progress toward a threshold | shadcn `Progress`. Recolour it with `[&>[data-slot=progress-indicator]]:bg-warning`. |
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
- [ ] Icon-only buttons have an `aria-label`. Decorative icons have `aria-hidden`.
- [ ] Tables have proper header cells. Sortable headers set `aria-sort` (`DataTable` does this).
- [ ] Hover is never the only way to discover something, and everything clickable shows a pointer cursor.
- [ ] Hover and press states transition in 150–300ms, and `prefers-reduced-motion` is respected.
- [ ] No horizontal scroll at 375, 768, 1024 or 1440px. Grids are `grid-cols-1` at mobile width and grid children have `min-w-0`.
- [ ] Arabic/RTL is checked for mirrored layout, flipped directional icons, charts and mixed-direction numbers.
- [ ] Role-gating from `auth/permissions.ts` is unchanged.

## 7. How to migrate a page

1. Set the page root to `<div data-ui-v2 className="flex flex-col gap-6">`. Replace the old `topbar`/`page-head`/`SampleBanner` block with `PageHeader`.
2. Replace old classes using this table:

   | Old class | New |
   |---|---|
   | `card` | `SectionCard`, or `Card` |
   | `card tint` | `bg-muted/50` |
   | `row` | `flex flex-wrap items-center gap-2` |
   | `row between` | add `justify-between` |
   | `col` | `flex flex-col gap-2` |
   | `grid grid-N` | `grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-N` |
   | `muted` | `text-muted-foreground` |
   | `text-sm` | `text-sm` (same name, now 13px) |
   | `chip` | `StatusBadge` |
   | `tile` | `KpiTile` |
   | `btn` | `Button` |
   | `btn primary` | `Button`, default variant |
   | `btn sm` | `size="sm"` |
   | `tabs` + buttons | shadcn `Tabs` |
   | `table-wrap` + `table` | `DataTable` or `Table` |
   | `meter` | `Progress` |
   | `modal-backdrop`/`modal` | `Dialog` |
   | `empty-state` | `EmptyState` |
   | `eyebrow` | `text-xs font-semibold tracking-wide text-gold-text uppercase` |
   | `mono` | `font-mono` |
   | `num` | `text-end tabular-nums` |
   | inline `style={{…}}` | utility classes. Keep `style` only for runtime values such as `--c`. |
   | `var(--brand)` | `primary` |
   | `var(--good)` | `success` |
   | `var(--warn)` | `warning` |
   | `var(--crit)` | `destructive` |
   | `var(--ink)` | `foreground` |
   | `var(--muted)` | `muted-foreground` |
   | `var(--line)` | `border` |
   | `var(--surface-2)` | `muted` |

3. Leave data, hooks, business logic, i18n strings and role-gating exactly as they are. This is a visual migration.
4. When no file uses a page-specific old class any more, delete it from `styles/base.css` and update the status table in §1.
5. Verify with `npm run typecheck && npm run lint && npm run build`, then a Playwright click-through in English/LTR and Arabic/RTL, light and dark, at 1440px and 375px.
