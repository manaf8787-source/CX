export interface TemplateCheck {
  id: string
  source: 'meta' | 'tip'
  passed: boolean
  text: { en: string; ar: string }
}

function variableTokens(body: string): string[] {
  return body.match(/\{\{\d+\}\}/g) ?? []
}

/** Faithful port of the WhatsApp template checks described in the docs
 * (Programme KB section 23): numbered variables in order, not at the
 * start/end, never adjacent; body ≤1024 chars; no shortened links; category
 * is Utility only when tied to a specific order/visit/case/task, otherwise
 * Marketing, which then requires opt-out wording. Meta makes the final call
 * and can recategorise — this is a pre-check, not an approval. */
export function validateTemplate(bodyEn: string, bodyAr: string, tiedToTask: boolean) {
  const checks: TemplateCheck[] = []
  const bodies = [bodyEn, bodyAr]

  const tooLong = bodies.some((b) => b.length > 1024)
  checks.push({ id: 'length', source: 'meta', passed: !tooLong, text: { en: 'Body is 1,024 characters or fewer', ar: 'النص 1024 حرفاً أو أقل' } })

  const orderOk = bodies.every((b) => {
    const tokens = variableTokens(b).map((v) => Number(v.replace(/\D/g, '')))
    return tokens.every((n, i) => n === i + 1)
  })
  checks.push({ id: 'order', source: 'meta', passed: orderOk, text: { en: 'Variables are numbered in order: {{1}}, {{2}}…', ar: 'المتغيرات مرقّمة بالترتيب: {{1}}, {{2}}…' } })

  const notAtEdges = bodies.every((b) => {
    const trimmed = b.trim()
    return !trimmed.startsWith('{{') && !/\}\}$/.test(trimmed)
  })
  checks.push({ id: 'edges', source: 'meta', passed: notAtEdges, text: { en: 'Message does not start or end with a variable', ar: 'الرسالة لا تبدأ أو تنتهي بمتغير' } })

  const notAdjacent = bodies.every((b) => !/\}\}\s*\{\{/.test(b))
  checks.push({ id: 'adjacent', source: 'meta', passed: notAdjacent, text: { en: 'No two variables are adjacent', ar: 'لا يوجد متغيران متجاوران' } })

  const noShortLinks = bodies.every((b) => !/(bit\.ly|tinyurl\.com|t\.co\/)/i.test(b))
  checks.push({ id: 'links', source: 'meta', passed: noShortLinks, text: { en: 'No shortened links', ar: 'بدون روابط مختصرة' } })

  const category: 'Utility' | 'Marketing' = tiedToTask ? 'Utility' : 'Marketing'
  const hasOptOut = bodies.every((b) => /(stop|unsubscribe|إلغاء الاشتراك|أوقف)/i.test(b))
  if (category === 'Marketing') {
    checks.push({ id: 'optout', source: 'meta', passed: hasOptOut, text: { en: 'Marketing wording includes an opt-out', ar: 'تتضمن الصياغة التسويقية خيار إلغاء الاشتراك' } })
  }

  const totalVars = Math.max(variableTokens(bodyEn).length, variableTokens(bodyAr).length)
  const tooManyVarsForLength = totalVars > 4 && Math.max(bodyEn.length, bodyAr.length) < 150
  checks.push({ id: 'density', source: 'tip', passed: !tooManyVarsForLength, text: { en: 'Not too many variables for a short message', ar: 'عدد المتغيرات مناسب لطول الرسالة' } })

  return { checks, category }
}
