# Reference assets

What was captured from the reference, what was deliberately not copied, and how to substitute.

## Screenshots (`screenshots/`)

Captured 2026-11-18 from live pages in Chrome. Files 01-11 and 15-17 are half-scale captures of a 1912px-wide viewport, so they are suitable for layout and tone reference, not for pixel measurement (measurements in this skill come from computed styles, not from these images). Files 12-14 were captured from the page rendered in 1000px and 390px frames.

| File | Shows |
|---|---|
| `01-home-hero-desktop.jpg` | Nav, hero copy, buttons, top of the app window |
| `02-home-app-mock-and-logo-rail.jpg` | App mock: sidebar, toolbar, table, plan card; logo rail |
| `03-home-use-cases.jpg` | Framed photo cards with glass notes and colour icon tiles |
| `04-home-why-bento.jpg` | Bento cards: wells with bars, dot grid, check pills, cells, compare chips |
| `05-home-feature-tabs.jpg` | Large tab bar with sliding indicator, text card, photo with glass panel |
| `06-home-reviews.jpg` | Floating quote bubbles around the section heading |
| `07-home-pricing.jpg` | Billing toggle, three light tiers, dark featured tier |
| `08-home-faq.jpg` | Accordion with dark round toggles |
| `09-home-footer.jpg` | Dark brand card, link card, faded wordmark |
| `10-style-guide-colors.jpg` | Style guide header and colour swatches |
| `11-terms-toc-and-document.jpg` | Sticky side nav with dark indicator, document card |
| `12-tablet-1000px-hero.png` | Tablet nav with menu button; app mock without sidebar |
| `13-phone-390px-hero.png` | Phone hero with stacked full-width buttons |
| `14-phone-menu-open.png` | Full-screen phone menu |
| `15-nav-dropdown-open.png` | Hover dropdown with icon rows |
| `16-nav-dropdown-row-hover.png` | Dropdown row hover fill |
| `17-nav-link-hover.png` | Nav link hover (opacity) |
| `18-derived-admin-demo-desktop.png` | **Not the reference.** `examples/admin-demo.html` rendered at 1440px |
| `19-derived-admin-demo-phone.png` | **Not the reference.** The same demo at 390px |

The screenshots show the reference's brand, photos and copy for study only. Do not ship them or reproduce their content.

## Assets not copied

No icons, illustrations, fonts, photos or logos were downloaded from the reference, so this skill has no `icons/` or `illustrations/` folder.

| Asset on the reference | Why not copied | Use instead |
|---|---|---|
| Meo logo mark and wordmark | Brand identity of the template | Your own mark; keep the pattern "20-26px mark + 17-21px medium wordmark, gap 7-9px" |
| 30 inline UI icons | Embedded without licence information; geometry matches Lucide (inferred) | `lucide-react` / `lucide` at the stroke widths in `../references/iconography.md` |
| Social brand glyphs | Third-party trademarks | Official brand assets if needed |
| Landscape photos (valley, forest, mountain, waterfall) | Licence unknown | Your own or licensed calm landscape photography; apply the same treatment (cover, radius 18-22, white fade, optional glass note) |
| Portrait avatars | Licence unknown; real-looking people | Product users' avatars, or initials on `#ECECEC` circles |
| Hero line art, featured-card dot pattern | Decorative SVGs belonging to the template | Recreate: thin 1px `#ECECEC` lines with a radial mask; a 2px-dot grid at 10% white with a linear mask |
| Fictional customer logos | Template content | Real customer logos in ink at 30% opacity |
| Plus Jakarta Sans | Not redistributed here | Google Fonts or `@fontsource/plus-jakarta-sans` (SIL Open Font License) |

## Asset inventory observed (for reference)

| Type | Count on home | Notes |
|---|---|---|
| Inline SVG icons | 30 unique | 24 grid, outline, round caps |
| Masked brand glyphs | 4 social + Framer badge | 16px, filled, CSS-masked |
| Photos | 3 card photos (316x222), 4 feature photos (660x400) | JPEG/WebP, `object-fit: cover` |
| Avatars | 1 workspace, 3 team, 6 reviewers, 1 creator | 24-40px |
| Decorative SVG images | Hero lines (1360x760), featured-card dots (600x900) | Applied as backgrounds with masks |
| Logo files | 2 SVG files of the mark (used at 20, 26 and 32px) | |
