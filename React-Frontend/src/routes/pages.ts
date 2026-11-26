/**
 * Route chunk loaders, shared by the lazy routes in App.tsx and by prefetching, so
 * hovering or focusing a sidebar link warms that page's chunk before it is opened.
 * (No idle prefetch of every page: importing runs module code and slowed first load.)
 */
export const pageLoaders = {
  login: () => import('../pages/Login'),
  home: () => import('../pages/Home'),
  customers: () => import('../pages/Customers'),
  runaway: () => import('../pages/Runaway'),
  closeTheLoop: () => import('../pages/CloseTheLoop'),
  personas: () => import('../pages/Personas'),
  surveys: () => import('../pages/settings/SurveysHub'),
  productPage: () => import('../pages/ProductPage'),
  surveyAnswers: () => import('../pages/SurveyAnswers'),
  actionsLayout: () => import('../pages/actions/ActionsLayout'),
  corrective: () => import('../pages/actions/Corrective'),
  withOtherTeams: () => import('../pages/actions/WithOtherTeams'),
  signals: () => import('../pages/actions/Signals'),
  aiInsights: () => import('../pages/actions/AiInsights'),
  shopperCases: () => import('../pages/actions/ShopperCases'),
  investigations: () => import('../pages/actions/Investigations'),
  settingsLayout: () => import('../pages/settings/SettingsLayout'),
  settingsOverview: () => import('../pages/settings/Overview'),
  // v40 pages (docs/V40_FOUNDATION_API.md). Overview moved out of Settings to /overview.
  inbox: () => import('../pages/inbox/Inbox'),
  overview: () => import('../pages/OverviewPage'),
  feeds: () => import('../pages/settings/Feeds'),
  crmMapping: () => import('../pages/settings/CrmMapping'),
  escalationMatrix: () => import('../pages/settings/EscalationMatrix'),
  weeklySample: () => import('../pages/settings/WeeklySample'),
  publicMentions: () => import('../pages/settings/PublicMentions'),
  monthlyPack: () => import('../pages/settings/MonthlyPack'),
  mysteryShopper: () => import('../pages/settings/MysteryShopper'),
  standards: () => import('../pages/settings/StandardsRegister'),
  voc: () => import('../pages/settings/Voc'),
  ld: () => import('../pages/settings/Ld'),
  hrTeamPerf: () => import('../pages/settings/HrTeamPerf'),
  maintenancePerf: () => import('../pages/settings/MaintenancePerf'),
  rules: () => import('../pages/settings/Rules'),
  aiInsightsAccess: () => import('../pages/settings/AiInsightsAccess'),
  settingsGlossary: () => import('../pages/settings/Glossary'),
  adminSettings: () => import('../pages/settings/AdminSettings'),
  // v42 (F31): the replay page under Settings and reference.
  watchTeam: () => import('../pages/settings/AiTeam'),
  // v42.1 (F33): the campaign audit, right after the weekly sample in the Settings menu.
  // 23 Nov: the campaign audit page became Marketing campaigns (results, audit, criteria, clearance, sources)
  campaignAudit: () => import('../pages/settings/MarketingCampaigns'),
  // v43 (19 Nov): the super admin's user directory.
  users: () => import('../pages/admin/Users'),
  auditLog: () => import('../pages/admin/AuditLog'),
} as const

type LoaderKey = keyof typeof pageLoaders

/** Which chunks a sidebar destination needs (layout + default child). */
const PATH_LOADERS: [prefix: string, keys: LoaderKey[]][] = [
  ['/home', ['home']],
  ['/customers', ['customers']],
  ['/runaway', ['runaway']],
  ['/actions', ['actionsLayout', 'corrective']],
  ['/close-the-loop', ['closeTheLoop']],
  ['/inbox', ['inbox']],
  ['/overview', ['overview']],
  ['/personas', ['personas']],
  ['/surveys', ['surveys']],
  ['/products/', ['productPage']],
  ['/admin/users', ['users']],
  ['/admin/audit', ['auditLog']],
  // before '/settings', which would match it first
  ['/settings/ai-team', ['settingsLayout', 'watchTeam']],
  ['/settings/campaign-audit', ['settingsLayout', 'campaignAudit']],
  ['/settings', ['settingsLayout']],
]

const started = new Set<LoaderKey>()

export function prefetchPath(path: string) {
  const entry = PATH_LOADERS.find(([prefix]) => path === prefix || path.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`))
  if (!entry) return
  for (const key of entry[1]) {
    if (started.has(key)) continue
    started.add(key)
    pageLoaders[key]().catch(() => started.delete(key))
  }
}
