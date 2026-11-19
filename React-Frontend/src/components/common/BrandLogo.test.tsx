import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen } from '@testing-library/react'
import { BrandLogo } from './BrandLogo'

/** The `d` attributes of every path in an SVG file, in order. */
const pathsOf = (svg: string) => [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1])

describe('BrandLogo (the owner\'s CX logo, 19 Nov)', () => {
  it('is the owner\'s artwork: the same three shapes as logo/CX_LOGO_DARK.svg, at 680 x 327', () => {
    const file = readFileSync(resolve(__dirname, '../../../logo/CX_LOGO_DARK.svg'), 'utf8')
    const { container } = render(<BrandLogo />)
    const svg = container.querySelector('svg')!
    expect(svg).toHaveAttribute('viewBox', '0 0 680 327')
    const drawn = [...svg.querySelectorAll('path')].map((p) => p.getAttribute('d'))
    const source = pathsOf(file)
    expect(drawn).toHaveLength(3)
    // the letters, exactly; the point is the LIGHT file's (the two files draw it 0.002 apart)
    expect(drawn.slice(0, 2)).toEqual(source.slice(0, 2))
    expect(drawn[2]).toBe(pathsOf(readFileSync(resolve(__dirname, '../../../logo/CX_LOGO_LIGHT.svg'), 'utf8'))[2])
  })

  it('takes the text colour for the letters (one logo for both themes) and keeps the orange point', () => {
    const { container } = render(<BrandLogo />)
    const [c, x, point] = [...container.querySelectorAll('path')]
    expect(c).toHaveAttribute('fill', 'currentColor')
    expect(x).toHaveAttribute('fill', 'currentColor')
    expect(point).toHaveAttribute('fill', 'var(--brand-point)')
  })

  it('animates by default: the point sits in a group that turns round the C; `animated={false}` keeps it still', () => {
    const { container, rerender } = render(<BrandLogo />)
    const svg = container.querySelector('svg')!
    expect(svg).toHaveAttribute('data-animated', 'true')
    expect(svg.querySelector('g.brand-point-orbit > path.brand-point')).toBeInTheDocument()
    rerender(<BrandLogo animated={false} />)
    expect(container.querySelector('svg')).not.toHaveAttribute('data-animated')
  })

  it('is an image named "CX", or hidden when it stands beside the name', () => {
    const { rerender, container } = render(<BrandLogo />)
    expect(screen.getByRole('img', { name: 'CX' })).toBeInTheDocument()
    rerender(<BrandLogo decorative />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})
