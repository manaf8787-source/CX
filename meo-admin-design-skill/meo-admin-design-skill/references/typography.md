# Typography

Source of truth: `../tokens/typography.json`. Values were read from the site's text-style presets at each breakpoint.

## Family

- **Plus Jakarta Sans** for everything (display, body, numerals, UI). Geometric sans with a slightly wide stance and round terminals.
- Source: Google Fonts (Framer serves it from its third-party asset CDN). In your project: `@fontsource-variable/plus-jakarta-sans`, `next/font/google`, or a Google Fonts `<link>`.
- Weights in use: **400** (sentences), **500** (titles, labels, values), **600** (wordmark and customer-logo text only). 700 is declared only as the "bold" fallback and never appears.
- No italics in the design.
- OpenType: presets request `"blwf", "cv03", "cv04", "cv09", "cv11"`. These are harmless if unsupported; keep the family's default numerals.
- Rendering: `-webkit-font-smoothing: antialiased`; headings use `text-wrap: balance` and are centred on marketing pages.
- Fallback stack: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`.

## Scale (measured)

| Style (style-guide name) | Desktop | Tablet | Phone | Weight | Tracking | Line height | Colour | Seen on |
|---|---|---|---|---|---|---|---|---|
| Display | 72 | 56 | 40 | 500 | -0.045em | 1.08 | `#0A0A0A` | H1 |
| Heading 2 | 52 | 42 | 32 | 500 | -0.035em | 1.08 | `#0A0A0A` | Section titles |
| Stat number | 56 | 56 | 56 | 500 | -0.05em | 1.0 | `#0A0A0A` | "11.5", "0.8" |
| Price | 44 | 44 | 44 | 500 | -0.05em | 1.0 | `#0A0A0A` | "$24" |
| Heading 3 | 24 | 22 | 20 | 500 | -0.03em | 1.2 | `#0A0A0A` | Card titles, stat unit, document H2 |
| Card Title | 22 | 22 | 22 | 500 | -0.035em | 1.1 | `#0A0A0A` | Bento titles |
| Logo text | 21 | 21 | 21 | 500 | -0.04em | 1.2 | `#0A0A0A` | Wordmark |
| Heading 4 | 17 | 17 | 17 | 500 | -0.02em | 1.3 | `#0A0A0A` | FAQ question, tier name, sidebar brand |
| Body L | 18 | 17 | 16 | 400 | -0.01em | 1.5 | `#6E6E6E` | Section intro |
| Body Long | 16 | 16 | 16 | 400 | -0.01em | 1.7 | `#6E6E6E` | Document paragraphs |
| Body M | 15 | 15 | 15 | 400 | -0.01em | 1.5 | `#6E6E6E` | Card descriptions |
| Button label | 15 | 15 | 15 | 500 | -0.01em | 1.2 | inherits | Buttons |
| Name | 14 | 14 | 14 | 500 | -0.01em | 1.5 | `#0A0A0A` | Person name |
| App text strong | 14 | 14 | 14 | 500 | -0.01em | 1.3 | `#0A0A0A` | Table primary cell |
| Quote | 14 | 14 | 14 | 400 | -0.01em | 1.5 | `#0A0A0A` | Review text |
| Nav link | 14 | 14 | 14 | 400 | -0.01em | 1.2 | `#6E6E6E` (links render as ink at 60% opacity) | Nav, footer links |
| Body S | 13 | 13 | 13 | 400 | -0.005em | 1.45 | `#6E6E6E` | App secondary text |
| Small Strong | 13 | 13 | 13 | 500 | -0.01em | 1.3 | `#0A0A0A` | Chips, tags, sidebar items |
| Label | 12 | 12 | 12 | 500 | +0.04em | 1.2 | `#3A3A3A`, uppercase | Eyebrow |
| Meta | 12 | 12 | 12 | 400 | 0 | 1.5 | `#767676` | Role under name |
| Badge | 11 | 11 | 12 | 500 | +0.02em | 1.2 | `#0A0A0A` | Badges |
| Caption | 11 | 11 | 12 | 400 | 0 | 1.35 | `#6E6E6E` | Footnotes |

Other measured instances: customer-logo text 22/600 (-0.04em) and 19/400 uppercase (+0.08em); footer wordmark 420 / 243 / 120 at weight 600, -0.07em, line-height 0.8; table header 13/400 `#767676`; price suffix 14/400 `#767676`; document lead 18/400 `#3A3A3A`.

## Mapping to requested levels

| Level | Use this style | Note |
|---|---|---|
| Display | Display | Marketing only |
| H1 | Heading 2 (52) on landing pages; **Heading 3 (24) for admin page titles** | |
| H2 | Heading 3 (24) | |
| H3 | Card Title (22) | |
| H4 | Heading 4 (17) | |
| H5 | App text strong (14/500) | derived mapping |
| H6 | Small Strong (13/500) | derived mapping |
| Body Large / Medium / Small | Body L / Body M / Body S | |
| Caption | Caption (11-12) | |
| Label, Overline | Label (12/500 uppercase +0.04em) | |
| Button | 15/500 (13/500 in 36px toolbar buttons) | |
| Navigation | 14/400 top nav; 13/500 sidebar | |
| Table header | 13/400 `#767676`, sentence case | |
| Table cell | 14/500 primary line; 13/400 secondary and other cells | |
| Statistic | 56/500 -0.05em with 24/500 unit | |
| Numeric value | Price 44/500 -0.05em | add `tabular-nums` in tables (derived) |

## How the type creates the personality

- **Medium, not bold.** Emphasis at 500 keeps the page light; hierarchy is done with size and tone.
- **Tracking scales with size.** 14-18px: -0.01em. 17px headings: -0.02em. 22-24px: -0.03 to -0.035em. 44-72px: -0.045 to -0.05em. Small caps-style labels reverse it (+0.02 to +0.04em). Large text feels engineered; small text stays readable.
- **Tight leading on display (1.0-1.08), relaxed on prose (1.5-1.7).**
- **Short measures.** Intros wrap at ~540px (about 55-60 characters).
- **Numbers are heroes.** Stats use the largest non-heading size with a smaller, same-weight unit set beside them on the baseline with a 4px gap.
- **Uppercase is rare** and always small, medium, widely tracked, in charcoal, inside a pill.

## Rules

- Never use weights above 500 in UI. Never italicise.
- Never set body text in ink; prose is `#6E6E6E`. Ink is for names, values and headings.
- Pair a 500 line with a 400 line one or two sizes smaller (14/500 + 13/400; 13/500 + 11/400) with a 1-2px gap.
- Button and pill labels sit in an 18px line box (line-height 1.2 at 15px).
- In admin, do not go below 12px for anything a user must read; 11px is for badges and chart footnotes only.

## CSS

```css
body { font-family: var(--font-sans); font-size: 14px; line-height: 1.5; letter-spacing: -0.01em;
       color: var(--ink-secondary); -webkit-font-smoothing: antialiased; }
h1, h2, h3, h4 { color: var(--ink); font-weight: 500; text-wrap: balance; margin: 0; }
.t-page-title { font-size: 24px; letter-spacing: -0.03em; line-height: 1.2; }
.t-card-title { font-size: 22px; letter-spacing: -0.035em; line-height: 1.1; }
.t-h4         { font-size: 17px; letter-spacing: -0.02em; line-height: 1.3; }
.t-kpi        { font-size: 44px; letter-spacing: -0.05em; line-height: 1; font-weight: 500; color: var(--ink);
                font-variant-numeric: tabular-nums; }
.t-body-m     { font-size: 15px; line-height: 1.5; }
.t-ui-strong  { font-size: 14px; font-weight: 500; line-height: 1.3; color: var(--ink); }
.t-body-s     { font-size: 13px; letter-spacing: -0.005em; line-height: 1.45; }
.t-small-strong { font-size: 13px; font-weight: 500; line-height: 1.3; color: var(--ink); }
.t-label      { font-size: 12px; font-weight: 500; letter-spacing: 0.04em; line-height: 1.2;
                text-transform: uppercase; color: var(--ink-charcoal); }
.t-badge      { font-size: 11px; font-weight: 500; letter-spacing: 0.02em; line-height: 1.2; }
.t-caption    { font-size: 11px; line-height: 1.35; letter-spacing: 0; }
```
