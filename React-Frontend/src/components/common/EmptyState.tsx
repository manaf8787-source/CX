export function EmptyState({ title, note }: { title: string; note?: string }) {
  return (
    <div className="empty-state">
      <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{title}</div>
      {note && <div className="text-sm" style={{ marginTop: 4 }}>{note}</div>}
    </div>
  )
}
