# Meo-inspired design: implementation plan (18 Nov 2026)

Source: `meo-admin-design-skill/meo-admin-design-skill/SKILL.md` and its `references/`, `tokens/`, `examples/` (read in full: SKILL.md, admin-dashboard-adaptation.md; tokens and component recipes are used from the files directly). The skill is a design language only; no Meo name, logo, photos or copy is used.

Scope: restyle `React-Frontend/`. No business logic, data, hooks, routes, permissions or copy change. Tests must stay green.

## 1. What the project has today

| Area | Today |
|---|---|
| Styling | Tailwind v4 CSS-first. All tokens in `src/styles/theme.css` as shadcn variables (`--primary`, `--card`, `--border`, `--sidebar*` ...), light and `.dark` class |
| Look | Navy `#12385B` + gold `#C8963E` placeholder brand, navy sidebar, 1px borders, 0.625rem radius, IBM Plex Sans + IBM Plex Sans Arabic (self-hosted) |
| Components | shadcn/ui in `src/components/ui/*` (26), product components in `src/components/common/*`, shell in `src/components/layout/{Shell,Sidebar,UserMenu,AsOfBar}.tsx` |
| Motion | `motion` (LazyMotion, reduced-motion honoured), count-up, chart draw-in |
| i18n / RTL | EN/AR, logical utilities everywhere, `dir` on `<html>`, Arabic font switch in `theme.css` |
| Charts | Recharts |
| Tests that touch style | axe scan of every route (contrast), e2e role/name selectors, unit tests of common components |

## 2. Where the skill and this product disagree (decisions, all marked)

| # | Conflict | Decision |
|---|---|---|
| 1 | Plus Jakarta Sans has **no Arabic glyphs**; the portal is bilingual by hard requirement | Latin: Plus Jakarta Sans 400/500 (self-hosted, weights 400 and 500 only). Arabic script: keep IBM Plex Sans Arabic 400/500 through the font stack. The two sit in one stack so mixed text works |
| 2 | Negative letter-spacing **breaks Arabic letter joining** | Tracking tokens apply under `:lang(en)` only; `[dir=rtl]` and `:lang(ar)` use `letter-spacing: 0`. Uppercase Label style does not exist in Arabic (no case): use the same size and weight, no transform |
| 3 | Skill is monochrome and says not to use it where a strong brand colour is needed | PSI brand files are still open (Programme KB 43.8), and navy/gold were already [Proposed] placeholders. Replace them with ink. One accent token set stays as the single place to introduce the real brand later [Proposed] |
| 4 | Skill has no dark theme | Derive one with the same two materials inverted (page `#0A0A0A`, raised `#1A1A1A -> #111`, selected = light material). Marked **derived**; light/dark switch stays |
| 5 | "No borders": input and card edges are 4% shadows. WCAG 1.4.11 needs 3:1 for the edge of a form field; the project has held to that since 17 Nov | Cards and tables follow the skill exactly. **Form fields only** get a stronger 1px shadow ring (`rgba(10,10,10,.45)`, about 3.4:1) on top of the well. Still a shadow, not a CSS border. Marked **derived, accessibility exception** |
| 6 | Skill: brand hues only on icon tiles and status tags, charts ink + grey (+ blue, amber up to four categories) | The six product hues stay as small categorical dots and icon tiles. Charts: hero series dark, others grey, up to four categories as the skill lists; beyond four, small multiples or a ranked list |
| 7 | Skill says destructive actions keep the dark button | Follow it: explicit verb on a dark pill, alert-icon circle above the title in `#D93A32` |
| 8 | Hover label "roll" on buttons duplicates the label | Only on plain-text button children; the duplicate is `aria-hidden`; disabled under reduced motion. Accessible names and tests must not change |
| 9 | Skill sidebar is light, 220px, dark active pill | Adopt. Our two groups (workspace, settings and reference) become Label-style group headings; nested items per the skill |
| 10 | Density | Comfortable (card padding 28, row 60, KPI 44) on Home, Overview, settings, forms. Dense (padding 20, row 44, KPI 32) on tables and operations pages (Signals, Fixes, Close the loop lists, Customers list, registers) [derived] |

## 3. Order of work

1. **Design system layer** (one engineer): self-host Plus Jakarta Sans; `theme.css` rewritten to the skill tokens (colours, radius ladder, shadows, gradients, motion, layout) mapped onto the shadcn variable names so every existing class keeps working; base typography (scale, tracking by language, tabular numbers, antialiasing, balance); material and well utilities; `:focus-visible` ring everywhere; dark theme (derived).
2. **Primitives** (same engineer): `components/ui/*` restyled in place, same props and exports: Button (primary, secondary, ghost, icon, destructive), Badge/Tag, Input, Textarea, Select, Checkbox/Switch, Tabs (segmented with sliding dark indicator on the spring), Table, Card, Dialog, Sheet (floating drawer), Dropdown, Popover, Tooltip, Toast, Progress, Skeleton, Command, Breadcrumb.
3. **Shell** (same engineer): framed variant above 1440px, light sidebar with dark active pill and sliding indicator, collapsible 56px rail with tooltips, 60px top bar (workspace/product switch, Data-as-of, search with key hint, language, theme, role/user menu), page header (title, meta, one primary action), skip link, mobile sheet.
4. **Shared product components** (same engineer): PageHeader, KpiTile (card, well, tag delta), SectionCard, DataTable (skill table, hover pill rows, sticky header, sorting, pagination, bulk bar), StatusBadge, Chip, StepStrip, NextBox, TraceId, AgentChip, DayChip, ProposedBadge, EmptyState (dot-grid well), ErrorState, LoadingState (skeletons), TermHelp, charts wrapper.
5. **Pages** (three engineers in parallel, by area, after the layer lands): Home and orientation, Customers and people, Actions and signals, Close the loop, Surveys and settings pages, Intelligent CX team, Login. Composition only: remove card repetition (use wells, dividers, one dark feature card per view at most), apply density mode, keep all text and logic.
6. **Browser QA** (one engineer + me): run the app, screenshot every route at >=1200, 810-1199 and <=809px, EN and AR, light and dark, compare to the skill screenshots and the quality checklist, fix; axe on every route, Lighthouse on Home and Signals, reduced motion check.

## 4. Gate for each step

`npm run check`, `npm run test:e2e` (188 + the new specs), no new axe violations, no `border` declarations except the table row divider (grep check), only weights 400/500, `:focus-visible` ring on every interactive element, RTL mirrored (indicator, chevrons, shadows are symmetric), Arabic tracking 0.

## 5. Constraints I am keeping

Titles not names; visibility rules; EN + AR strings untouched; sample data; the three page workstreams (A, B, C) own their page files until they report, so steps 1 to 4 start when they finish, and step 5 starts after step 4.
