/** The expanded or rail state of the desktop sidebar, remembered per browser. Every access is guarded: the shell must render without storage. */
const KEY = 'psicx.sidebar'

export function readSidebarExpanded(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'collapsed'
  } catch {
    return true
  }
}

export function writeSidebarExpanded(expanded: boolean): void {
  try {
    localStorage.setItem(KEY, expanded ? 'expanded' : 'collapsed')
  } catch {
    /* private window, blocked storage: the state simply is not remembered */
  }
}
