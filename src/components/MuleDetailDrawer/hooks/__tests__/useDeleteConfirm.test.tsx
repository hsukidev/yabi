import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

import { useDeleteConfirm } from '../useDeleteConfirm'

describe('useDeleteConfirm', () => {
  it('starts with confirming=false', () => {
    const onDelete = vi.fn()
    const { result } = renderHook(() =>
      useDeleteConfirm({ muleId: 'mule-1', onDelete }),
    )
    expect(result.current.confirming).toBe(false)
  })

  it('request() sets confirming=true', () => {
    const onDelete = vi.fn()
    const { result } = renderHook(() =>
      useDeleteConfirm({ muleId: 'mule-1', onDelete }),
    )

    act(() => {
      result.current.request()
    })
    expect(result.current.confirming).toBe(true)
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('confirm() calls onDelete(muleId) then resets confirming to false', () => {
    const onDelete = vi.fn()
    const { result } = renderHook(() =>
      useDeleteConfirm({ muleId: 'mule-1', onDelete }),
    )

    act(() => {
      result.current.request()
    })
    act(() => {
      result.current.confirm()
    })

    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledWith('mule-1')
    expect(result.current.confirming).toBe(false)
  })

  it('confirm() fires optional onAfterDelete after onDelete', () => {
    const onDelete = vi.fn()
    const onAfterDelete = vi.fn()
    const { result } = renderHook(() =>
      useDeleteConfirm({ muleId: 'mule-1', onDelete, onAfterDelete }),
    )

    act(() => {
      result.current.request()
    })
    act(() => {
      result.current.confirm()
    })

    expect(onDelete).toHaveBeenCalledWith('mule-1')
    expect(onAfterDelete).toHaveBeenCalledTimes(1)
  })

  it('confirm() is a no-op when muleId is null', () => {
    const onDelete = vi.fn()
    const onAfterDelete = vi.fn()
    const { result } = renderHook(() =>
      useDeleteConfirm({ muleId: null, onDelete, onAfterDelete }),
    )

    act(() => {
      result.current.request()
    })
    act(() => {
      result.current.confirm()
    })

    expect(onDelete).not.toHaveBeenCalled()
    expect(onAfterDelete).not.toHaveBeenCalled()
    // Still resets confirming.
    expect(result.current.confirming).toBe(false)
  })

  it('cancel() resets confirming without calling onDelete', () => {
    const onDelete = vi.fn()
    const onAfterDelete = vi.fn()
    const { result } = renderHook(() =>
      useDeleteConfirm({ muleId: 'mule-1', onDelete, onAfterDelete }),
    )

    act(() => {
      result.current.request()
    })
    act(() => {
      result.current.cancel()
    })

    expect(result.current.confirming).toBe(false)
    expect(onDelete).not.toHaveBeenCalled()
    expect(onAfterDelete).not.toHaveBeenCalled()
  })

  it('muleId change auto-resets confirming', () => {
    const onDelete = vi.fn()
    const { result, rerender } = renderHook(
      ({ muleId }: { muleId: string | null }) =>
        useDeleteConfirm({ muleId, onDelete }),
      { initialProps: { muleId: 'mule-1' as string | null } },
    )

    act(() => {
      result.current.request()
    })
    expect(result.current.confirming).toBe(true)

    rerender({ muleId: 'mule-2' })
    expect(result.current.confirming).toBe(false)
  })

  it('muleId change to null also auto-resets', () => {
    const onDelete = vi.fn()
    const { result, rerender } = renderHook(
      ({ muleId }: { muleId: string | null }) =>
        useDeleteConfirm({ muleId, onDelete }),
      { initialProps: { muleId: 'mule-1' as string | null } },
    )

    act(() => {
      result.current.request()
    })
    expect(result.current.confirming).toBe(true)

    rerender({ muleId: null })
    expect(result.current.confirming).toBe(false)
  })

  it('onDelete reference change does not disturb confirming state', () => {
    const onDeleteA = vi.fn()
    const onDeleteB = vi.fn()
    const { result, rerender } = renderHook(
      ({ onDelete }: { onDelete: (id: string) => void }) =>
        useDeleteConfirm({ muleId: 'mule-1', onDelete }),
      { initialProps: { onDelete: onDeleteA as (id: string) => void } },
    )

    act(() => {
      result.current.request()
    })
    expect(result.current.confirming).toBe(true)

    rerender({ onDelete: onDeleteB as (id: string) => void })
    expect(result.current.confirming).toBe(true)

    act(() => {
      result.current.confirm()
    })
    expect(onDeleteB).toHaveBeenCalledWith('mule-1')
    expect(onDeleteA).not.toHaveBeenCalled()
  })
})
