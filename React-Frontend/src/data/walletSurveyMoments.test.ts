import { describe, expect, it } from 'vitest'
import type { Bi } from '@/types'
import { MOCK_PRODUCT_SURVEY_MOMENTS } from '@/services/mockData'
import { PRODUCTS } from './products'
import { SURVEY_QUESTION_SETS, questionSetsFor } from './surveyQuestions'
import { PRODUCT_SURVEY_RULES, WALLET_SIGNALS_NO_SURVEY } from './v38Reference'

/** v42.3 and v42.4 F35: PSI Wallet survey moments (docs/V42_WALLET.md). The strings are the prototype's, verbatim. */

const ARABIC = /[؀-ۿ]/
const bilingual = (s: Bi, where: string) => {
  expect(s.en.trim(), `${where} en`).not.toBe('')
  expect(s.ar, `${where} ar`).toMatch(ARABIC)
  // the Arabic is a translation, never the English left in place
  expect(s.ar, `${where} ar differs from en`).not.toBe(s.en)
}

const wallet = questionSetsFor('wl')
const [setup, call, addp, nps] = wallet

describe('PSI Wallet question sets (v42.3 F35)', () => {
  it('has four sets, one per touchpoint, in the prototype order', () => {
    expect(wallet.map((s) => s.id)).toEqual(['setup', 'call', 'addp', 'nps'])
    expect(wallet.map((s) => s.name.en)).toEqual(['CES after the wallet is created', 'CSAT after the call with the advisor', 'CES after a property is added', 'NPS on the Dashboard, 30 days after'])
    expect(wallet.map((s) => s.name.ar)).toEqual(['CES بعد إنشاء المحفظة', 'CSAT بعد المكالمة مع المستشار', 'CES بعد إضافة عقار', 'NPS على لوحة المعلومات بعد 30 يوماً'])
  })

  it('every string of the four sets has English and Arabic', () => {
    for (const s of wallet) {
      bilingual(s.name, `${s.id} name`)
      bilingual(s.when, `${s.id} when`)
      s.questions.forEach((q, i) => bilingual(q, `${s.id} question ${i + 1}`))
    }
  })

  it('the wording was decided after the Wallet review of 19 Nov: no set is [Proposed], though the product is not launched', () => {
    expect(PRODUCTS.find((p) => p.id === 'wl')?.live).toBe(false)
    for (const s of wallet) expect(s.proposed, s.id).toBeUndefined()
  })

  it('says when each one fires, verbatim', () => {
    expect(setup.when.en).toBe('Screen 12 to 13, once. Onboarding is a seven-step task: effort matters, satisfaction tells less')
    expect(setup.when.ar).toBe('الشاشة 12 إلى 13، مرة واحدة. الإعداد مهمة من سبع خطوات: الجهد هو المهم، والرضا يقول أقل')
    // v42.4: the advisor's "call done" mark in the CRM, not the app's button
    expect(call.when.en).toBe("Fires when the advisor marks the call done in the CRM (not on the app's Request a call button), within 2 hours. A human interaction with a clear start and end")
    expect(call.when.ar).toBe('يُرسل عندما يعلّم المستشار المكالمة منجزة في CRM (لا عند زر طلب المكالمة في التطبيق)، خلال ساعتين. تفاعل بشري له بداية ونهاية واضحتان')
    // v42.4: tagged single or bulk, and the answer carries the number of properties
    expect(addp.when.en).toBe("Screen 51 (what's next), once per add; the answer is tagged single or bulk and carries the number of properties")
    expect(addp.when.ar).toBe('الشاشة 51 (ما التالي)، مرة لكل إضافة؛ تُوسم الإجابة فردي أو جماعي وتحمل عدد العقارات')
    // v42.4: only when the wallet holds a property, and inside the 90-day cap it shares with the Real Estate NPS
    expect(nps.when.en).toBe('Screen 13 as a periodic prompt about 30 days after the wallet was created and only if it holds at least one property, then yearly. Never at a touchpoint; shares the 90-day cap with the Real Estate NPS')
    expect(nps.when.ar).toBe('الشاشة 13 كتنبيه دوري بعد نحو 30 يوماً من إنشاء المحفظة وفقط إذا كانت تحوي عقاراً واحداً على الأقل، ثم سنوياً. لا عند نقطة تماس أبداً؛ تشترك في سقف الـ90 يوماً مع NPS العقارات')
  })

  it('one rating and one optional comment per touchpoint, then the follow-up a low score opens', () => {
    for (const s of [setup, call, addp]) {
      expect(s.questions, s.id).toHaveLength(3)
      expect(s.questions[1], s.id).toEqual({ en: 'Optional: anything you would like to add?', ar: 'اختياري: هل تود إضافة شيء؟' })
    }
    // the two effort questions are on 1 to 7, the satisfaction question on 1 to 5
    expect(setup.questions[0]).toEqual({ en: 'The wallet was easy to set up. (1 strongly disagree to 7 strongly agree)', ar: 'كان إعداد المحفظة سهلاً. (1 لا أوافق بشدة إلى 7 أوافق بشدة)' })
    expect(addp.questions[0]).toEqual({ en: 'Adding my property was easy. (1 strongly disagree to 7 strongly agree)', ar: 'كانت إضافة عقاري سهلة. (1 لا أوافق بشدة إلى 7 أوافق بشدة)' })
    expect(call.questions[0]).toEqual({ en: 'How satisfied were you with your call with your advisor? (1 to 5)', ar: 'ما مدى رضاك عن مكالمتك مع مستشارك؟ (1 إلى 5)' })
  })

  it('names the follow-up thresholds: CES 4 or less, CSAT 3 or less, and a low call score notifies the advisor team', () => {
    const cesFollowUp = { en: 'If 4 or less: What went wrong? (short text)', ar: 'إذا كانت 4 أو أقل: ما الذي حدث؟ (نص قصير)' }
    expect(setup.questions[2]).toEqual(cesFollowUp)
    expect(addp.questions[2]).toEqual(cesFollowUp)
    expect(call.questions[2]).toEqual({ en: 'If 3 or less: What went wrong? (short text), and the advisor team is notified', ar: 'إذا كانت 3 أو أقل: ما الذي حدث؟ (نص قصير)، ويُبلَّغ فريق المستشارين' })
  })

  it('the NPS is the relationship question on the Dashboard: two questions, no follow-up by score', () => {
    expect(nps.questions).toEqual([
      { en: 'How likely are you to recommend the PSI Wallet to another investor? (0 to 10)', ar: 'ما مدى احتمال أن توصي بمحفظة PSI لمستثمر آخر؟ (0 إلى 10)' },
      { en: 'What is the main reason for your score?', ar: 'ما السبب الرئيسي لدرجتك؟' },
    ])
  })

  it('leaves the other products as they were, and no product is without a set any more', () => {
    expect(SURVEY_QUESTION_SETS).toHaveLength(13)
    expect(SURVEY_QUESTION_SETS.filter((s) => s.product !== 'wl')).toHaveLength(9)
    for (const p of PRODUCTS) expect(questionSetsFor(p.id).length, p.id).toBeGreaterThan(0)
    // set ids repeat across products (`nps` in four of them) but never inside one
    for (const p of PRODUCTS) expect(new Set(questionSetsFor(p.id).map((s) => s.id)).size, p.id).toBe(questionSetsFor(p.id).length)
  })
})

describe('PSI Wallet "When this product asks" (v42.3 F35)', () => {
  const rule = PRODUCT_SURVEY_RULES.find((r) => r.product === 'wl')!

  it('carries the five texts of the prototype, verbatim, in both languages', () => {
    expect(rule.completed).toEqual({ en: 'Wallet created (screens 12 to 13), a call with the advisor (48), a property added (51)', ar: 'إنشاء المحفظة (الشاشتان 12 إلى 13)، مكالمة مع المستشار (48)، إضافة عقار (51)' })
    expect(rule.nps).toEqual({ en: 'On the Dashboard (13) about 30 days after the wallet was created, then yearly; never at a touchpoint', ar: 'على لوحة المعلومات (13) بعد نحو 30 يوماً من إنشاء المحفظة ثم سنوياً؛ لا عند نقطة تماس أبداً' })
    expect(rule.csat).toEqual({ en: 'After the call with the advisor (48): "How satisfied were you with your call with your advisor?" 1 to 5', ar: 'بعد المكالمة مع المستشار (48): "ما مدى رضاك عن مكالمتك مع مستشارك؟" 1 إلى 5' })
    expect(rule.ces).toEqual({
      en: 'After the wallet is created (13): "The wallet was easy to set up" 1 to 7. After a property is added (51): "Adding my property was easy" 1 to 7, tagged single or bulk',
      ar: 'بعد إنشاء المحفظة (13): "كان إعداد المحفظة سهلاً" 1 إلى 7. بعد إضافة عقار (51): "كانت إضافة عقاري سهلة" 1 إلى 7، موسومة فردي أو جماعي',
    })
    expect(rule.whatStoppedYou).toEqual({
      en: 'One rating and one optional comment per touchpoint, never two questions. CES 4 or less, CSAT 3 or less: a short "What went wrong?" opens; a low call score also notifies the advisor team. High scores: "Thanks" only.',
      ar: 'تقييم واحد وتعليق اختياري واحد لكل نقطة تماس، لا سؤالان أبداً. CES 4 أو أقل، CSAT 3 أو أقل: يُفتح حقل قصير "ما الذي حدث؟"؛ والدرجة المنخفضة للمكالمة تُبلّغ فريق المستشارين أيضاً. الدرجات العالية: "شكراً" فقط.',
    })
  })

  it('the source line is unchanged (the prototype did not touch it), and every product still has exactly one row', () => {
    expect(rule.sources.en).toBe('PSI Wallet app only; indicators on Wallet’s own line')
    expect(PRODUCT_SURVEY_RULES.map((r) => r.product).sort()).toEqual(['af', 'cl', 'ev', 're', 'to', 'wl'])
  })

  it('agrees with the question sets: the same questions and the same thresholds', () => {
    expect(rule.csat.en).toContain(call.questions[0].en.replace(' (1 to 5)', ''))
    expect(rule.ces.en).toContain('"The wallet was easy to set up" 1 to 7')
    expect(rule.ces.en).toContain('"Adding my property was easy" 1 to 7')
    expect(rule.whatStoppedYou.en).toContain('CES 4 or less, CSAT 3 or less')
  })

  it('the per-product line of Surveys and triggers follows: one question per touchpoint, and the Wallet has an NPS', () => {
    const line = MOCK_PRODUCT_SURVEY_MOMENTS.find((m) => m.product === 'wl')!
    expect(line.hasNps).toBe(true)
    expect(line.momentsSummary.en).toBe('One question per touchpoint: CES after the wallet is created, CSAT after the call with the advisor, CES after a property is added. NPS only on the Dashboard about 30 days after, then yearly.')
    bilingual(line.momentsSummary, 'summary')
    // PSI Events stays the one product without an NPS
    expect(MOCK_PRODUCT_SURVEY_MOMENTS.filter((m) => !m.hasNps).map((m) => m.product)).toEqual(['ev'])
  })
})

describe('PSI Wallet "Signals, no survey" (v42.4 F35)', () => {
  const card = WALLET_SIGNALS_NO_SURVEY

  it('has the heading, the hint and the two column headings of the prototype, in both languages', () => {
    expect(card.title).toEqual({ en: 'Signals, no survey', ar: 'إشارات بلا استبيان' })
    expect(card.hint).toEqual({
      en: 'From the approved design (85 screens). Each becomes a signal in the portal; nothing is asked of the investor.',
      ar: 'من التصميم المعتمد (85 شاشة). كل واحدة تصبح إشارة في البورتال؛ لا يُسأل المستثمر شيئاً.',
    })
    expect(card.moment).toEqual({ en: 'Moment (screen)', ar: 'اللحظة (الشاشة)' })
    expect(card.signal).toEqual({ en: 'Signal', ar: 'الإشارة' })
  })

  it('lists the seven moments in the prototype order, each with its screens in brackets', () => {
    expect(card.rows.map((r) => r.moment.en)).toEqual([
      'Wallet started, not opened after 7 days (05 to 11)',
      'Request a call not actioned inside its clock (48, Activity 81)',
      'Property still pending after 5 working days (51, 43)',
      'Document unverified after 5 working days (70, 45)',
      'Upload or scan failed (58, 70)',
      'Viewing requested, no slot after 2 working days (81)',
      'Deal started, listed for sale, stage advanced (56, 67, 47)',
    ])
    for (const r of card.rows) expect(r.moment.en, r.moment.en).toMatch(/\(.*\d.*\)$/)
    expect(new Set(card.rows.map((r) => r.moment.en)).size).toBe(7)
  })

  it('names the signal each moment becomes, verbatim', () => {
    expect(card.rows.map((r) => r.signal.en)).toEqual([
      'One "What stopped you?" once, then abandoned onboarding with the step reached',
      "Promise not kept, on the advisor's line",
      'Process signal, Wallet operations lead',
      'Process signal',
      'Product signal to the Wallet product owner, Information Security informed',
      'Promise not kept on the Real Estate line; the viewing itself takes the Real Estate CSAT and CES',
      'Hand-off to the Real Estate journey with the PSI Wallet source badge; the signed deal takes the Real Estate NPS',
    ])
    expect(card.rows[0].signal.ar).toBe('سؤال "ما الذي أوقفك؟" مرة واحدة، ثم إعداد متروك مع الخطوة التي وصلها')
    expect(card.rows[4].signal.ar).toBe('إشارة منتج لمالك منتج المحفظة، ويُبلَّغ أمن المعلومات')
    expect(card.rows[6].signal.ar).toBe('تحويل لرحلة العقارات بشارة مصدر PSI Wallet؛ الصفقة الموقّعة تأخذ NPS العقارات')
  })

  it('every row has English and Arabic, and names titles only, never a person', () => {
    for (const r of card.rows) {
      bilingual(r.moment, r.moment.en)
      bilingual(r.signal, r.signal.en)
    }
    const titles = card.rows.map((r) => r.signal.en).join(' ')
    for (const title of ['Wallet operations lead', 'Wallet product owner', 'Information Security']) expect(titles).toContain(title)
  })
})
