import { describe, expect, it } from 'vitest'
import { toCsv } from '@/lib/export/workbook'

describe('toCsv', () => {
  it('escapa comas y comillas', () => {
    const csv = toCsv(['a', 'b'], [['x,y', 'he said "hi"']])
    expect(csv).toBe('a,b\n"x,y","he said ""hi"""')
  })
  it('arma filas simples', () => {
    expect(toCsv(['ref', 'lb'], [['EQ-1', 37500]])).toBe('ref,lb\nEQ-1,37500')
  })
})
