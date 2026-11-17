export interface AgentScoreRow {
  name: string
  scope: string // environment/pool or channel
  calls: number
  csat: number
  incidents: number
  shopperScore: number
  nps: number
}

// Real Estate sales agent scorecard (sample).
export const AGENTS_RE: AgentScoreRow[] = [
  { name: 'Sara M.', scope: 'Digital, Dubai', calls: 46, csat: 86, incidents: 1, shopperScore: 91, nps: 32 },
  { name: 'Hamad F.', scope: 'Branch, Dubai', calls: 38, csat: 79, incidents: 2, shopperScore: 74, nps: 18 },
  { name: 'Rania Q.', scope: 'Digital, Abu Dhabi', calls: 52, csat: 83, incidents: 0, shopperScore: 95, nps: 29 },
  { name: 'Tariq S.', scope: 'Branch, Abu Dhabi', calls: 29, csat: 71, incidents: 3, shopperScore: 62, nps: 9 },
  { name: 'Dana Y.', scope: 'App, Dubai', calls: 41, csat: 88, incidents: 0, shopperScore: 93, nps: 35 },
]

export const AGENTS_AF: AgentScoreRow[] = [
  { name: 'Yousef A.', scope: 'Ready + off-plan', calls: 64, csat: 72, incidents: 2, shopperScore: 80, nps: 16 },
  { name: 'Mariam H.', scope: 'Rental', calls: 57, csat: 68, incidents: 3, shopperScore: 75, nps: 11 },
]

export interface DeveloperScoreRow { name: string; units: number; openIncidents: number; avgResolveDays: number; satisfaction: number }
export const DEVELOPERS: DeveloperScoreRow[] = [
  { name: 'Developer liaison — Tower A', units: 212, openIncidents: 3, avgResolveDays: 4.2, satisfaction: 71 },
  { name: 'Developer liaison — Tower B', units: 148, openIncidents: 1, avgResolveDays: 2.8, satisfaction: 79 },
]
