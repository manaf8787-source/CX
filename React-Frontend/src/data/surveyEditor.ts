import { useSyncExternalStore } from 'react'
import { SURVEY_QUESTION_SETS } from './surveyQuestions'
import type { Bi, ProductId } from '../types'

/**
 * The survey questions as data the CX manager edits (owner's request, 22 Nov): change the wording in both languages, add or remove a
 * question, add a set for a new moment. The starting point is the v40 sets in `surveyQuestions.ts`; edits live in this browser's
 * localStorage. A question can carry a type (NPS 0 to 10, rating 1 to 5, choice, yes or no, open text).
 *
 * Prototype only. In the real platform these are two tables (sets, questions) behind the survey agent, and an edit applies to the next
 * survey sent, never to one already sent.
 */
export interface EditableQuestion extends Bi {
  /** Key of `LEGACY_QUESTION_TYPE_LABEL` in data/surveyVocabulary.ts. */
  kind?: string
  /** A choice question's options, one per row (campaign builder). Older questions write them in brackets in the wording instead. */
  choices?: Bi[]
  /** Where each answer goes next (campaign builder). Without it every answer goes to the next question. */
  next?: Routing
}

/** `next`: the question after this one; `end`: finish the survey; a number: jump to that question (0-based, always a later one). */
export type Target = 'next' | 'end' | number

/** One branch: answers that match go to `to`. `value` is "yes"/"no", an option's English text, or a score as text. */
export interface Route {
  op: 'is' | 'atLeast' | 'atMost'
  value: string
  to: Target
}

/** The first matching route wins; anything else goes to `otherwise`. */
export interface Routing {
  routes: Route[]
  otherwise: Target
}

export interface EditableSet {
  product: ProductId
  id: string
  name: Bi
  when: Bi
  questions: EditableQuestion[]
  proposed?: boolean
  /** Added in the portal, not one of the v40 sets: only these can be deleted. */
  custom?: boolean
}

/** The measurement sets that feed the indicators; changing their wording asks for a second confirmation. */
export const CORE_SET_IDS = ['nps', 'tx', 'ces', 're2']

const KEY = 'psicx.surveySets'

function seed(): EditableSet[] {
  return SURVEY_QUESTION_SETS.map((s) => ({ ...s, name: { ...s.name }, when: { ...s.when }, questions: s.questions.map((q) => ({ ...q })) }))
}

function read(): EditableSet[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as EditableSet[]
      if (Array.isArray(parsed) && parsed.length) return parsed
    }
  } catch {
    /* storage unavailable: lasts until reload */
  }
  return seed()
}

let sets: EditableSet[] = read()
const listeners = new Set<() => void>()

function write(next: EditableSet[]) {
  sets = next
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

export function listSets(): EditableSet[] {
  return sets
}

export function useEditableSets(): EditableSet[] {
  return useSyncExternalStore(subscribe, listSets, listSets)
}

const mapSet = (setId: string, fn: (s: EditableSet) => EditableSet) => write(sets.map((s) => (s.id === setId ? fn(s) : s)))

export function updateQuestion(setId: string, index: number, patch: Partial<EditableQuestion>) {
  mapSet(setId, (s) => ({ ...s, questions: s.questions.map((q, i) => (i === index ? { ...q, ...patch } : q)) }))
}

export function addQuestion(setId: string, q: EditableQuestion) {
  mapSet(setId, (s) => ({ ...s, questions: [...s.questions, q] }))
}

export function removeQuestion(setId: string, index: number) {
  mapSet(setId, (s) => ({ ...s, questions: s.questions.filter((_, i) => i !== index) }))
}

export function addSet(input: { product: ProductId; name: Bi; when: Bi; questions?: EditableQuestion[] }): EditableSet {
  const set: EditableSet = {
    product: input.product,
    id: `c-${Date.now().toString(36)}`,
    name: input.name,
    when: input.when,
    questions: input.questions ?? [{ en: '', ar: '' }],
    custom: true,
  }
  write([...sets, set])
  return set
}

export function removeSet(setId: string) {
  write(sets.filter((s) => s.id !== setId || !s.custom))
}

/** Back to the v40 sets (the page's "Reset"). */
export function resetSets() {
  write(seed())
}

