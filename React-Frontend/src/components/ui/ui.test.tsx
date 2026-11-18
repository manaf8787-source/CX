import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlusIcon } from 'lucide-react'
import { renderWithProviders } from '@/test/render'
import { Badge } from './badge'
import { Button } from './button'
import { Card, CardWell } from './card'
import { Checkbox } from './checkbox'
import { RadioGroup, RadioGroupItem } from './radio-group'
import { Segmented } from './segmented'
import { Switch } from './switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'

describe('Button (Meo pill)', () => {
  it('keeps one label in the DOM and rolls it with CSS (data-label), so the name and getByText see it once', () => {
    renderWithProviders(<Button>Save</Button>)
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button.textContent).toBe('Save')
    expect(screen.getAllByText('Save')).toHaveLength(1)
    expect(button.querySelector('[data-label="Save"]')).not.toBeNull()
    expect(button).toHaveClass('btn-rollable')
  })

  it('rolls a text run that sits beside an icon', () => {
    renderWithProviders(
      <Button>
        <PlusIcon /> New record
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'New record' })
    expect(button.querySelector('[data-label="New record"]')).not.toBeNull()
    expect(button.querySelector('svg')).not.toBeNull()
  })

  it('does not roll richer children, links, xs and icon buttons', () => {
    renderWithProviders(
      <>
        <Button>
          <span>Rich</span>
        </Button>
        <Button variant="link">Link</Button>
        <Button size="xs">Tiny</Button>
        <Button size="icon" aria-label="Open">
          <PlusIcon />
        </Button>
      </>,
    )
    for (const name of ['Rich', 'Link', 'Tiny', 'Open']) {
      expect(screen.getByRole('button', { name }).querySelector('[data-label]')).toBeNull()
    }
  })

  it('loading disables the button and says it is busy, and a destructive action stays a dark pill', async () => {
    const onClick = vi.fn()
    renderWithProviders(
      <>
        <Button loading onClick={onClick}>
          Saving
        </Button>
        <Button variant="destructive">Delete 3 profiles</Button>
      </>,
    )
    const busy = screen.getByRole('button', { name: 'Saving' })
    expect(busy).toBeDisabled()
    expect(busy).toHaveAttribute('aria-busy', 'true')
    await userEvent.click(busy)
    expect(onClick).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Delete 3 profiles' })).toHaveAttribute('data-variant', 'destructive')
  })
})

describe('Badge, Card, Table', () => {
  it('Badge draws a status dot only when asked, and as decoration', () => {
    const { container } = render(
      <>
        <Badge variant="success">Effective</Badge>
        <Badge dot="live">Running</Badge>
      </>,
    )
    expect(container.querySelectorAll('.dot')).toHaveLength(1)
    expect(container.querySelector('.dot')).toHaveAttribute('aria-hidden', 'true')
  })

  it('Card carries its density for the tokens, and a well is a slot', () => {
    render(
      <Card density="dense" data-testid="card">
        <CardWell data-testid="well">x</CardWell>
      </Card>,
    )
    expect(screen.getByTestId('card')).toHaveAttribute('data-density', 'dense')
    expect(screen.getByTestId('well')).toHaveAttribute('data-slot', 'card-well')
  })

  it('Table follows the page density (dense outside any scope), takes its own density, and keeps aria-sort on the header', () => {
    const { container } = render(
      <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead aria-sort="ascending">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow data-state="selected">
              <TableCell>1</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <Table density="comfortable">
          <TableBody>
            <TableRow>
              <TableCell>2</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </>,
    )
    const containers = container.querySelectorAll('[data-slot="table-container"]')
    // no density of its own: the table follows the page (data-density on an ancestor; theme.css makes it dense outside every scope)
    expect(containers[0]).not.toHaveAttribute('data-density')
    expect(containers[1]).toHaveAttribute('data-density', 'comfortable')
    expect(screen.getByRole('columnheader', { name: 'Total' })).toHaveAttribute('aria-sort', 'ascending')
  })
})

describe('Selection controls', () => {
  it('Tabs: the selected trigger is aria-selected and visibly selected before the sliding pill is measured', async () => {
    render(
      <Tabs defaultValue="one">
        <TabsList>
          <TabsTrigger value="one">One</TabsTrigger>
          <TabsTrigger value="two">Two</TabsTrigger>
        </TabsList>
        <TabsContent value="one">Panel one</TabsContent>
        <TabsContent value="two">Panel two</TabsContent>
      </Tabs>,
    )
    const one = screen.getByRole('tab', { name: 'One' })
    expect(one).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tablist')).toHaveAttribute('data-indicator', 'off')
    await userEvent.click(screen.getByRole('tab', { name: 'Two' }))
    expect(screen.getByRole('tab', { name: 'Two' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Panel two')).toBeInTheDocument()
  })

  function Filter() {
    const [value, setValue] = useState('all')
    return (
      <>
        <Segmented
          label="Status filter"
          value={value}
          onValueChange={setValue}
          options={[
            { value: 'all', label: 'All', count: 128 },
            { value: 'open', label: 'Open', count: 34 },
            { value: 'shipped', label: 'Shipped', count: 94 },
          ]}
        />
        <output data-testid="value">{value}</output>
      </>
    )
  }

  it('Segmented: arrow keys move the selection (forward is the reading direction)', async () => {
    renderWithProviders(<Filter />)
    expect(screen.getByRole('radiogroup', { name: 'Status filter' })).toBeInTheDocument()
    const all = screen.getByRole('radio', { name: /All/ })
    all.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByTestId('value')).toHaveTextContent('open')
    expect(screen.getByRole('radio', { name: /Open/ })).toHaveAttribute('aria-checked', 'true')
  })

  it('Segmented: in Arabic the right arrow goes back', async () => {
    renderWithProviders(<Filter />, { lang: 'ar' })
    const open = screen.getByRole('radio', { name: /All/ })
    open.focus()
    await userEvent.keyboard('{ArrowLeft}')
    expect(screen.getByTestId('value')).toHaveTextContent('open')
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByTestId('value')).toHaveTextContent('all')
  })

  it('Checkbox, Switch and RadioGroup toggle and expose their state', async () => {
    render(
      <>
        <Checkbox aria-label="Agree" />
        <Switch aria-label="Live" />
        <RadioGroup defaultValue="a" aria-label="Channel">
          <RadioGroupItem value="a" aria-label="Phone" />
          <RadioGroupItem value="b" aria-label="Visit" />
        </RadioGroup>
      </>,
    )
    await userEvent.click(screen.getByRole('checkbox', { name: 'Agree' }))
    expect(screen.getByRole('checkbox', { name: 'Agree' })).toBeChecked()
    await userEvent.click(screen.getByRole('switch', { name: 'Live' }))
    expect(screen.getByRole('switch', { name: 'Live' })).toBeChecked()
    await userEvent.click(screen.getByRole('radio', { name: 'Visit' }))
    expect(screen.getByRole('radio', { name: 'Visit' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Phone' })).not.toBeChecked()
  })
})
