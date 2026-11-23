import { useSyncExternalStore } from 'react'
import type { Bi } from '../types'

/**
 * Integrations (owner's request, 23 Nov): every connection the portal has with another platform or product, in one place the Super
 * admin and the Admin manage (not the CX users). Each connection says what data it brings in (or sends out), how (API, webhook, daily
 * file), where to (base URL), how it signs in, how often it runs and whether it works.
 *
 * Prototype: kept in this browser's localStorage; "Test" only simulates a check and nothing is called. A secret (API key, token,
 * password) is never kept here: the form takes it once and stores only that one is set and its last four characters. In the real
 * platform the secret goes to the server's secret store and never comes back to the browser.
 */
export type Direction = 'in' | 'out' | 'both'
export type Method = 'rest' | 'webhook' | 'file' | 'database'
export type Auth = 'api_key' | 'oauth' | 'basic' | 'token' | 'none'
export type Schedule = 'realtime' | 'hourly' | 'daily' | 'weekly'
export type ConnStatus = 'connected' | 'not_connected' | 'error' | 'paused'

export interface Integration {
  id: string
  name: string
  /** Which product or area it serves, in words (e.g. "PSI Real Estate · Abu Dhabi"). */
  scope: string
  /** The data it carries, in plain words. */
  data: string
  direction: Direction
  method: Method
  baseUrl: string
  auth: Auth
  /** Only whether a secret is set, and its last four characters. Never the secret. */
  secretHint?: string
  schedule: Schedule
  /** Time of day for a daily or weekly run, "06:00". */
  runAt?: string
  /** Who on the other side owns it (a title). */
  owner: string
  status: ConnStatus
  enabled: boolean
  lastSync?: string
  lastError?: string
  /** Added in the portal (not one of the sample connections): only these can be deleted. */
  custom?: boolean
  /** The settings this one platform needs besides the address and the key (a Facebook page ID, a WhatsApp phone number ID, an
   * Odoo database name…). A secret one is stored like the key: only its last four characters. */
  params?: Param[]
}

export interface Param {
  key: string
  label: string
  value: string
  secret?: boolean
}

export const DIRECTION_LABEL: Record<Direction, Bi> = {
  in: { en: 'Brings data in', ar: 'يجلب البيانات' },
  out: { en: 'Sends data out', ar: 'يرسل البيانات' },
  both: { en: 'Both ways', ar: 'في الاتجاهين' },
}
export const METHOD_LABEL: Record<Method, Bi> = {
  rest: { en: 'REST API', ar: 'واجهة REST API' },
  webhook: { en: 'Webhook (they push to us)', ar: 'Webhook (يرسلون إلينا)' },
  file: { en: 'Daily file (SFTP or export)', ar: 'ملف يومي (SFTP أو تصدير)' },
  database: { en: 'Read-only database view', ar: 'عرض قاعدة بيانات للقراءة فقط' },
}
export const AUTH_LABEL: Record<Auth, Bi> = {
  api_key: { en: 'API key', ar: 'مفتاح API' },
  oauth: { en: 'OAuth (sign in with the platform)', ar: 'OAuth (الدخول عبر المنصة)' },
  basic: { en: 'User name and password', ar: 'اسم مستخدم وكلمة مرور' },
  token: { en: 'Access token', ar: 'رمز وصول' },
  none: { en: 'None (internal)', ar: 'لا شيء (داخلي)' },
}
export const SCHEDULE_LABEL: Record<Schedule, Bi> = {
  realtime: { en: 'As it happens', ar: 'فوري' },
  hourly: { en: 'Every hour', ar: 'كل ساعة' },
  daily: { en: 'Once a day', ar: 'مرة يومياً' },
  weekly: { en: 'Once a week', ar: 'مرة أسبوعياً' },
}
export const STATUS_LABEL: Record<ConnStatus, Bi> = {
  connected: { en: 'Connected', ar: 'متصل' },
  not_connected: { en: 'Not connected yet', ar: 'غير متصل بعد' },
  error: { en: 'Error', ar: 'خطأ' },
  paused: { en: 'Paused', ar: 'موقوف' },
}

const today = (h: number, m: number) => {
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

/** The sample connections: the sources the data feeds already name, plus the ones the HR and agent reports wait for. */
function seed(): Integration[] {
  return [
    {
      id: 'int-crm-auh',
      name: 'PSI CRM · Abu Dhabi',
      scope: 'PSI Real Estate, PSI Club · Abu Dhabi',
      data: 'Leads, activities, contacts, transactions, agents and pools, history',
      direction: 'in',
      method: 'rest',
      baseUrl: 'https://psi-crm.com/api',
      auth: 'token',
      secretHint: '••••7c1a',
      schedule: 'daily',
      runAt: '06:00',
      owner: 'CRM owner (IT)',
      status: 'connected',
      enabled: true,
      lastSync: today(6, 10),
      params: [
        { key: 'environment', label: 'CRM environment', value: 'AUH' },
        { key: 'campaign_tag_field', label: 'Lead field holding the campaign tag (code)', value: '' },
        { key: 'api_user', label: 'Read-only API user', value: 'cx-portal-auh' },
      ],
    },
    {
      id: 'int-crm-dub',
      name: 'PSI CRM · Dubai',
      scope: 'PSI Real Estate · Dubai',
      data: 'Same as Abu Dhabi, separate database',
      direction: 'in',
      method: 'rest',
      baseUrl: 'https://dubai.psi-crm.com/api',
      auth: 'token',
      secretHint: '••••19be',
      schedule: 'daily',
      runAt: '06:00',
      owner: 'CRM owner (IT)',
      status: 'connected',
      enabled: true,
      lastSync: today(6, 12),
      params: [
        { key: 'environment', label: 'CRM environment', value: 'DXB' },
        { key: 'campaign_tag_field', label: 'Lead field holding the campaign tag (code)', value: '' },
        { key: 'api_user', label: 'Read-only API user', value: 'cx-portal-dxb' },
      ],
    },
    {
      id: 'int-crm-ast',
      name: 'PSI CRM · PSI Assets',
      scope: 'PSI Assets (rental)',
      data: 'Tenants, renewals, maintenance requests, history',
      direction: 'in',
      method: 'rest',
      baseUrl: 'https://assets.psi-crm.com/api',
      auth: 'token',
      secretHint: '••••44d0',
      schedule: 'daily',
      runAt: '06:00',
      owner: 'CRM owner (IT)',
      status: 'error',
      enabled: true,
      lastSync: new Date(Date.now() - 86_400_000).toISOString(),
      lastError: "Today's file did not arrive by 07:00",
      params: [
        { key: 'environment', label: 'CRM environment', value: 'ASSETS' },
        { key: 'campaign_tag_field', label: 'Lead field holding the campaign tag (code)', value: '' },
        { key: 'api_user', label: 'Read-only API user', value: 'cx-portal-assets' },
      ],
    },
    {
      id: 'int-wa',
      name: 'WhatsApp Business (Meta)',
      scope: 'All products',
      data: 'Messages in and out, reply times; sends the survey templates',
      direction: 'both',
      method: 'webhook',
      baseUrl: 'https://graph.facebook.com/v20.0',
      auth: 'token',
      secretHint: '••••a2f9',
      schedule: 'realtime',
      owner: 'Marketing (Meta account owner)',
      status: 'connected',
      enabled: true,
      lastSync: today(6, 40),
      params: [
        { key: 'waba_id', label: 'WhatsApp Business account ID', value: '104455667788990' },
        { key: 'phone_number_id', label: 'Phone number ID (the sending number)', value: '109988776655443' },
        { key: 'verify_token', label: 'Webhook verify token', value: '', secret: true },
      ],
    },
    {
      id: 'int-ivr',
      name: 'AI caller and IVR',
      scope: 'Call center · all products',
      data: 'Calls, durations, outcomes, IVR choices (including "talk to HR")',
      direction: 'in',
      method: 'rest',
      baseUrl: 'https://callcenter.psi.internal/api',
      auth: 'api_key',
      secretHint: '••••0b77',
      schedule: 'hourly',
      owner: 'AI engineers (call center)',
      status: 'connected',
      enabled: true,
      lastSync: today(6, 30),
      params: [
        { key: 'hr_queue', label: 'IVR queue for "talk to HR"', value: 'HR_CALLBACK' },
        { key: 'complaint_queue', label: 'IVR queue for complaints', value: 'CX_COMPLAINTS' },
      ],
    },
    {
      id: 'int-app',
      name: 'PSI Real Estate app and PSI Website',
      scope: 'PSI Real Estate',
      data: 'Enquiries, chats, abandoned steps, ratings; shows the in-app pop-up surveys',
      direction: 'both',
      method: 'rest',
      baseUrl: 'https://api.psinv.net',
      auth: 'api_key',
      secretHint: '••••d310',
      schedule: 'hourly',
      owner: 'App product owner',
      status: 'connected',
      enabled: true,
      lastSync: today(5, 50),
    },
    {
      id: 'int-fb',
      name: 'Facebook Pages',
      scope: 'All products (public)',
      data: 'Comments, posts that mention PSI, page reviews and messages to the page; no person is linked to a customer',
      direction: 'in',
      method: 'webhook',
      baseUrl: 'https://graph.facebook.com/v20.0',
      auth: 'token',
      secretHint: '••••91fe',
      schedule: 'realtime',
      owner: 'Marketing (Meta Business account owner)',
      status: 'connected',
      enabled: true,
      lastSync: today(4, 0),
      params: [
        { key: 'page_ids', label: 'Facebook page IDs (one per product page)', value: '1023344556677, 1099887766554' },
        { key: 'app_id', label: 'Meta app ID', value: '880112233445566' },
        { key: 'verify_token', label: 'Webhook verify token', value: '', secret: true },
      ],
    },
    {
      id: 'int-ig',
      name: 'Instagram',
      scope: 'All products (public)',
      data: 'Comments and mentions on the PSI Instagram business accounts; no person is linked to a customer',
      direction: 'in',
      method: 'webhook',
      baseUrl: 'https://graph.facebook.com/v20.0',
      auth: 'token',
      secretHint: '••••91fe',
      schedule: 'realtime',
      owner: 'Marketing (Meta Business account owner)',
      status: 'connected',
      enabled: true,
      lastSync: today(4, 0),
      params: [{ key: 'ig_business_ids', label: 'Instagram business account IDs', value: '17841400000000001' }],
    },
    {
      id: 'int-li',
      name: 'LinkedIn',
      scope: 'All products (public)',
      data: 'Comments and mentions on the PSI company pages (Community Management API)',
      direction: 'in',
      method: 'rest',
      baseUrl: 'https://api.linkedin.com/rest',
      auth: 'oauth',
      schedule: 'daily',
      runAt: '04:00',
      owner: 'Marketing (LinkedIn page admin)',
      status: 'not_connected',
      enabled: false,
      params: [
        { key: 'org_ids', label: 'LinkedIn organization IDs', value: '' },
        { key: 'client_id', label: 'LinkedIn app client ID', value: '' },
      ],
    },
    {
      id: 'int-google',
      name: 'Google reviews (Business Profile)',
      scope: 'Branches and offices (public)',
      data: 'Star ratings and review text per branch; replies are posted by Marketing',
      direction: 'in',
      method: 'rest',
      baseUrl: 'https://mybusiness.googleapis.com/v4',
      auth: 'oauth',
      schedule: 'daily',
      runAt: '04:30',
      owner: 'Marketing (Google Business Profile owner)',
      status: 'connected',
      enabled: true,
      lastSync: today(4, 30),
      params: [
        { key: 'account_id', label: 'Business Profile account ID', value: 'accounts/112233445566' },
        { key: 'location_ids', label: 'Location IDs (one per branch)', value: 'locations/101, locations/102, locations/103' },
      ],
    },
    {
      id: 'int-mkt',
      name: 'Marketing campaigns platform',
      scope: 'Marketing campaigns · all products',
      data: 'Campaigns: name and code, type, target segment, persona, owner, channels, budget, dates; recipients and what each received (email, message), delivered, opened, clicked',
      direction: 'in',
      method: 'rest',
      baseUrl: '',
      auth: 'api_key',
      schedule: 'hourly',
      owner: 'Marketing (platform owner)',
      status: 'not_connected',
      enabled: false,
      params: [
        { key: 'platform', label: 'Which platform (name)', value: '' },
        { key: 'campaign_code_field', label: 'Field holding the campaign code', value: 'campaign_code' },
      ],
    },
    {
      id: 'int-sms',
      name: 'SMS and email sender',
      scope: 'Survey campaigns',
      data: 'Sends surveys by SMS and email; returns delivered and opened',
      direction: 'out',
      method: 'rest',
      baseUrl: '',
      auth: 'api_key',
      schedule: 'realtime',
      owner: 'IT',
      status: 'not_connected',
      enabled: false,
      params: [
        { key: 'sender_id', label: 'SMS sender name', value: 'PSI' },
        { key: 'from_email', label: 'From email address', value: 'feedback@psinv.net' },
      ],
    },
    {
      id: 'int-odoo',
      name: 'Odoo (HR)',
      scope: 'HR team performance',
      data: 'Recruitment: job positions and applicants (hr.job, hr.applicant); HR operations requests',
      direction: 'in',
      method: 'rest',
      baseUrl: 'https://psi.odoo.com/jsonrpc',
      auth: 'api_key',
      schedule: 'daily',
      runAt: '07:00',
      owner: 'HR (Odoo admin)',
      status: 'not_connected',
      enabled: false,
      params: [
        { key: 'database', label: 'Odoo database name', value: 'psi-production' },
        { key: 'api_user', label: 'Read-only API user (login)', value: '' },
      ],
    },
    {
      id: 'int-tour',
      name: 'Tour Estate',
      scope: 'Tour Estate (not launched)',
      data: 'Tours, stops, guide and driver feedback',
      direction: 'in',
      method: 'rest',
      baseUrl: '',
      auth: 'api_key',
      schedule: 'daily',
      runAt: '06:00',
      owner: 'Tour Estate product owner',
      status: 'not_connected',
      enabled: false,
    },
    {
      id: 'int-wallet',
      name: 'PSI Wallet chat',
      scope: 'PSI Wallet (not launched)',
      data: 'Support chats on WhatsApp and in-app, response and resolution times',
      direction: 'in',
      method: 'rest',
      baseUrl: '',
      auth: 'api_key',
      schedule: 'hourly',
      owner: 'Wallet product owner',
      status: 'not_connected',
      enabled: false,
    },
  ]
}

const KEY = 'psicx.integrations'

function read(): Integration[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Integration[]
      if (Array.isArray(parsed) && parsed.length) {
        // 23 Nov: the one "Facebook, Instagram, LinkedIn, Google reviews" connection became four, each with its own API and settings
        if (parsed.some((x) => x.id === 'int-social')) {
          const fresh = seed().filter((x) => ['int-fb', 'int-ig', 'int-li', 'int-google'].includes(x.id))
          return parsed.flatMap((x) => (x.id === 'int-social' ? fresh : [x]))
        }
        // new sample connections added after this browser first stored the list (e.g. the marketing platform, 23 Nov)
        const missing = seed().filter((x) => !parsed.some((p) => p.id === x.id))
        return [...parsed, ...missing]
      }
    }
  } catch {
    /* storage unavailable */
  }
  return seed()
}

let items = read()
const listeners = new Set<() => void>()
function write(next: Integration[]) {
  items = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useIntegrations(): Integration[] {
  return useSyncExternalStore(
    subscribe,
    () => items,
    () => items,
  )
}

/** The last four characters only, never the secret. */
export const hintOf = (secret: string) => (secret.trim() ? `••••${secret.trim().slice(-4)}` : undefined)

export function saveIntegration(next: Integration) {
  write(items.some((x) => x.id === next.id) ? items.map((x) => (x.id === next.id ? next : x)) : [...items, next])
}

export function removeIntegration(id: string) {
  write(items.filter((x) => x.id !== id || !x.custom))
}

export function setEnabled(id: string, enabled: boolean) {
  write(items.map((x) => (x.id === id ? { ...x, enabled, status: enabled ? (x.status === 'paused' ? 'connected' : x.status) : 'paused' } : x)))
}

/** Prototype check: works when the address, the sign-in and a secret (where one is needed) are all filled in. */
export function testIntegration(id: string): { ok: boolean; reason?: Bi } {
  const x = items.find((i) => i.id === id)
  if (!x) return { ok: false }
  let reason: Bi | undefined
  if (!x.baseUrl.trim()) reason = { en: 'No address (base URL) yet.', ar: 'لا يوجد عنوان (Base URL) بعد.' }
  else if (!x.baseUrl.trim().startsWith('https://')) reason = { en: 'The address must start with https://', ar: 'يجب أن يبدأ العنوان بـ https://' }
  else if (x.auth !== 'none' && x.auth !== 'oauth' && !x.secretHint) reason = { en: 'No key or password entered yet.', ar: 'لم يُدخل مفتاح أو كلمة مرور بعد.' }
  const ok = !reason
  write(
    items.map((i) =>
      i.id === id
        ? {
            ...i,
            status: ok ? (i.enabled ? 'connected' : 'paused') : 'error',
            lastSync: ok ? new Date().toISOString() : i.lastSync,
            lastError: ok ? undefined : reason?.en,
          }
        : i,
    ),
  )
  return { ok, reason }
}

export function newIntegration(): Integration {
  return {
    id: `int-${Date.now().toString(36)}`,
    name: '',
    scope: '',
    data: '',
    direction: 'in',
    method: 'rest',
    baseUrl: 'https://',
    auth: 'api_key',
    schedule: 'daily',
    runAt: '06:00',
    owner: '',
    status: 'not_connected',
    enabled: false,
    custom: true,
  }
}

