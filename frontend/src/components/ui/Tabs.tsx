export interface TabDef { id: string; label: string }

export function Tabs({ tabs, active, onChange, sub }: { tabs: TabDef[]; active: string; onChange: (id: string) => void; sub?: boolean }) {
  return (
    <div className={`tabs ${sub ? 'sub' : ''}`} role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={active === t.id} onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  )
}
