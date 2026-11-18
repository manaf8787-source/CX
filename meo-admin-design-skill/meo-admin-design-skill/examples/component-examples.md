# Component examples (HTML)

Markup for each component using the classes in `meo-admin.css`. Icons are 24-grid outline SVGs with `class="i"` (`fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round`). A rendered page using these is `admin-demo.html`.

## Buttons

```html
<!-- Primary, toolbar size. The second label is decorative and rolls in on hover. -->
<button class="btn btn--primary btn--sm">
  <svg class="i" viewBox="0 0 24 24"><path d="M5 12h14M12 5v14"/></svg>
  <span class="btn__mask"><span>New record</span><span aria-hidden="true">New record</span></span>
</button>

<!-- Secondary, form size -->
<button class="btn btn--secondary btn--lg">
  <span class="btn__mask"><span>Cancel</span><span aria-hidden="true">Cancel</span></span>
</button>

<!-- Ghost with trailing arrow -->
<button class="btn btn--ghost">
  <span class="btn__mask"><span>Compare plans</span><span aria-hidden="true">Compare plans</span></span>
  <svg class="i" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
</button>

<!-- Round icon toggle: light = off, dark = on -->
<button class="icon-btn" aria-pressed="false" aria-label="Start"><svg class="i" viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z"/></svg></button>
<button class="icon-btn" aria-pressed="true" aria-label="Pause"><svg class="i" viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg></button>
```

## Pills, tags, badges, chips, status

```html
<span class="pill"><svg class="i" viewBox="0 0 24 24" style="stroke-width:2"><path d="M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/></svg><span class="t-label">Overview</span></span>

<span class="tag">Client</span>
<span class="tag tag--dark">Retail</span>
<span class="tag tag--error">Payment failed</span>          <!-- derived -->

<span class="badge">Most used</span>
<span class="badge badge--dark">New</span>

<span class="chip">
  <span class="chip__check"><svg class="i" viewBox="0 0 24 24" style="stroke-width:2.4"><path d="M5 12l5 5 9-10"/></svg></span>
  Audit log
</span>

<span class="status"><span class="dot dot--live" aria-hidden="true"></span><span style="color:var(--ink)">Running 2h 14m</span></span>
<span class="status"><span class="dot" aria-hidden="true"></span>Paused</span>
```

## Segmented control

```html
<div class="seg" role="radiogroup" aria-label="Status filter">
  <button class="seg__item" role="radio" aria-checked="true">All 24</button>
  <button class="seg__item" role="radio" aria-checked="false" tabindex="-1">Running 9</button>
  <button class="seg__item" role="radio" aria-checked="false" tabindex="-1">Paused 15</button>
</div>

<!-- Page-level variant on a white track -->
<div class="seg seg--page" role="tablist" aria-label="Billing period">
  <button class="seg__item" role="tab" aria-selected="true">Monthly</button>
  <button class="seg__item" role="tab" aria-selected="false" tabindex="-1">Yearly</button>
</div>
```

## Inputs

```html
<label class="input" style="width:240px">
  <svg class="i" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
  <input type="search" placeholder="Find a record or note" aria-label="Search">
</label>

<div class="field">
  <label class="field__label" for="ws">Workspace name</label>
  <div class="input input--form"><input id="ws" value="North Studio" aria-describedby="ws-help"></div>
  <span class="field__help" id="ws-help">Shown to everyone you invite.</span>
</div>

<div class="field">
  <label class="field__label" for="em">Billing email</label>
  <div class="input input--form" aria-invalid="true"><input id="em" value="finance@" aria-invalid="true" aria-describedby="em-err"></div>
  <span class="field__error" id="em-err">Enter a complete email address.</span>
</div>

<label style="display:inline-flex;align-items:center;gap:8px"><input class="check" type="checkbox" checked> <span class="t-small-strong">Send receipts</span></label>
<label style="display:inline-flex;align-items:center;gap:8px"><input class="switch" type="checkbox" role="switch" checked> <span class="t-small-strong">Auto-renew</span></label>
```

## Card with well

```html
<article class="card">
  <div class="well on-well">
    <div style="display:grid;grid-template-columns:120px 1fr 48px;align-items:center;gap:14px">
      <span class="t-small-strong">This product</span>
      <div class="bar"><div class="bar__fill" style="width:22%"></div></div>
      <span class="t-small-strong" style="text-align:right">1.4 GB</span>
    </div>
    <div style="display:grid;grid-template-columns:120px 1fr 48px;align-items:center;gap:14px">
      <span class="t-body-s">Alternative A</span>
      <div class="bar"><div class="bar__fill bar__fill--muted" style="width:71%"></div></div>
      <span class="t-body-s" style="text-align:right">4.6 GB</span>
    </div>
    <span class="t-caption t-muted">Measured with 20 sessions open.</span>
  </div>
  <div style="display:grid;gap:8px">
    <h3 class="t-card-title">Uses about a quarter of the memory</h3>
    <p class="t-body-m">Sessions share one engine instead of each loading their own copy.</p>
  </div>
</article>
```

## Framed surface

```html
<div class="frame">
  <div class="frame__inner">
    <!-- any full layout: sidebar + content -->
  </div>
</div>
```

## Dropdown menu

```html
<div class="menu" role="menu">
  <a class="menu__row" role="menuitem" href="#">
    <svg class="i" viewBox="0 0 24 24"><path d="M3 9l1.5-5h15L21 9M4 9v11h16V9M9 20v-6h6v6"/></svg>
    <span style="display:grid;gap:2px">
      <span class="t-ui-strong">Stores</span>
      <span class="t-body-s t-muted">One storefront per region</span>
    </span>
  </a>
  <!-- compact row (derived) -->
  <button class="menu__row menu__row--compact" role="menuitem" style="width:100%">
    <svg class="i" viewBox="0 0 24 24" style="width:16px;height:16px"><path d="M12 3v12M7 10l5 5 5-5M4 20h16"/></svg>Export CSV
  </button>
</div>
```

## Accordion item

```html
<style>
  .acc { border-radius: 18px; background: var(--surface); box-shadow: var(--shadow-card); overflow: clip; }
  .acc__head { display: flex; align-items: center; gap: 16px; width: 100%; padding: 20px 20px 20px 24px; text-align: left; }
  .acc__q { flex: 1; transition: padding-left var(--spring-css); }
  .acc__head:hover .acc__q { padding-left: 3px; }
  .acc__toggle { position: relative; width: 30px; height: 30px; border-radius: 50%; background: var(--grad-dark); box-shadow: var(--shadow-raised-dark-md); flex: none; }
  .acc__toggle::before, .acc__toggle::after { content: ""; position: absolute; left: 9px; top: 14px; width: 12px; height: 2px; border-radius: 1px; background: #fff; transition: transform var(--spring-css); }
  .acc__toggle::after { transform: rotate(90deg); }
  .acc__head[aria-expanded="true"] .acc__toggle::after { transform: rotate(0deg); }
  .acc__body { padding: 0 72px 22px 24px; }
</style>
<div class="acc">
  <button class="acc__head" aria-expanded="true" aria-controls="a1">
    <span class="acc__q t-h4">Can teammates work without seeing passwords?</span>
    <span class="acc__toggle" aria-hidden="true"></span>
  </button>
  <div class="acc__body t-body-m" id="a1" role="region">Share access by role and set an end date.</div>
</div>
```

## Toast, tooltip, dialog (derived)

```html
<div class="toast" role="status">
  <div style="display:grid;gap:4px">
    <span class="t-ui-strong">Export ready</span>
    <span class="t-body-s">128 orders were written to orders.csv.</span>
  </div>
  <div style="display:flex;gap:8px;margin-top:14px">
    <button class="btn btn--secondary btn--sm btn--block"><span class="btn__mask"><span>Dismiss</span><span aria-hidden="true">Dismiss</span></span></button>
    <button class="btn btn--primary btn--sm btn--block"><span class="btn__mask"><span>Download</span><span aria-hidden="true">Download</span></span></button>
  </div>
</div>

<span class="tooltip" role="tooltip">Requires the Owner role</span>

<div class="scrim">
  <div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="d-title" aria-describedby="d-body">
    <h2 class="t-h4" id="d-title">Delete 3 orders?</h2>
    <p class="t-body-m" id="d-body">This removes them for everyone in North Studio. It cannot be undone.</p>
    <div style="display:flex;justify-content:flex-end;gap:8px">
      <button class="btn btn--secondary btn--lg"><span class="btn__mask"><span>Keep orders</span><span aria-hidden="true">Keep orders</span></span></button>
      <button class="btn btn--primary btn--lg"><span class="btn__mask"><span>Delete 3 orders</span><span aria-hidden="true">Delete 3 orders</span></span></button>
    </div>
  </div>
</div>
```

## App-icon tile

```html
<style>
  .tile { position: relative; display: grid; place-items: center; width: 56px; height: 56px; border-radius: 15px; color: #fff; overflow: clip; box-shadow: var(--shadow-app-icon); }
  .tile::before { content: ""; position: absolute; left: 6px; top: 3px; width: 44px; height: 25px; border-radius: 12px 12px 20px 20px; background: linear-gradient(180deg, rgba(255,255,255,.28), rgba(255,255,255,0)); }
  .tile svg { position: relative; width: 26px; height: 26px; stroke-width: 2.2; }
</style>
<span class="tile" style="background:var(--brand-blue)"><svg class="i" viewBox="0 0 24 24"><path d="M3 9l1.5-5h15L21 9M4 9v11h16V9M9 20v-6h6v6"/></svg></span>
```
