import { canViewAgentNames, canViewConversationText, resolveAgentDisplay } from '../../auth/permissions'
import type {
  AgentDirectoryEntry,
  Bi,
  CorrectiveAction,
  DetractorCallItem,
  Interaction,
  Pattern,
  Persona,
  Person,
  RoleId,
  ShopperCase,
  Signal,
} from '../../types'

/**
 * The client-side "built-in bilingual keyword parser" the AI Agents
 * Specification describes as the fallback engine, and the one the
 * Integration Plan names as the acceptance test for the real one ("anything
 * it answers, the live assistant must answer the same") —
 * APPLICATION_MODULES.md §B. This is deliberately a thin adapter over the
 * same repository data every page already reads (no second data source),
 * so the assistant's "understanding" is pattern-matched but its *answers*
 * are always real, computed figures — never an invented number.
 *
 * Fully mocked per the user's Phase 2 decision: no network call, no model.
 */

export interface AssistantDataset {
  persons: Person[]
  interactions: Interaction[]
  signals: Signal[]
  patterns: Pattern[]
  correctiveActions: CorrectiveAction[]
  shopperCases: ShopperCase[]
  personas: Persona[]
  detractorCallItems: DetractorCallItem[]
  agentDirectory: AgentDirectoryEntry[]
  /** Same object Home's tiles read (`useHomeSummary`) — reused here, not
   * recomputed, so the assistant's answer can never disagree with Home's
   * own number for the same figure. */
  homeSummary?: { runawayCount: number; openActions: number; personaCount: number; journeysViewed: number; toCall: number }
}

export interface AssistantAnswer {
  text: Bi
  /** Set when the query resolved to one person — the panel offers a
   * "View their journey" action, mirroring FR-1.1's Home-search hand-off. */
  matchedPersonId?: string
}

function normalize(s: string): string {
  return s.trim().toLowerCase()
}

function findPerson(needle: string, persons: Person[]): Person | undefined {
  if (!needle) return undefined
  return persons.find(
    (p) => p.name.toLowerCase().includes(needle) || (p.identity.mobile && p.identity.mobile.includes(needle)) || p.id === needle,
  )
}

export function answerQuestion(rawQuery: string, role: RoleId, data: AssistantDataset): AssistantAnswer {
  const query = normalize(rawQuery)
  if (!query) {
    return {
      text: {
        en: 'Ask about a person by name or mobile number, or ask a free-text question — open actions, runaway count, personas, signals, the call list.',
        ar: 'اسأل عن شخص بالاسم أو رقم الجوال، أو اطرح سؤالاً حراً — الإجراءات المفتوحة، عدد الهاربين، الشخصيات، الإشارات، قائمة الاتصال.',
      },
    }
  }

  // --- "Who handled / who owns" — agent-name resolution, role-gated -------
  if (/\bwho (handled|owns|is the agent)\b/.test(query) || /من (تعامل|المسؤول)/.test(query)) {
    const withAgent = data.signals.find((s) => s.agentRef)
    if (withAgent?.agentRef) {
      const display = resolveAgentDisplay(
        withAgent.agentRef,
        role,
        data.agentDirectory,
        { en: 'Agent (name withheld)', ar: 'وكيل (الاسم محجوب)' },
        'en',
      )
      return {
        text: {
          en: `The most recent matching signal is with ${display.label}.${canViewAgentNames(role) ? '' : ' Agent names are visible to CX and the agent’s own management only.'}`,
          ar: `أحدث إشارة مطابقة هي مع ${display.label}.${canViewAgentNames(role) ? '' : ' تُعرض أسماء الوكلاء لفريق تجربة العملاء وإدارتهم المباشرة فقط.'}`,
        },
      }
    }
  }

  // --- Conversation text — demonstrates the role gate live, not just a count ---
  if (/what did .* say|conversation|what.*complain/.test(query) || /ماذا قال|نص المحادثة|شكو/.test(query)) {
    if (!canViewConversationText(role)) {
      return {
        text: {
          en: 'Conversation text is visible to the CX team and CX manager only — I can still give you counts and categories.',
          ar: 'نص المحادثة مرئي لفريق تجربة العملاء ومديرها فقط — يمكنني إعطاؤك الأعداد والفئات.',
        },
      }
    }
    const withText = data.interactions.find((i) => i.text)
    if (withText) {
      return {
        text: {
          en: `Most recent note on record: "${withText.text}" (${withText.channel}, ${new Date(withText.occurredAt).toLocaleDateString()}).`,
          ar: `آخر ملاحظة مسجّلة: "${withText.text}" (${withText.channel}، ${new Date(withText.occurredAt).toLocaleDateString()}).`,
        },
      }
    }
  }

  // --- Shopper cases -------------------------------------------------------
  if (/critical.*shopper|shopper.*critical/.test(query) || /حرج.*تسوق|تسوق.*حرج/.test(query)) {
    const critical = data.shopperCases.filter((c) => c.severity === 'critical')
    const open = critical.filter((c) => c.status !== 'closed')
    return {
      text: {
        en: `${critical.length} critical mystery-shopper case${critical.length === 1 ? '' : 's'} on record, ${open.length} still open.`,
        ar: `${critical.length} حالة تسوق سري حرجة مسجّلة، ${open.length} منها لا تزال مفتوحة.`,
      },
    }
  }
  if (/shopper case/.test(query) || /حالات التسوق/.test(query)) {
    return {
      text: {
        en: `${data.shopperCases.length} shopper cases on record across ${new Set(data.shopperCases.map((c) => c.environment)).size} environments.`,
        ar: `${data.shopperCases.length} حالة تسوق مسجّلة عبر ${new Set(data.shopperCases.map((c) => c.environment)).size} بيئة.`,
      },
    }
  }

  // --- Open actions ----------------------------------------------------------
  if (/open action/.test(query) || /action.*open/.test(query) || /إجراء.*مفتوح|الإجراءات المفتوحة/.test(query)) {
    const proposed = data.correctiveActions.filter((a) => a.status === 'proposed').length
    const count = data.homeSummary?.openActions ?? data.correctiveActions.filter((a) => a.status !== 'effective' && a.status !== 'failed').length
    return {
      text: {
        en: `${count} open corrective action${count === 1 ? '' : 's'}, ${proposed} still waiting on an owner's decision.`,
        ar: `${count} إجراءً تصحيحياً مفتوحاً، ${proposed} منها بانتظار قرار المالك.`,
      },
    }
  }

  // --- Runaway ---------------------------------------------------------------
  if (/runaway/.test(query) || /هارب/.test(query)) {
    const count = data.homeSummary?.runawayCount
    return {
      text: {
        en: count === undefined ? 'Open the Runaway customers page for the live count and the six-type breakdown.' : `${count} customers currently classified as runaway. Open the Runaway customers page for the six-type breakdown and "what we keep doing wrong".`,
        ar: count === undefined ? 'افتح صفحة العملاء الهاربين للاطلاع على العدد الحي وتوزيع الأنواع الستة.' : `${count} عميلاً مصنَّفاً حالياً كهارب. افتح صفحة العملاء الهاربين للاطلاع على توزيع الأنواع الستة و"ما نستمر في فعله خطأً".`,
      },
    }
  }

  // --- Personas ----------------------------------------------------------------
  if (/persona/.test(query) || /شخصي/.test(query)) {
    const approved = data.personas.filter((p) => p.approvedByCxManager).length
    const names = data.personas.map((p) => p.name.en).slice(0, 6).join(', ')
    return {
      text: {
        en: `${data.personas.length} personas (${approved} approved by the CX manager): ${names}.`,
        ar: `${data.personas.length} شخصية (${approved} معتمدة من مدير تجربة العملاء).`,
      },
    }
  }

  // --- Signals / patterns --------------------------------------------------
  if (/pattern/.test(query) || /نمط/.test(query)) {
    const eligible = data.patterns.filter((p) => p.hasMinimumSample).length
    return {
      text: {
        en: `${data.patterns.length} patterns past threshold, ${eligible} with enough sample to propose a fix without an investigation first.`,
        ar: `${data.patterns.length} نمطاً تجاوز الحد، ${eligible} منها بعينة كافية لاقتراح إصلاح دون تحقيق مسبق.`,
      },
    }
  }
  if (/signal/.test(query) || /إشارة|الإشارات/.test(query)) {
    const publicCount = data.signals.filter((s) => s.isPublic).length
    return {
      text: {
        en: `${data.signals.length} signals in the current window, ${publicCount} from public channels.`,
        ar: `${data.signals.length} إشارة ضمن النافذة الحالية، ${publicCount} منها من قنوات عامة.`,
      },
    }
  }

  // --- Close the loop / call list ---------------------------------------------
  if (/to.?call|call list|close the loop|detractor/.test(query) || /قائمة الاتصال|إغلاق الحلقة|منتقد/.test(query)) {
    const pending = data.detractorCallItems.filter((d) => !d.outcome)
    const critical = pending.filter((d) => d.severity === 'critical')
    return {
      text: {
        en: `${pending.length} detractors still to call this month, ${critical.length} critical — critical is always called at 100%.`,
        ar: `${pending.length} منتقداً ما زال بانتظار الاتصال هذا الشهر، ${critical.length} منهم حرج — تُغطّى الحالات الحرجة بنسبة 100% دائماً.`,
      },
    }
  }

  // --- Person lookup (name or mobile), tried last so keyword intents win first ---
  const match = findPerson(query, data.persons)
  if (match) {
    return {
      text: {
        en: `Found ${match.name} — ${match.type}, ${match.environment}. Open their Customers journey for the full timeline and AI reading.`,
        ar: `تم العثور على ${match.name} — ${match.type === 'customer' ? 'عميل' : 'عميل محتمل'}, ${match.environment}. افتح رحلة العميل للاطلاع على الجدول الزمني الكامل وقراءة الذكاء الاصطناعي.`,
      },
      matchedPersonId: match.id,
    }
  }

  return {
    text: {
      en: 'No match in the sample data for that. Try a person’s name or mobile number, or ask about open actions, runaway count, personas, signals, patterns, shopper cases or the call list.',
      ar: 'لا توجد نتيجة مطابقة في البيانات التجريبية. جرّب اسم شخص أو رقم جواله، أو اسأل عن الإجراءات المفتوحة، عدد الهاربين، الشخصيات، الإشارات، الأنماط، حالات التسوق، أو قائمة الاتصال.',
    },
  }
}

/** Suggestion chips shown above the input — each is a real, answerable
 * query against the dataset above, not a decorative placeholder. */
export const SUGGESTED_QUERIES: Bi[] = [
  { en: 'Open actions', ar: 'الإجراءات المفتوحة' },
  { en: 'Critical shopper cases', ar: 'حالات التسوق الحرجة' },
  { en: 'Personas', ar: 'الشخصيات' },
  { en: 'Signals and patterns', ar: 'الإشارات والأنماط' },
  { en: 'Call list', ar: 'قائمة الاتصال' },
]
