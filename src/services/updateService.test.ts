import { describe, expect, it } from 'vitest'
import { createProgressState, getUpdateBadgeLabel } from './updateService'

describe('updateService helpers', () => {
  it('shows update badge when update is available', () => {
    expect(getUpdateBadgeLabel('available', '1.0.1')).toBe('Update')
  })

  it('shows update badge even when updater does not expose available version', () => {
    expect(getUpdateBadgeLabel('available', undefined, '1.0.0')).toBe('Update')
  })

  it('shows version badge when no update is available', () => {
    expect(getUpdateBadgeLabel('not_available', undefined, '1.0.0')).toBe('v1.0.0')
  })

  it('calculates download percentage from progress event', () => {
    const state = createProgressState({ downloaded: 250, contentLength: 1000, chunkLength: 250 })
    expect(state.percent).toBe(50)
    expect(state.downloaded).toBe(500)
  })
})
