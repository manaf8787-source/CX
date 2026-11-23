import { cn } from '@/lib/utils'

/**
 * The CX logo, from the owner's files (`CX_LOGO_LIGHT.svg` and `CX_LOGO_DARK.svg`; the new artwork of 23 Nov 2026, with the X in three strokes). The two files differ
 * only in the fill of the letters, so the letters take the text colour here (ink on a light surface, light on a dark one) and one
 * component serves both themes. The orange point is the logo's own colour (`--brand-point`), the same in both.
 *
 * Animated (owner's request): the point leaves its notch at the top of the C, travels once round the letter and settles back, then rests
 * and goes again, for ever. `animated={false}` keeps it still; under reduced motion it stays in its notch (theme.css).
 *
 * Sized by height: pass `h-5`, `h-10` and so on; the width follows the 692 x 348 artwork.
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
      viewBox="0 0 692 348"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      data-slot="brand-logo"
      data-animated={animated || undefined}
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': 'CX' })}
      className={cn('brand-logo aspect-[692/348] w-auto shrink-0 overflow-visible', className)}
    >
      <path
        fill="currentColor"
        d="M343.997 208.326C342.452 215.632 340.488 222.847 338.115 229.926C323.061 273.886 291.06 310.001 249.234 330.237C207.641 350.24 159.815 352.933 116.24 337.724C72.5117 322.374 36.7152 290.213 16.7893 248.372C-2.96946 206.599 -5.3879 158.696 10.0629 115.144C25.7785 71.5837 58.1289 36.0349 100.018 16.2937C141.813 -3.22705 189.662 -5.29212 232.983 10.5547C275.529 26.2322 310.17 58.0645 329.381 99.1353C319.104 86.7943 301.756 83.0118 287.275 89.9558C272.793 96.8992 264.88 112.793 268.067 128.534C256.381 104.301 235.803 85.5035 210.613 76.0525C184.614 66.3651 155.821 67.4706 130.642 79.1231C105.37 90.8392 85.7537 112.069 76.0675 138.186C66.6965 164.184 68.0236 192.834 79.7573 217.853C91.628 243.112 113.147 262.547 139.482 271.79C165.446 280.8 193.92 279.158 218.68 267.233C243.356 255.309 262.314 234.107 271.416 208.258L343.997 208.326Z"
      />
      <path fill="currentColor" d="M683.117 33.1753H613.52L557.23 108.013L593.823 156.684L683.117 33.1753Z" />
      <path fill="currentColor" d="M556.674 233.707L616.185 314.285H691.162L595.283 181.453L556.674 233.707Z" />
      <path
        fill="currentColor"
        d="M548.77 119.25L461.886 3.73047H377.718L495.647 166.852L367.996 343.73H458.663L548.294 222.359L586.96 169.993L548.77 119.25Z"
      />
      {/* the group turns round the centre of the C; the point inside it swells a little as it lands */}
      <g className="brand-point-orbit">
        <path
          className="brand-point"
          fill="var(--brand-point)"
          style={pointScale !== 1 ? { transform: `scale(${pointScale})`, transformOrigin: '300px 121px', transformBox: 'view-box' } : undefined}
          d="M267.542 126.796C264.364 111.097 272.256 95.2445 286.7 88.3192C301.143 81.3934 318.445 85.166 328.696 97.4747C338.024 108.678 339.426 124.493 332.211 137.162C324.997 149.831 310.68 156.693 296.285 154.388C281.89 152.081 270.436 141.085 267.542 126.796Z"
        />
      </g>
    </svg>
  )
}
