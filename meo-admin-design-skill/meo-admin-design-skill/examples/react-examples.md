# React examples

TypeScript + React components styled by `meo-admin.css` and `../tokens/tokens.css`. They assume `lucide-react` for icons and, optionally, `motion` (Framer Motion) for the spring. Nothing here depends on Framer the site builder. Adapt class names to your styling system (CSS Modules, Tailwind with the token variables, vanilla-extract) rather than adding a new one.

These files were type-checked with `tsc --strict` (React 19 types, `motion` 12, `lucide-react`).

## motion.ts

```ts
// Measured from the reference's compiled motion config.
export const springUi = { type: "spring", duration: 0.4, bounce: 0.2 } as const;
export const easeOut = [0.22, 1, 0.36, 1] as const;
export const easeInOut = [0.45, 0, 0.55, 1] as const;

export const reveal = {
  initial: { opacity: 0, y: 12 },                       // 24 on marketing pages
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: easeOut },         // 1.0 on marketing pages
} as const;
```

## Button.tsx

```tsx
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg" | "xl";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  iconLeading?: ReactNode;
  iconTrailing?: ReactNode;
  block?: boolean;
  children: string;
}

const sizeClass: Record<Size, string> = { sm: "btn--sm", md: "", lg: "btn--lg", xl: "btn--xl" };

/** Pill button with the reference's label-roll hover. The second label is decorative. */
export function Button({
  variant = "primary", size = "md", iconLeading, iconTrailing, block, children, className = "", ...rest
}: ButtonProps) {
  const cls = ["btn", `btn--${variant}`, sizeClass[size], block ? "btn--block" : "", className].filter(Boolean).join(" ");
  return (
    <button type="button" className={cls} {...rest}>
      {iconLeading}
      <span className="btn__mask">
        <span>{children}</span>
        <span aria-hidden="true">{children}</span>
      </span>
      {iconTrailing}
    </button>
  );
}
```

## Segmented.tsx

A single dark pill slides between options (`layoutId` + the UI spring). Without `motion`, drop the `motion.span` and style `[aria-checked="true"]` as in the CSS file.

```tsx
import { useId } from "react";
import type { KeyboardEvent } from "react";
import { motion } from "motion/react";
import { springUi } from "./motion";

export interface SegmentedOption<T extends string> { value: T; label: string; count?: number }

export function Segmented<T extends string>({
  options, value, onChange, label,
}: { options: SegmentedOption<T>[]; value: T; onChange: (v: T) => void; label: string }) {
  const id = useId();

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = options.findIndex((o) => o.value === value);
    const next =
      e.key === "ArrowRight" ? options[(i + 1) % options.length] :
      e.key === "ArrowLeft" ? options[(i - 1 + options.length) % options.length] : undefined;
    if (next) { e.preventDefault(); onChange(next.value); }
  };

  return (
    <div className="seg" role="radiogroup" aria-label={label} onKeyDown={onKeyDown}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value} type="button" role="radio" aria-checked={selected}
            tabIndex={selected ? 0 : -1} onClick={() => onChange(o.value)}
            className="seg__item"
            style={{ position: "relative", background: "none", boxShadow: "none", color: selected ? "#fff" : undefined }}
          >
            {selected && (
              <motion.span
                layoutId={`seg-${id}`} transition={springUi} aria-hidden="true"
                style={{
                  position: "absolute", inset: 0, borderRadius: 999,
                  background: "var(--grad-dark)", boxShadow: "var(--shadow-raised-dark)",
                }}
              />
            )}
            <span style={{ position: "relative" }}>
              {o.label}{o.count !== undefined ? ` ${o.count}` : ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

## Tag.tsx and Status.tsx

```tsx
import type { ReactNode } from "react";

type Tone = "light" | "dark" | "success" | "warning" | "error" | "info";

export function Tag({ tone = "light", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={tone === "light" ? "tag" : `tag tag--${tone}`}>{children}</span>;
}

type State = "live" | "idle" | "success" | "warning" | "error" | "info";

/** Dot + text. "live" pulses; always pair the dot with words. */
export function Status({ state, children }: { state: State; children: ReactNode }) {
  const dot = state === "idle" ? "dot" : `dot dot--${state}`;
  return (
    <span className="status">
      <span className={dot} aria-hidden="true" />
      <span style={{ color: state === "idle" ? undefined : "var(--ink)" }}>{children}</span>
    </span>
  );
}
```

## Sidebar.tsx

```tsx
import type { ReactNode } from "react";

export interface NavEntry { href: string; label: string; icon: ReactNode; count?: number; group?: string }

export function Sidebar({
  brand, items, currentHref, footer,
}: { brand: ReactNode; items: NavEntry[]; currentHref: string; footer?: ReactNode }) {
  let lastGroup: string | undefined;
  return (
    <nav className="sidebar" aria-label="Primary">
      <div className="sidebar__brand">{brand}</div>
      {items.map((item) => {
        const heading = item.group && item.group !== lastGroup ? item.group : undefined;
        lastGroup = item.group;
        return (
          <div key={item.href} style={{ display: "contents" }}>
            {heading && <div className="sidebar__group t-label">{heading}</div>}
            <a className="nav-item" href={item.href} aria-current={item.href === currentHref ? "page" : undefined}>
              {item.icon}
              {item.label}
              {item.count !== undefined && <span className="nav-item__count">{item.count.toLocaleString()}</span>}
            </a>
          </div>
        );
      })}
      <div className="sidebar__spacer" />
      {footer}
    </nav>
  );
}

export function UsageCard({ title, used, total, unit }: { title: string; used: number; total: number; unit: string }) {
  const pct = Math.round((used / total) * 100);
  return (
    <div className="plan">
      <span className="t-ui-strong">{title}</span>
      <span className="t-body-s t-muted">{used} of {total} {unit} used</span>
      <div className="meter" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${unit} used`}>
        <i style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
```

## KpiCard.tsx

```tsx
import type { ReactNode } from "react";

export function KpiCard({
  label, value, unit, aside, children, caption, dark,
}: {
  label: string; value: string; unit?: string; aside?: ReactNode;
  children?: ReactNode; caption?: string; dark?: boolean;
}) {
  return (
    <article className={`card card--dense${dark ? " card--dark" : ""}`}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="t-small-strong" style={dark ? undefined : { color: "var(--ink-secondary)" }}>{label}</span>
        {aside}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span className="t-kpi">{value}</span>
        {unit && <span className="t-unit">{unit}</span>}
      </div>
      {children && (
        <div className="well on-well" style={{ padding: 16 }}>
          {children}
          {caption && <span className="t-caption t-muted">{caption}</span>}
        </div>
      )}
    </article>
  );
}

export function BarRow({ label, value, pct, hero }: { label: string; value: string; pct: number; hero?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "76px minmax(0,1fr) auto", alignItems: "center", gap: 14 }}>
      <span className={hero ? "t-small-strong" : "t-body-s"}>{label}</span>
      <div className="bar" role="img" aria-label={`${label}: ${value}`}>
        <div className={hero ? "bar__fill" : "bar__fill bar__fill--muted"} style={{ width: `${pct}%` }} />
      </div>
      <span className={hero ? "t-small-strong" : "t-body-s"}>{value}</span>
    </div>
  );
}
```

## DataTable.tsx

```tsx
import type { ReactNode } from "react";

export interface Column<Row> {
  key: string;
  header: string;
  cell: (row: Row) => ReactNode;
  numeric?: boolean;
  /** "secondary" hides below 1200px, "tertiary" below 810px (priority columns). */
  priority?: "secondary" | "tertiary";
  width?: number;
}

export function DataTable<Row>({
  rows, columns, getId, selected, onToggle, onToggleAll, dense, caption,
}: {
  rows: Row[]; columns: Column<Row>[]; getId: (row: Row) => string;
  selected: ReadonlySet<string>; onToggle: (id: string) => void; onToggleAll: () => void;
  dense?: boolean; caption: string;
}) {
  const all = rows.length > 0 && rows.every((r) => selected.has(getId(r)));
  const colClass = (c: Column<Row>) =>
    [c.numeric ? "num" : "", c.priority ? `col-${c.priority}` : ""].filter(Boolean).join(" ") || undefined;

  return (
    <table className={dense ? "table table--dense" : "table"}>
      <caption style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)" }}>{caption}</caption>
      <thead>
        <tr>
          <th className="col-select" style={{ width: 34 }}>
            <input className="check" type="checkbox" checked={all} onChange={onToggleAll} aria-label="Select all rows" />
          </th>
          {columns.map((c) => (
            <th key={c.key} scope="col" className={colClass(c)} style={c.width ? { width: c.width } : undefined}>{c.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const id = getId(row);
          const isSelected = selected.has(id);
          return (
            <tr key={id} aria-selected={isSelected}>
              <td className="col-select">
                <input className="check" type="checkbox" checked={isSelected} onChange={() => onToggle(id)} aria-label={`Select row ${id}`} />
              </td>
              {columns.map((c) => <td key={c.key} className={colClass(c)}>{c.cell(row)}</td>)}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** Two-line identity cell: 14/500 title over a 13/400 status line. */
export function IdentityCell({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="cell-2">
      <span className="t-ui-strong">{title}</span>
      <span className="t-body-s">{meta}</span>
    </div>
  );
}
```

## Page.tsx (composition)

```tsx
import { useState } from "react";
import { Download, Plus, Search, LayoutGrid, ListOrdered, Users } from "lucide-react";
import { Button } from "./Button";
import { Segmented } from "./Segmented";
import { Sidebar, UsageCard } from "./Sidebar";
import { KpiCard, BarRow } from "./KpiCard";
import { DataTable, IdentityCell } from "./DataTable";
import type { Column } from "./DataTable";
import { Tag, Status } from "./Tag";

interface Order { id: string; customer: string; placed: string; state: "live" | "idle" | "success" | "error"; stateLabel: string; total: string }

const orders: Order[] = [
  { id: "4821", customer: "Aria Lindqvist", placed: "Placed 2h 14m ago", state: "live", stateLabel: "Packing", total: "$212.00" },
  { id: "4820", customer: "Pine & Co.", placed: "Placed 40 min ago", state: "idle", stateLabel: "Awaiting payment", total: "$1,960.00" },
];

const columns: Column<Order>[] = [
  { key: "order", header: "Order", cell: (o) => <IdentityCell title={`#${o.id} · ${o.customer}`} meta={o.placed} /> },
  { key: "status", header: "Status",
    cell: (o) => o.state === "error" ? <Tag tone="error">{o.stateLabel}</Tag> : <Status state={o.state}>{o.stateLabel}</Status> },
  { key: "total", header: "Total", numeric: true, cell: (o) => o.total },
];

const icon = { size: 16, strokeWidth: 1.7 } as const;   // 1.7 is the reference's UI stroke

export function OverviewPage() {
  const [filter, setFilter] = useState<"all" | "open" | "shipped">("all");
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => setSelected((s) => (s.size === orders.length ? new Set() : new Set(orders.map((o) => o.id))));

  return (
    <div className="shell">
      <Sidebar
        brand={<span className="t-h4">Ledgerline</span>}
        currentHref="/overview"
        items={[
          { href: "/overview", label: "Overview", icon: <LayoutGrid {...icon} /> },
          { href: "/orders", label: "Orders", icon: <ListOrdered {...icon} />, count: 128 },
          { href: "/customers", label: "Customers", icon: <Users {...icon} />, count: 2410, group: "Manage" },
        ]}
        footer={<UsageCard title="Team plan" used={62} total={100} unit="seats" />}
      />
      <main className="page">
        <div className="page__head">
          <div style={{ flex: 1 }}>
            <h1 className="t-page-title">Overview</h1>
            <p className="t-body-s">Orders and fulfilment across all stores, last 30 days.</p>
          </div>
          <Button variant="secondary" size="sm" iconLeading={<Download size={14} strokeWidth={1.7} />}>Export</Button>
          <Button size="sm" iconLeading={<Plus size={14} strokeWidth={1.7} />}>New order</Button>
        </div>

        <section className="grid-kpi" aria-label="Key metrics">
          <KpiCard label="Revenue" value="84.2" unit="k" aside={<Tag>+4.2%</Tag>}>
            <BarRow label="This month" value="84k" pct={78} hero />
            <BarRow label="Last month" value="81k" pct={70} />
          </KpiCard>
        </section>

        <section className="card" style={{ padding: "0 16px 8px", gap: 0 }} aria-label="Orders">
          <div className="toolbar" style={{ padding: "12px 0" }}>
            <Segmented
              label="Status filter" value={filter} onChange={setFilter}
              options={[{ value: "all", label: "All", count: 128 }, { value: "open", label: "Open", count: 34 }, { value: "shipped", label: "Shipped", count: 94 }]}
            />
            <div className="toolbar__spacer" />
            <label className="input" style={{ width: 240 }}>
              <Search size={14} strokeWidth={1.7} aria-hidden="true" />
              <input type="search" placeholder="Find an order or customer" aria-label="Search orders" />
            </label>
          </div>
          <DataTable caption="Orders" rows={orders} columns={columns} getId={(o) => o.id} selected={selected} onToggle={toggle} onToggleAll={toggleAll} />
        </section>
      </main>
    </div>
  );
}
```

## Notes

- `Segmented` overrides the CSS selected style inline because the sliding indicator supplies the dark pill. If you do not use `motion`, remove the inline `background/boxShadow` overrides and the indicator.
- Wrap the app in `<MotionConfig reducedMotion="user">`.
- Icons: pass `strokeWidth={1.7}` everywhere in chrome; `2` inside eyebrow pills; `2.2` inside 56px colour tiles (see `../references/iconography.md`).
