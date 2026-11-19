import { cn } from '@/lib/utils'

/**
 * The CX logo, from the owner's files (`React-Frontend/logo/CX_LOGO_LIGHT.svg` and `CX_LOGO_DARK.svg`, 19 Nov 2026). The two files differ
 * only in the fill of the letters, so the letters take the text colour here (ink on a light surface, light on a dark one) and one
 * component serves both themes. The orange point is the logo's own colour (`--brand-point`), the same in both.
 *
 * Animated (owner's request): the point leaves its notch at the top of the C, travels once round the letter and settles back, then rests
 * and goes again, for ever. `animated={false}` keeps it still; under reduced motion it stays in its notch (theme.css).
 *
 * Sized by height: pass `h-5`, `h-10` and so on; the width follows the 680 x 327 artwork.
 *
 * @example <BrandLogo className="h-5" />   <BrandLogo className="h-12" animated={false} />
 */
export function BrandLogo({
  className,
  animated = true,
  decorative = false,
  pointScale = 1,
}: {
  className?: string
  animated?: boolean
  /** Beside the product name: hide it from assistive technology. */
  decorative?: boolean
  /** The orange point, enlarged about its own centre (the sign-in screen asks for a bigger point, 19 Nov). 1 = the artwork's size. */
  pointScale?: number
}) {
  return (
    <svg
      viewBox="0 0 680 327"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      data-slot="brand-logo"
      data-animated={animated || undefined}
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': 'CX' })}
      className={cn('brand-logo aspect-[680/327] w-auto shrink-0 overflow-visible', className)}
    >
      <path
        fill="currentColor"
        d="M322.69 195.502C321.241 202.356 319.398 209.124 317.173 215.764C303.051 257.001 273.032 290.879 233.797 309.862C194.78 328.626 149.916 331.152 109.04 316.886C68.0204 302.486 34.4411 272.318 15.7494 233.068C-2.78554 193.882 -5.05418 148.946 9.43966 108.092C24.1818 67.2295 54.5284 33.8825 93.8233 15.3641C133.029 -2.94758 177.914 -4.88474 218.552 9.98054C258.463 24.687 290.959 54.5476 308.98 93.0746C299.339 81.4979 283.066 77.9497 269.481 84.4636C255.897 90.977 248.474 105.886 251.463 120.652C240.501 97.9199 221.197 80.2871 197.567 71.4215C173.179 62.3341 146.17 63.3712 122.55 74.3019C98.8434 85.2923 80.4422 105.207 71.3559 129.706C62.5654 154.094 63.8103 180.97 74.8173 204.439C85.9526 228.133 106.139 246.364 130.843 255.035C155.198 263.487 181.909 261.947 205.135 250.761C228.283 239.575 246.066 219.686 254.604 195.438L322.69 195.502Z"
      />
      <path
        fill="currentColor"
        d="M633.178 0L680.001 46.7238C642.211 85.1351 602.221 125.345 563.691 162.934L679.963 279.185L633.13 326.098L560.626 253.69C546.211 239.285 530.943 224.443 516.943 209.713C505.176 222.066 491.981 234.803 479.857 246.916L400.782 326.092C385.125 310.814 369.361 294.714 353.859 279.217L470.115 162.965C455.705 149.488 439.851 132.905 425.744 118.8L353.832 46.7371C369.447 31.3704 384.912 15.1861 400.713 0.114592C403.586 2.40402 410.108 9.25524 412.842 11.9998L436.994 36.1965L516.927 116.143C555.073 77.6923 594.456 37.7484 633.178 0Z"
      />
      {/* the group turns round the centre of the C; the point inside it swells a little as it lands */}
      <g className="brand-point-orbit">
        <path
          className="brand-point"
          fill="var(--brand-point)"
          style={pointScale !== 1 ? { transform: `scale(${pointScale})`, transformOrigin: '282px 115px', transformBox: 'view-box' } : undefined}
          d="M251.43 120.574C248.441 105.839 255.863 90.9617 269.446 84.4622C283.028 77.9623 299.299 81.5029 308.939 93.0548C317.711 103.569 319.029 118.412 312.244 130.302C305.46 142.192 291.997 148.632 278.46 146.469C264.922 144.303 254.152 133.984 251.43 120.574Z"
        />
      </g>
    </svg>
  )
}
