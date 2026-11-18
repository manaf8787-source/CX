# Admin layout example

A complete overview screen built with this system. The runnable version is `admin-demo.html` (open it in a browser; it loads `../tokens/tokens.css`, `meo-admin.css` and Plus Jakarta Sans from Google Fonts). Rendered captures are in `../assets/screenshots/18-derived-admin-demo-desktop.png` and `19-derived-admin-demo-phone.png`. The product name and data in the demo are invented.

## Structure

```
.shell (grid: 220px | 1fr)
├── nav.sidebar                     #F6F6F6, pad 14 10, gap 4
│   ├── .sidebar__brand             mark + 17/500 name
│   ├── a.nav-item[aria-current]    36px, r8, dark gradient when current
│   ├── a.nav-item …                icon 16 / label 13 / count right
│   ├── .sidebar__group.t-label     group heading (derived)
│   ├── .sidebar__spacer
│   └── .plan                       usage card, r10, 4px meter
└── div
    ├── header.topbar               60px, pad 0 18
    │   ├── .workspace              avatar 30 + name 14/500 + meta 13/400
    │   ├── .status                 sync icon + text
    │   └── .icon-btn--md           notifications
    └── main.page                   pad 8 24 32, gap 16
        ├── .page__head             H1 24/500 + description, actions right (36px pills)
        ├── section.grid-kpi        4 columns, gap 16
        │   └── article.card.card--dense × 4   (one may be .card--dark)
        └── section.card            pad 0 16 8
            ├── .toolbar            segmented filter … search field
            └── table.table         header 41, rows 60, hairline dividers
```

## Shell CSS (from `meo-admin.css`)

```css
.shell   { display: grid; grid-template-columns: var(--sidebar-w) minmax(0, 1fr); min-height: 100vh; }
.sidebar { background: var(--surface-soft); padding: 14px 10px; display: flex; flex-direction: column; gap: 4px; }
.topbar  { height: var(--topbar-h); padding: 0 18px; display: flex; align-items: center; gap: 10px; }
.page    { padding: 8px 24px 32px; display: flex; flex-direction: column; gap: 16px; }
.grid-kpi{ display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }

@media (max-width: 1199.98px) {           /* tablet: sidebar leaves, KPIs 2-up, secondary columns drop */
  .shell { grid-template-columns: minmax(0, 1fr); } .sidebar { display: none; }
  .grid-kpi { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .col-secondary { display: none; }
}
@media (max-width: 809.98px) {            /* phone: KPIs 1-up, tertiary columns drop */
  .grid-kpi { grid-template-columns: minmax(0, 1fr); }
  .col-tertiary, .col-select { display: none; }
}
```

## Framed variant (wide screens)

Mirrors the reference's hero app window: the whole app sits inside a double frame on a soft page.

```html
<body style="background:var(--surface-soft);padding:22px">
  <div class="frame" style="max-width:1440px;margin:0 auto">
    <div class="frame__inner">
      <div class="shell" style="min-height:calc(100vh - 64px)"> … </div>
    </div>
  </div>
</body>
```

## Collapsed sidebar (derived)

```css
.shell[data-collapsed="true"] { grid-template-columns: 56px minmax(0, 1fr); }
.shell { transition: grid-template-columns var(--spring-css); }
.shell[data-collapsed="true"] .nav-item { justify-content: center; padding: 0; font-size: 0; }      /* hide labels */
.shell[data-collapsed="true"] .nav-item__count,
.shell[data-collapsed="true"] .sidebar__group,
.shell[data-collapsed="true"] .plan { display: none; }
```
Give each collapsed item a tooltip (`.tooltip`) and keep its accessible name.

## What makes this screen "on system"

| Decision | Source |
|---|---|
| Sidebar tone, item size, dark current item, usage card | Measured (hero app mock) |
| Top bar with avatar + two-line workspace and sync status | Measured |
| Segmented filter with counts, inset search, light and dark pill actions | Measured |
| Table header, 60px two-line rows, hairline dividers, tags, dot statuses, round row action | Measured |
| Well with bar comparison and cell meter inside cards | Measured (bento cards) |
| Large number with smaller unit; one dark card with a light badge and tint chips | Measured (stats, featured pricing tier) |
| KPI card arrangement, dense card padding, row hover and selected fills, coloured status tag and dot, notification button, group label | Derived |

## Checks performed on the demo

- Rendered at 1440px and 390px in Chrome; the font loads and controls measure 36px.
- No `border` is used except the row divider.
- On phones the table drops the select, tags and note columns. For real products, switch to two-line list rows below 810px (see `../references/responsive-design.md`); the demo keeps a table for brevity and truncates the identity cell.
