# Page-by-page analysis

All values measured at a 1912px desktop viewport unless noted. Shadow names refer to `../tokens/shadows.json`. Responsive changes are in `responsive-design.md`.

## Shared section pattern

Every content section follows one template:

- Section: full width, `padding: 40px 0 96px` (first content section `72px 0 96px`).
- Container: `max-width: 1180px`, `padding: 0 72px` (content width 1036px), column, `gap: 48px` between header and body.
- Header: centred column, `gap: 18px`: eyebrow pill -> Heading 2 -> optional Body L intro (max ~540px).
- Entrance: header and body fade up (opacity 0, y 24 -> 1, 0; 1s ease-out; once at 50% visibility).

This repetition is what makes the page feel calm; only the body changes.

## Home `/`

### 1. Navigation (fixed)
- **Purpose:** wayfinding and the persistent primary action.
- **Layout:** `padding: 22px 22px 0`; bar `max-width: 1440px`, height 56, `padding: 0 8px 0 14px`, three zones (brand / links / actions) with `gap: 16px`.
- **Links group:** floating pill, `padding: 4px`, `gap: 2px`, light gradient, `raised.light.md` shadow. Each link: `padding: 7px 14px 9px`, 40px high, pill, 14/400 text at 60% opacity; hover -> 100%.
- **Dropdown trigger** ("Use cases"): link + 14px chevron that flips when open.
- **Dropdown panel:** 300px wide, radius 16, `padding: 6px`, white, `popover` shadow, opens 8px below the pill. Rows 288x59, `padding: 10px`, `gap: 12px`, radius 10; 20px icon (`#6E6E6E`), title 14/500, description 13/400 `#767676`. Row hover fills soft grey.
- **Action:** Primary button, 40px high.
- **Background:** the nav wrapper is white; there is no blur or shadow on the bar itself.

### 2. Hero
- **Purpose:** promise + product proof.
- **Layout:** `padding: 142px 72px 40px`, column, `gap: 64px`, centred.
- **Background:** white with a faint line-art SVG ("Deco / Lines", 1360x760) masked by a radial gradient (`60% 70% at 50% 40%`) so it fades at the edges.
- **Copy block:** max 860px, `gap: 22px`. Display heading (72/500, -0.045em, 1.08, balanced, centred); Body L (max 540px, `#6E6E6E`); actions row `gap: 12px`, `padding-top: 12px`: Primary 50px high with leading download icon, Secondary 50px with leading play icon.
- **Entrance:** heading reveals per word (opacity .001, y 40, rotate 4deg, blur 4px -> rest).
- **App window:** see below.

#### Hero app window (the admin seed)
- **Frame:** 1120x620, `padding: 10px`, radius 26, white, `window` shadow. Inner: radius 16, `hairline` shadow, clipped.
- **Sidebar:** 220px, `#F6F6F6`, `padding: 14px 10px`, `gap: 4px`. Brand row (20px mark + 17/500 name, `padding: 4px 8px 14px`). Items 200x36, radius 8, `padding: 0 10px`, `gap: 8px`: 16px icon, 13px label (weight estimated as 500; the exact preset was not isolated), right-aligned 13/400 count. Active item: dark gradient + `raised.dark.sm`, white content. Bottom plan card: radius 10, `padding: 10px`, light gradient, `raised.light.sm`, title 14/500, meta 13/400, 4px meter (`#ECECEC` track, `#161616` fill).
- **Top bar:** 60px, `padding: 0 18px`: 30px round avatar, name 14/500 over meta 13/400 `#767676`; right side "Synced just now" with a slowly spinning 14px icon.
- **Toolbar:** 60px, `padding: 12px 16px`, `gap: 8px`: segmented filter (track radius 999, `#F2F2F2`, `padding: 3px`, `inset.well`; segments `5px 13px 7px`, 29px high; selected dark), search field (240x36, radius 8, `#F2F2F2`, `inset.well`, 14px icon), secondary pill button "Quick profile" and primary pill "New profile" (both 36px, `padding: 4px 14px 6px`, `gap: 6px`, 14px icons).
- **Table:** `padding: 0 16px`. Header 41px, 13/400 `#767676`. Columns (px): select 34, run 46, profile 240, tags 130, proxy 166, note 160, cookies 72. Rows 60px, cell `padding: 11px 10px`, divider 1px `#ECECEC` via `::after`. Cells: 16px checkbox (radius 4); 26px round run button (light = idle with play icon, dark = live with pause icon, 11px icons); name 14/500 over status 13/400; tags (24px pills, light or dark); proxy = 6px status dot + 13/400 text; note 13/400 truncated; cookies numeric.
- **Bottom fade:** table masked `linear-gradient(#000 70%, transparent)` so rows dissolve (decorative; do not reuse on real data).

### 3. Logo rail
- `padding: 56px 0 72px`, `gap: 28px`. Caption 15/400 `#6E6E6E` centred. Infinite horizontal ticker of 24px outline icon + wordmark pairs (22/600 or 19/400 uppercase with +0.08em), each `padding: 0 34px`, at 30% opacity, edges masked to transparent over the outer 15%.

### 4. Use cases (`#use-cases`)
- Grid: 3 columns x 332px, `gap: 20px`.
- **Card:** framed card. Outer 332x450, radius 26, `padding: 8px`, `card.frame`. Inner radius 18, `hairline`, clipped.
  - Photo 316x222 (landscape photography, cover) with a white fade over its lower 55%.
  - **Glass note** over the photo: 280x53, radius 12, white 62%, blur 16px, `glass` shadow, `padding: 10px 12px`, `gap: 10px`: stacked 24px avatars with 2px white rings (or text), title 13/500 + caption 11/400, right status (6px dot + 13/500).
  - Body `padding: 0 26px 28px`, `gap: 22px`: 56px app-icon tile (amber / blue / violet) -> Heading 3 title -> Body M.
- **Hover:** the glass note shifts down to `top: 22px`.

### 5. Why (`#why`) - bento
- Grid: 6 columns, `gap: 16px`. Row 1: Memory (span 4, 685x391) + Fingerprint (span 2). Row 2: three span-2 cards (335x315).
- **Card:** radius 22, white, `card` shadow, `padding: 28px`, `gap: 26px`, clipped. Structure: **well** on top (radius 14, `#F2F2F2`, `padding: 22px`, `gap: 16px`) -> text (`gap: 8px`): Card Title 22/500 + Body M.
- Well contents:
  - *Memory:* four bar rows (`gap: 16px`): label 13px, track 343x12 (pill, `#ECECEC`, `inset.track`), value right. Hero bar fill = dark gradient; others = grey gradient at 62% opacity. Footnote in Caption.
  - *Fingerprint:* 14-column grid of 10px dots, `gap: 7px`; off = `#ECECEC` + `dot.off`, on = dark gradient; dots twinkle. Caption row below.
  - *Native:* three stacked light pills (38px, `4px 16px 6px 8px`, 22px dark check circle) that nudge sideways in a staggered loop.
  - *Battery:* stat "11.5" (56/500, -0.05em) + unit "hrs" (24/500), row of 26px cells (radius 5; lit = dark, unlit = `#ECECEC`) pulsing in a wave.
  - *Launch:* stat "0.8 sec" + three compare chips 72x40 (radius 10; outer light, middle dark and gently scaling).

### 6. Features (`#features`) - tabs
- **Tab bar:** full-width pill, `padding: 5px`, `gap: 4px`, white, `card` shadow. Four equal tabs 254x44 (`padding: 4px 16px 6px`, `gap: 10px`): number chip 26x20 (pill, `#F2F2F2`, 11px) + 13/500 label. A dark indicator pill slides under the active tab; active text turns white and the chip becomes white 28%. Inactive text is 60% opacity. Tabs auto-advance (about every 6s, estimated).
- **Panel:** row, `gap: 16px`. Text card 360x400 (radius 22, `padding: 30px`, `card`): 56px app-icon tile at top, title Heading 3 + Body M pinned to the bottom. Photo card 660x400 (radius 22, clipped, hairline + two soft drops) with cross-fading landscape images and a centred large glass panel (520px, radius 18, blur 18px, `padding: 12px`, rows radius 10 white, `padding: 10px 12px`).

### 7. Reviews
- `padding: 40px 0 110px`. A 1180x760 field with the header centred and six quote bubbles scattered around it, each floating +/-8px on its own slow loop.
- **Bubble:** 300px, `padding: 16px 18px`, white, `card` shadow, radius `20 20 20 6` (author on the left) or `20 20 6 20` (author on the right), quote 14/400. Below, `gap: 12px`: 40px square photo (radius 12, 3px white ring) + name 14/500 + role 12/400 `#767676`.

### 8. Pricing (`#pricing`)
- Container `gap: 18px`; billing toggle: pill, `padding: 4px`, white, `card.sm`; segments `6px 16px 8px` 40px high; selected dark.
- Tiers: 4 columns x 247px, `gap: 16px`. Light tiers sit 16px lower than the featured tier (wrapper `padding: 16px 0`).
- **Light tier:** radius 22, `padding: 24px`, `card`. Name 17/500 -> price 44/500 (-0.05em) + "/ month" 14/400 `#767676` -> note 13/400 -> check chips (30px, `gap: 8px`) -> full-width button 46px (secondary on Free, primary on others).
- **Featured tier:** 247x459, `padding: 30px 24px`, dark radial gradient, `surface.dark`, faint dot-pattern image masked to fade by 55%, "Most picked" light badge top-right, chips use white 7% with white check circles, button is the light secondary with a trailing arrow.

### 9. FAQ (`#faq`)
- Column max 760px, `gap: 10px`. Item: radius 18, white, `card`, clipped. Question row 70px, `padding: 20px 20px 20px 24px`, `gap: 16px`: 17/500 question + 30px dark circular toggle (two 12x2 white bars forming plus; minus when open). Answer `padding: 0 72px 22px 24px`, Body M. First item open by default. Hover nudges the question 3px right.

### 10. Footer
- `padding: 24px 22px 0`, `gap: 30px`. Two cards (`gap: 14px`, total 1180px):
  - Brand card 340x331: dark radial gradient, radius 24, `padding: 28px`, logo + tagline (white 62%), bottom meta in Label style.
  - Links card: white, radius 24, `padding: 28px 32px`, `card`. Three columns (`gap: 20px`): heading 14/500 with 14px bottom padding, links 14/400 at 60% opacity (hover: full opacity + 3px nudge; social links have 16px brand glyphs). Below a divider: two small SEO blurbs in a 2-column grid (`gap: 28px`).
- Giant wordmark (420px, weight 600, -0.07em) filled with a `rgba(0,0,0,.04) -> transparent` gradient, cropped by the page bottom.

### Floating elements
- **Chat pill:** bottom-right, 46px, `padding: 6px 16px 6px 6px`, `gap: 8px`, light gradient, `floating` shadow, 34px avatar, 14/500 label that rolls on hover.
- **Cookie banner:** bottom-left 360px card, radius 20, `toast` shadow; two 38px pill buttons (light "Decline", dark "Accept"). Enters with opacity + transform over .6s ease-out.

## Style guide `/style-guide`

- Same nav; header uses eyebrow + Heading 2 + Body L.
- **Colours:** swatch cards grouped Surface / Ink / Line / Brand / Effects, each with a name and hex or alpha. This is the source of the token names in `color-system.md`.
- **Typography:** 13 named styles with "Desktop / Tablet / Phone - Weight" captions.
- **Buttons:** Primary, Secondary, Ghost.
- **Components:** eyebrow pill, light badge, dark badge, four app-icon tiles, quote, FAQ item, light and featured pricing tiers, use-case card.

## Terms `/terms`

- Header: eyebrow "Legal", Display title, meta line 15/400 `#6E6E6E`.
- Two columns: sticky **contents card** (260px, `top: 24px`, radius 20, `padding: 8px`, `card`-level shadow) and **document card** (796px, radius 24, `padding: 52px`, white, shadow).
- Contents card: label row (12/500 uppercase `#767676`, `padding: 10px 12px 8px`), then items 244x40 (`padding: 11px 12px`, `gap: 10px`, pill): number 11/400 `#767676` + title 14/400. A dark pill indicator slides to the active item; active content turns white.
- Document: lead paragraph 18/400 `#3A3A3A`; sections separated by hairline dividers, each with a number (14/500 `#767676`) + H2 at 24/500 (-0.03em) + paragraphs 16/400 line-height 1.7 `#6E6E6E`.
