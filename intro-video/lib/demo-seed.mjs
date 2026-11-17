// Demo seed: swaps every person name / contact detail in the app's sample
// data for clearly invented ones, at capture time only. The app's source is
// not touched — Playwright rewrites the JS modules Vite serves from /src/.
//
// Names follow the rule: common first name + made-up family name.

export const NAME_MAP = [
  // After-Sales customers (data/afterSales.ts)
  ['Khalid Al-Marri', 'Yara Belcarro'],
  ['Sara Haddad', 'Tomas Quillfeather'],
  ['Mohammed Idris', 'Layla Zentrovik'],
  ['Aisha Noor', 'Omar Pindlewick'],
  ['Peter Nassar', 'Nadia Crumbleton'],
  ['Huda Barakat', 'Karim Velloquay'],
  // After-Sales agents
  ['Yousef A.', 'Sami Pellwhistle'],
  ['Mariam H.', 'Rana Dorflax'],
  // Real Estate agents (data/agentScores.ts)
  ['Sara M.', 'Hana Trumbleby'],
  ['Hamad F.', 'Ziad Fennimoot'],
  ['Rania Q.', 'Maya Quorvell'],
  ['Tariq S.', 'Adam Sprocketti'],
  ['Dana Y.', 'Dana Yellowquist'],
  // Mystery shoppers (data/shoppers.ts)
  ['Lina K.', 'Lina Kazoodle'],
  ['Omar R.', 'Rami Rumbellow'],
  ['Fatima S.', 'Salma Snorvig'],
  ['James T.', 'Leo Tumblewick'],
  ['Noura A.', 'Noura Aldervane'],
  ['Khalid M.', 'Fadi Marblethorn'],
  // Other products (data/otherProducts.ts)
  ['A. Rashid', 'A. Wobblethorpe'],
  ['N. Haidari', 'N. Quincefield'],
  ['Fadi K.', 'Fadi Kazimbo'],
  ['Lama S.', 'Lama Sprindle'],
  ['Imad R.', 'Imad Rubbleton'],
  ['Samer T.', 'Samer Tinklevar'],
  ['Rola H.', 'Rola Hobbleford'],
  ['Bassel N.', 'Bassel Nibbleworth'],
]

function seed(js) {
  let out = js
  for (const [real, fake] of NAME_MAP) out = out.split(real).join(fake)
  // Emails like lina.k@psi.example → demo addresses
  out = out.replace(/[a-z0-9]+\.[a-z]@[a-z]+\.example/g, 'demo.user@example.invalid')
  // Full UAE-format mobiles → obviously fake
  out = out.replace(/\+9715\d{8}/g, '+000 0000 0000')
  // Masked mobiles '+9715••••212' → '+000 ••• 0000'
  out = out.replace(/\+9715•+\d{3}/g, '+000 ••• 0000')
  return out
}

/** Install the seed on a Playwright page or context. */
export async function installDemoSeed(target) {
  await target.route(/\/src\/(data|pages|lib)\/.*\.tsx?(\?.*)?$/, async (route) => {
    const res = await route.fetch()
    const body = await res.text()
    await route.fulfill({ response: res, body: seed(body) })
  })
}
