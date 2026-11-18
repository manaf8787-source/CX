# CSS examples

Two stylesheets implement the system without any framework:

| File | Contents |
|---|---|
| `../tokens/tokens.css` | Custom properties generated from the JSON tokens |
| `meo-admin.css` | Base, type utilities, materials and every component class |

Both are reproduced below so this document is self-contained. Comments mark derived rules; everything else uses measured values. See `component-examples.md` for markup and `admin-demo.html` for a rendered page.

## Conventions

- **Tokens only.** Components reference `var(--…)`; no raw hex values except white and the two documented gradient stops.
- **Materials as classes.** `.m-light`, `.m-dark`, `.m-well` can be applied to any element; components bake them in.
- **Shadows replace borders.** The single `border-bottom` in the file is the table row divider.
- **State through ARIA.** Selected and current styles hang off `aria-current`, `aria-selected`, `aria-checked`, `aria-pressed`, `aria-invalid` so that the accessible state and the visual state cannot drift apart.
- **Focus.** `:focus-visible` adds `--ring-focus`; components with their own shadow append the ring to it.
- **Breakpoints.** `max-width: 1199.98px` and `max-width: 809.98px`, matching the reference.
- **Motion.** `--spring-css` stands in for the reference's spring; `prefers-reduced-motion` disables animation.

## Using the tokens in Tailwind (optional)

If the host project uses Tailwind, map the variables instead of copying values:

```js
// tailwind.config.js (v3) - extend only
export default {
  theme: { extend: {
    fontFamily: { sans: ["var(--font-sans)"] },
    colors: { surface: "var(--surface)", soft: "var(--surface-soft)", well: "var(--surface-well)",
              ink: { DEFAULT: "var(--ink)", charcoal: "var(--ink-charcoal)", secondary: "var(--ink-secondary)", tertiary: "var(--ink-tertiary)" },
              line: "var(--line)" },
    borderRadius: { field: "var(--r-md)", row: "var(--r-lg)", well: "var(--r-well)", pop: "var(--r-pop)", inner: "var(--r-inner)", card: "var(--r-card)", frame: "var(--r-frame)" },
    boxShadow: { hairline: "var(--shadow-hairline)", key: "var(--shadow-raised-light)", "key-dark": "var(--shadow-raised-dark)",
                 card: "var(--shadow-card)", pop: "var(--shadow-popover)", toast: "var(--shadow-toast)", well: "var(--shadow-inset-well)" },
    backgroundImage: { "key": "var(--grad-light)", "key-dark": "var(--grad-dark)" },
    transitionTimingFunction: { out: "var(--ease-out)" },
  } },
};
```

Do not use Tailwind's default `border`, `ring-blue-*`, `rounded-md` buttons or `shadow-md`: they produce exactly the generic look this system avoids.

## tokens.css

```css
/* Generated from the JSON token files in this folder. Measured from https://meo.framer.ai/ unless marked derived. */
:root {
  /* surfaces and ink */
  --surface: #FFFFFF;
  --surface-soft: #F6F6F6;
  --surface-well: #F2F2F2;
  --ink: #0A0A0A;
  --ink-graphite: #161616;
  --ink-charcoal: #3A3A3A;
  --ink-secondary: #6E6E6E;
  --ink-tertiary: #767676;
  --line: #ECECEC;
  --brand-green: #1F9D55;
  --brand-blue: #1F6FE0;
  --brand-violet: #7C3AED;
  --brand-amber: #F08A1C;
  /* effects */
  --fx-highlight: rgba(255, 255, 255, 0.28);
  --fx-glass: rgba(255, 255, 255, 0.62);
  --fx-tint: rgba(255, 255, 255, 0.07);
  --fx-inner-shade: rgba(0, 0, 0, 0.5);
  --fx-shadow-dark: rgba(0, 0, 0, 0.12);
  --fx-soft-shade: rgba(0, 0, 0, 0.04);
  /* gradients */
  --grad-light: linear-gradient(180deg, #FFFFFF 0%, #F6F6F6 100%);
  --grad-dark: linear-gradient(180deg, #3A3A3A 0%, #0A0A0A 100%);
  --grad-dark-button: linear-gradient(180deg, #3A3A3A 0%, #161616 55%, #0A0A0A 100%);
  --grad-dark-surface: radial-gradient(120% 80% at 50% 0%, #3A3A3A 0%, #161616 55%, #0A0A0A 100%);
  /* status - derived text and background shades */
  --status-success-solid: #1F9D55;
  --status-success-text: #157A40;
  --status-success-bg: #EAF6EF;
  --status-info-solid: #1F6FE0;
  --status-info-text: #1A5FC2;
  --status-info-bg: #EAF1FC;
  --status-warning-solid: #F08A1C;
  --status-warning-text: #A85A06;
  --status-warning-bg: #FDF1E3;
  --status-error-solid: #D93A32;
  --status-error-text: #B42A23;
  --status-error-bg: #FCEDEC;
  --status-accent-solid: #7C3AED;
  --status-accent-text: #6A2FD0;
  --status-accent-bg: #F1EBFD;
  /* type */
  --font-sans: "Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  /* radius */
  --r-xs: 4px;
  --r-sm: 5px;
  --r-md: 8px;
  --r-lg: 10px;
  --r-xl: 12px;
  --r-well: 14px;
  --r-icon: 15px;
  --r-pop: 16px;
  --r-inner: 18px;
  --r-panel: 20px;
  --r-card: 22px;
  --r-card-lg: 24px;
  --r-frame: 26px;
  --r-pill: 999px;
  /* shadows */
  --shadow-hairline: 0 0 0 1px rgba(0,0,0,0.04);
  --shadow-raised-light: inset 0 1px 1px #FFFFFF, inset 0 -1px 1px rgba(0,0,0,0.04), inset 0 0 1px 1px rgba(0,0,0,0.04), 0 1px 1px rgba(0,0,0,0.04), 0 3px 4px rgba(0,0,0,0.04);
  --shadow-raised-light-md: inset 0 1px 1px #FFFFFF, inset 0 -1px 1px rgba(0,0,0,0.04), inset 0 0 1px 1px rgba(0,0,0,0.04), 0 1px 1px rgba(0,0,0,0.04), 0 3px 4px rgba(0,0,0,0.04), 0 7px 10px rgba(0,0,0,0.04), 0 12px 18px rgba(0,0,0,0.04);
  --shadow-raised-dark: inset 0 1px 1px rgba(255,255,255,0.28), inset 0 -2px 3px rgba(0,0,0,0.5), 0 1px 1px rgba(0,0,0,0.12), 0 3px 5px rgba(0,0,0,0.12);
  --shadow-raised-dark-md: inset 0 1px 1px rgba(255,255,255,0.28), inset 0 -2px 3px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.12);
  --shadow-button-primary: inset 0 1px 1px rgba(255,255,255,0.28), inset 0 6px 8px -5px rgba(255,255,255,0.28), inset 0 -2px 3px rgba(0,0,0,0.5), 0 2px 3px rgba(0,0,0,0.12), 0 6px 10px rgba(0,0,0,0.12), 0 14px 22px rgba(0,0,0,0.12);
  --shadow-button-secondary: inset 0 1px 1px #FFFFFF, inset 0 -2px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.04), 0 2px 3px rgba(0,0,0,0.04), 0 6px 10px rgba(0,0,0,0.04), 0 14px 22px rgba(0,0,0,0.04);
  --shadow-card: inset 0 1px 1px #FFFFFF, 0 0 0 1px rgba(0,0,0,0.04), 0 3px 4px rgba(0,0,0,0.04), 0 7px 9px rgba(0,0,0,0.04), 0 12px 16px rgba(0,0,0,0.04), 0 30px 48px rgba(0,0,0,0.04);
  --shadow-card-frame: inset 0 1px 1px #FFFFFF, 0 0 0 1px rgba(0,0,0,0.04), 0 4px 6px rgba(0,0,0,0.04), 0 14px 26px rgba(0,0,0,0.04);
  --shadow-card-sm: inset 0 1px 1px #FFFFFF, 0 0 0 1px rgba(0,0,0,0.04), 0 4px 10px rgba(0,0,0,0.04);
  --shadow-window: inset 0 1px 1px #FFFFFF, 0 0 0 1px rgba(0,0,0,0.04), 0 4px 6px rgba(0,0,0,0.04), 0 14px 24px rgba(0,0,0,0.04), 0 34px 60px rgba(0,0,0,0.04);
  --shadow-popover: 0 0 0 1px rgba(0,0,0,0.04), 0 3px 4px rgba(0,0,0,0.04), 0 7px 9px rgba(0,0,0,0.04), 0 12px 16px rgba(0,0,0,0.04), 0 18px 24px rgba(0,0,0,0.04), 0 30px 48px rgba(0,0,0,0.04);
  --shadow-floating: inset 0 1px 1px #FFFFFF, inset 0 -1px 1px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.04), 0 2px 4px rgba(0,0,0,0.04), 0 8px 16px rgba(0,0,0,0.04), 0 18px 32px rgba(0,0,0,0.12);
  --shadow-toast: inset 0 1px 1px #FFFFFF, 0 0 0 1px rgba(0,0,0,0.04), 0 3px 4px rgba(0,0,0,0.04), 0 12px 16px rgba(0,0,0,0.04), 0 30px 48px rgba(0,0,0,0.08);
  --shadow-inset-well: inset 0 1px 2px rgba(0,0,0,0.04), inset 0 2px 5px -2px rgba(0,0,0,0.04), 0 1px 0 #FFFFFF;
  --shadow-inset-track: inset 0 1px 2px rgba(0,0,0,0.12), inset 0 2px 5px -2px rgba(0,0,0,0.04), 0 1px 0 #FFFFFF;
  --shadow-dot-off: inset 0 1px 1px #FFFFFF, inset 0 -2px 3px rgba(0,0,0,0.04), 0 1px 1px rgba(0,0,0,0.04);
  --shadow-glass: inset 0 1px 2px #FFFFFF, inset 0 0 2px rgba(255,255,255,0.28), inset 0 4px 8px -4px rgba(255,255,255,0.28), 0 6px 14px rgba(0,0,0,0.04);
  --shadow-glass-lg: inset 0 1px 2px #FFFFFF, inset 0 4px 8px -4px rgba(255,255,255,0.28), 0 4px 8px rgba(0,0,0,0.04), 0 18px 36px rgba(0,0,0,0.12);
  --shadow-surface-dark: inset 0 1px 1px rgba(255,255,255,0.28), inset 0 10px 20px -12px rgba(255,255,255,0.28), 0 4px 6px rgba(0,0,0,0.04), 0 14px 24px rgba(0,0,0,0.12), 0 30px 50px rgba(0,0,0,0.12);
  --shadow-app-icon: inset 0 1px 1px rgba(255,255,255,0.28), inset 0 6px 8px -4px rgba(255,255,255,0.28), inset 0 -4px 8px -2px rgba(0,0,0,0.12), 0 2px 3px rgba(0,0,0,0.04), 0 6px 10px rgba(0,0,0,0.04), 0 12px 18px rgba(0,0,0,0.04);
  --shadow-badge-light: inset 0 1px 1px #FFFFFF, 0 0 0 1px rgba(0,0,0,0.04), 0 2px 4px rgba(0,0,0,0.04);
  --shadow-badge-dark: inset 0 1px 1px rgba(255,255,255,0.28), 0 0 0 1px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.12);
  --ring-avatar: 0 0 0 2px #FFFFFF;
  --ring-photo: 0 0 0 3px #FFFFFF, 0 4px 10px rgba(0,0,0,0.04);
  --ring-selected: 0 0 0 1.5px #0A0A0A;
  --ring-focus: 0 0 0 2px #FFFFFF, 0 0 0 4px #0A0A0A;  /* derived */
  /* motion */
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in-out: cubic-bezier(0.45, 0, 0.55, 1);
  --spring-css: 400ms cubic-bezier(0.34, 1.3, 0.64, 1);  /* CSS stand-in for spring(duration .4, bounce .2); estimated */
  /* layout */
  --sidebar-w: 220px;
  --topbar-h: 60px;
  --control-h: 36px;
  --row-h: 60px;
  --page-x: 72px;
}
@media (max-width: 1199.98px) { :root { --page-x: 40px; } }
@media (max-width: 809.98px) { :root { --page-x: 20px; } }
```

## meo-admin.css

```css
/* Meo-style admin component CSS. Requires ../tokens/tokens.css.
   Values are measured from the reference unless a comment says "derived". */

/* ---------- base ---------- */
*, *::before, *::after { box-sizing: border-box; }
body {
  margin: 0; background: var(--surface); color: var(--ink-secondary);
  font: 400 14px/1.5 var(--font-sans); letter-spacing: -0.01em;
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3, h4, p { margin: 0; }
button { font: inherit; letter-spacing: inherit; color: inherit; border: 0; background: none; cursor: pointer; }
:focus-visible { outline: none; box-shadow: var(--ring-focus); }            /* derived */

/* ---------- type ---------- */
.t-page-title   { font-size: 24px; font-weight: 500; letter-spacing: -0.03em; line-height: 1.2; color: var(--ink); }
.t-card-title   { font-size: 22px; font-weight: 500; letter-spacing: -0.035em; line-height: 1.1; color: var(--ink); }
.t-h4           { font-size: 17px; font-weight: 500; letter-spacing: -0.02em; line-height: 1.3; color: var(--ink); }
.t-kpi          { font-size: 44px; font-weight: 500; letter-spacing: -0.05em; line-height: 1; color: var(--ink); font-variant-numeric: tabular-nums; }
.t-unit         { font-size: 24px; font-weight: 500; letter-spacing: -0.03em; line-height: 1.2; color: var(--ink-tertiary); }
.t-body-m       { font-size: 15px; line-height: 1.5; }
.t-ui-strong    { font-size: 14px; font-weight: 500; line-height: 1.3; color: var(--ink); }
.t-body-s       { font-size: 13px; letter-spacing: -0.005em; line-height: 1.45; }
.t-small-strong { font-size: 13px; font-weight: 500; line-height: 1.3; color: var(--ink); }
.t-label        { font-size: 12px; font-weight: 500; letter-spacing: 0.04em; line-height: 1.2; text-transform: uppercase; color: var(--ink-charcoal); }
.t-caption      { font-size: 11px; letter-spacing: 0; line-height: 1.35; }
.t-muted        { color: var(--ink-tertiary); }
.on-well .t-muted, .sidebar .t-muted { color: var(--ink-secondary); }        /* contrast fix, derived */

/* ---------- materials ---------- */
.m-light { background: var(--grad-light); box-shadow: var(--shadow-raised-light); color: var(--ink); }
.m-dark  { background: var(--grad-dark);  box-shadow: var(--shadow-raised-dark);  color: #fff; }
.m-well  { background: var(--surface-well); border-radius: var(--r-well); }

/* ---------- button ---------- */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 9px;
  height: 40px; padding: 4px 22px 6px; border-radius: var(--r-pill);
  font-size: 15px; font-weight: 500; line-height: 18px; white-space: nowrap; text-decoration: none;
}
.btn--primary   { background: var(--grad-dark-button); box-shadow: var(--shadow-button-primary); color: #fff; }
.btn--secondary { background: var(--grad-light); box-shadow: var(--shadow-button-secondary); color: var(--ink); }
.btn--ghost     { padding: 4px 14px 6px; color: var(--ink); }
.btn--sm { height: 36px; padding: 4px 14px 6px; gap: 6px; font-size: 13px; }
.btn--lg { height: 46px; }
.btn--xl { height: 50px; }
.btn--block { width: 100%; }
.btn svg { width: 16px; height: 16px; flex: none; }
.btn--sm svg { width: 14px; height: 14px; }
/* label roll */
.btn__mask { display: flex; flex-direction: column; height: 18px; overflow: clip; }
.btn__mask > span { flex: none; height: 18px; transition: transform var(--spring-css); }
.btn:hover .btn__mask > span, .btn:focus-visible .btn__mask > span { transform: translateY(-18px); }
.btn:focus-visible.btn--primary   { box-shadow: var(--shadow-button-primary), var(--ring-focus); }
.btn:focus-visible.btn--secondary { box-shadow: var(--shadow-button-secondary), var(--ring-focus); }
.btn:active { transform: translateY(1px); }                                  /* derived */
.btn[disabled], .btn[aria-disabled="true"] { opacity: .4; box-shadow: none; cursor: not-allowed; }  /* derived */

.icon-btn { display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: var(--r-pill);
            background: var(--grad-light); box-shadow: var(--shadow-raised-light); color: var(--ink); }
.icon-btn[aria-pressed="true"], .icon-btn.is-on { background: var(--grad-dark); box-shadow: var(--shadow-raised-dark); color: #fff; }
.icon-btn svg { width: 11px; height: 11px; }
.icon-btn--md { width: 36px; height: 36px; } .icon-btn--md svg { width: 16px; height: 16px; }

/* ---------- pills, tags, badges, chips ---------- */
.pill { display: inline-flex; align-items: center; gap: 7px; height: 30px; padding: 4px 14px 6px 12px; border-radius: var(--r-pill);
        background: var(--grad-light); box-shadow: var(--shadow-raised-light-md); }
.pill svg { width: 14px; height: 14px; color: var(--ink); }
.tag { display: inline-flex; align-items: center; gap: 6px; height: 24px; padding: 3px 10px 5px; border-radius: var(--r-pill);
       font-size: 13px; font-weight: 500; line-height: 16px; color: var(--ink-charcoal);
       background: var(--grad-light); box-shadow: var(--shadow-raised-light); }
.tag--dark { background: var(--grad-dark); box-shadow: var(--shadow-raised-dark); color: #fff; }
.tag--success { background: var(--status-success-bg); color: var(--status-success-text); box-shadow: none; }  /* derived */
.tag--warning { background: var(--status-warning-bg); color: var(--status-warning-text); box-shadow: none; }  /* derived */
.tag--error   { background: var(--status-error-bg);   color: var(--status-error-text);   box-shadow: none; }  /* derived */
.tag--info    { background: var(--status-info-bg);    color: var(--status-info-text);    box-shadow: none; }  /* derived */
.badge { display: inline-flex; align-items: center; gap: 5px; height: 24px; padding: 4px 10px 6px; border-radius: var(--r-pill);
         font-size: 11px; font-weight: 500; letter-spacing: 0.02em; line-height: 13px; color: var(--ink);
         background: linear-gradient(180deg, #fff, #ECECEC); box-shadow: var(--shadow-badge-light); }
.badge--dark { background: var(--grad-dark); box-shadow: var(--shadow-badge-dark); color: #fff; }
.chip { display: inline-flex; align-items: center; gap: 8px; height: 30px; padding: 4px 12px 4px 5px; border-radius: var(--r-pill);
        background: var(--surface-well); font-size: 13px; font-weight: 500; color: var(--ink); }
.chip__check { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%;
               background: var(--grad-dark); box-shadow: var(--shadow-raised-dark); color: #fff; }
.chip__check svg { width: 12px; height: 12px; }

.status { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; white-space: nowrap; }
.dot { width: 6px; height: 6px; border-radius: 50%; background: var(--ink-tertiary); flex: none; }
.dot--live { background: var(--ink); animation: meo-pulse .9s var(--ease-in-out) infinite alternate; }
.dot--success { background: var(--brand-green); } .dot--warning { background: var(--brand-amber); }
.dot--error { background: var(--status-error-solid); } .dot--info { background: var(--brand-blue); }
@keyframes meo-pulse { to { opacity: .3; } }

.avatar { width: 30px; height: 30px; border-radius: 50%; object-fit: cover; background: var(--line); }
.avatar--ring { box-shadow: var(--ring-avatar); }

/* ---------- segmented control ---------- */
.seg { display: inline-flex; gap: 2px; padding: 3px; border-radius: var(--r-pill);
       background: var(--surface-well); box-shadow: var(--shadow-inset-well); }
.seg__item { height: 29px; padding: 5px 13px 7px; border-radius: var(--r-pill);
             font-size: 13px; font-weight: 500; line-height: 17px; color: var(--ink-secondary);
             transition: color 200ms var(--ease-out); }
.seg__item:hover { color: var(--ink); }
.seg__item[aria-selected="true"], .seg__item[aria-checked="true"] {
  background: var(--grad-dark); box-shadow: var(--shadow-raised-dark); color: #fff; }
.seg--page { background: var(--surface); padding: 4px; box-shadow: var(--shadow-card-sm); }
.seg--page .seg__item { height: 40px; padding: 6px 16px 8px; font-size: 14px; line-height: 26px; }

/* ---------- inputs ---------- */
.field { display: grid; gap: 6px; }
.field__label { font-size: 13px; font-weight: 500; color: var(--ink); }
.field__help  { font-size: 13px; color: var(--ink-tertiary); }
.input { display: flex; align-items: center; gap: 7px; height: 36px; padding: 0 12px; border-radius: var(--r-md);
         background: var(--surface-well); box-shadow: var(--shadow-inset-well); color: var(--ink); }
.input svg { width: 14px; height: 14px; color: var(--ink-secondary); flex: none; }
.input input { flex: 1; min-width: 0; border: 0; outline: 0; background: none; font: inherit; font-size: 13px; letter-spacing: inherit; color: var(--ink); }
.input input::placeholder { color: var(--ink-tertiary); }
.input--form { height: 40px; } .input--form input { font-size: 14px; }       /* derived */
.input:focus-within { background: #fff; box-shadow: var(--ring-selected); }  /* derived */
.input[aria-invalid="true"] { box-shadow: 0 0 0 1.5px var(--status-error-solid); }  /* derived */
.field__error { font-size: 13px; color: var(--status-error-text); }           /* derived */

.check { appearance: none; width: 16px; height: 16px; margin: 0; border-radius: var(--r-xs); flex: none; cursor: pointer;
         background: var(--grad-light); box-shadow: var(--shadow-raised-light); display: inline-grid; place-items: center; }
.check:checked { background: var(--grad-dark); box-shadow: var(--shadow-raised-dark); }
.check:checked::after { content: ""; width: 8px; height: 4px; margin-top: -2px; border-left: 2px solid #fff; border-bottom: 2px solid #fff; transform: rotate(-45deg); }
.check:focus-visible { box-shadow: var(--shadow-raised-light), var(--ring-focus); }

.switch { appearance: none; width: 36px; height: 20px; margin: 0; border-radius: var(--r-pill); position: relative; cursor: pointer;
          background: var(--line); box-shadow: var(--shadow-inset-track); }                      /* derived */
.switch::after { content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%;
                 background: var(--grad-light); box-shadow: var(--shadow-raised-light); transition: transform var(--spring-css); }
.switch:checked { background: var(--grad-dark); box-shadow: var(--shadow-raised-dark); }
.switch:checked::after { transform: translateX(16px); }

/* ---------- card + well ---------- */
.card { background: var(--surface); border-radius: var(--r-card); box-shadow: var(--shadow-card); padding: 28px;
        display: flex; flex-direction: column; gap: 26px; }
.card--dense { padding: 20px; border-radius: var(--r-inner); gap: 16px; }      /* derived */
.card--dark { background: var(--grad-dark-surface); box-shadow: var(--shadow-surface-dark); color: #fff; }
.card--dark .t-card-title, .card--dark .t-kpi, .card--dark .t-small-strong { color: #fff; }
.card--dark .t-muted, .card--dark .t-body-s { color: var(--fx-glass); }
.card--dark .chip { background: var(--fx-tint); box-shadow: inset 0 1px 1px rgba(255,255,255,.07); color: #fff; }
.well { background: var(--surface-well); border-radius: var(--r-well); padding: 22px; display: flex; flex-direction: column; gap: 16px; }
.frame { background: var(--surface); border-radius: var(--r-frame); padding: 10px; box-shadow: var(--shadow-window); }
.frame__inner { border-radius: var(--r-pop); box-shadow: var(--shadow-hairline); overflow: clip; background: var(--surface); }

/* ---------- progress ---------- */
.bar { height: 12px; border-radius: var(--r-pill); background: var(--line); box-shadow: var(--shadow-inset-track); overflow: clip; }
.bar__fill { height: 100%; border-radius: inherit; background: var(--grad-dark); box-shadow: var(--shadow-raised-dark); }
.bar__fill--muted { background: linear-gradient(180deg, #ECECEC, #767676); box-shadow: inset 0 1px 1px #fff, 0 1px 1px rgba(0,0,0,.04); opacity: .62; }
.meter { height: 4px; border-radius: 4px; background: var(--line); overflow: clip; }
.meter > i { display: block; height: 100%; border-radius: inherit; background: var(--ink-graphite); }

/* ---------- shell ---------- */
.shell { display: grid; grid-template-columns: var(--sidebar-w) minmax(0, 1fr); min-height: 100vh; }
.sidebar { background: var(--surface-soft); padding: 14px 10px; display: flex; flex-direction: column; gap: 4px; }
.sidebar__brand { display: flex; align-items: center; gap: 7px; padding: 4px 8px 14px; }
.sidebar__group { padding: 14px 10px 6px; color: var(--ink-secondary); }       /* derived */
.nav-item { display: flex; align-items: center; gap: 8px; height: 36px; padding: 0 10px; border-radius: var(--r-md);
            font-size: 13px; font-weight: 500; color: var(--ink-secondary); text-decoration: none; }
.nav-item svg { width: 16px; height: 16px; flex: none; }
.nav-item__count { margin-left: auto; font-weight: 400; }
.nav-item:hover { background: rgba(0,0,0,.04); color: var(--ink); }           /* derived */
.nav-item[aria-current="page"] { background: var(--grad-dark); box-shadow: var(--shadow-raised-dark); color: #fff; }
.sidebar__spacer { flex: 1; }
.plan { padding: 10px; border-radius: var(--r-lg); background: var(--grad-light); box-shadow: var(--shadow-raised-light);
        display: flex; flex-direction: column; gap: 2px; }
.plan .meter { margin-top: 8px; }

.topbar { height: var(--topbar-h); padding: 0 18px; display: flex; align-items: center; gap: 10px; }
.topbar__spacer { flex: 1; }
.workspace { display: flex; align-items: center; gap: 8px; }
.toolbar { padding: 12px 16px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.toolbar__spacer { flex: 1; }
.page { padding: 8px 24px 32px; display: flex; flex-direction: column; gap: 16px; }
.page__head { display: flex; align-items: flex-end; flex-wrap: wrap; gap: 8px; padding: 8px 0; }
.grid-kpi { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }

/* ---------- table ---------- */
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table td:has(> .cell-2) { max-width: 0; width: 40%; }   /* lets the identity cell truncate instead of forcing overflow */
.table th { height: 41px; padding: 11px 10px; text-align: left; font-weight: 400; color: var(--ink-tertiary); white-space: nowrap; }
.table td { padding: 11px 10px; vertical-align: middle; color: var(--ink-secondary); }
.table tbody tr { position: relative; height: var(--row-h); }
.table tbody tr::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; border-bottom: 1px solid var(--line); }
.table tbody tr:last-child::after { display: none; }
.table tbody tr:hover td { background: var(--surface-soft); }                  /* derived */
.table tbody tr[aria-selected="true"] td { background: var(--surface-well); }  /* derived */
.table .num { text-align: right; font-variant-numeric: tabular-nums; color: var(--ink); font-weight: 500; }
.table--dense tbody tr { height: 44px; }                                       /* derived */
.cell-2 { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.cell-2 > * { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cell-tags { display: flex; gap: 6px; }

/* ---------- overlays ---------- */
.menu { width: 300px; padding: 6px; border-radius: var(--r-pop); background: var(--surface); box-shadow: var(--shadow-popover); }
.menu__row { display: flex; gap: 12px; padding: 10px; border-radius: var(--r-lg); text-decoration: none; }
.menu__row:hover, .menu__row:focus-visible { background: var(--surface-well); }
.menu__row svg { width: 20px; height: 20px; color: var(--ink-secondary); flex: none; }
.menu__row--compact { align-items: center; height: 36px; padding: 0 10px; gap: 8px; font-size: 13px; font-weight: 500; color: var(--ink); } /* derived */
.toast { width: 360px; padding: 18px 20px; border-radius: var(--r-panel); background: var(--surface); box-shadow: var(--shadow-toast);
         transition: opacity .6s var(--ease-out), transform .6s var(--ease-out); }
.tooltip { padding: 5px 9px 6px; border-radius: var(--r-md); background: var(--grad-dark); box-shadow: var(--shadow-raised-dark);
           font-size: 12px; font-weight: 500; color: #fff; }                   /* derived */
.dialog { width: min(480px, calc(100vw - 32px)); padding: 28px; border-radius: var(--r-card); background: var(--surface);
          box-shadow: var(--shadow-toast); display: grid; gap: 16px; }         /* derived */
.scrim { position: fixed; inset: 0; background: rgba(0,0,0,.32); display: grid; place-items: center; }  /* derived */

/* ---------- responsive ---------- */
@media (max-width: 1199.98px) {
  .shell { grid-template-columns: minmax(0, 1fr); } .sidebar { display: none; }
  .grid-kpi { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .col-secondary { display: none; }
}
@media (max-width: 809.98px) {
  .grid-kpi { grid-template-columns: minmax(0, 1fr); }
  .page { padding: 8px 20px 24px; } .card { padding: 20px; }
  .col-tertiary, .col-select { display: none; }
  .table th, .table td { padding: 11px 6px; }
  .table td:has(> .cell-2) { width: 55%; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition-duration: .01ms !important; }
}
```
