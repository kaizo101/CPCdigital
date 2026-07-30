import { useEffect, useState } from 'react'

export type ResponsiveLayout = 'desktop' | 'compactLandscape' | 'phonePortrait'

export const PHONE_PORTRAIT_QUERY = '(orientation: portrait) and (max-width: 599px)'
export const COMPACT_LANDSCAPE_QUERY = '(orientation: landscape) and (max-width: 1000px) and (max-height: 500px)'

export function resolveResponsiveLayout(
  phonePortrait: boolean,
  compactLandscape: boolean,
): ResponsiveLayout {
  if (phonePortrait) return 'phonePortrait'
  if (compactLandscape) return 'compactLandscape'
  return 'desktop'
}

function readResponsiveLayout(): ResponsiveLayout {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'desktop'
  return resolveResponsiveLayout(
    window.matchMedia(PHONE_PORTRAIT_QUERY).matches,
    window.matchMedia(COMPACT_LANDSCAPE_QUERY).matches,
  )
}

export function useResponsiveLayout(): ResponsiveLayout {
  const [layout, setLayout] = useState<ResponsiveLayout>(readResponsiveLayout)

  useEffect(() => {
    const portraitQuery = window.matchMedia(PHONE_PORTRAIT_QUERY)
    const compactQuery = window.matchMedia(COMPACT_LANDSCAPE_QUERY)
    const updateLayout = () => {
      setLayout(resolveResponsiveLayout(portraitQuery.matches, compactQuery.matches))
    }

    updateLayout()
    portraitQuery.addEventListener('change', updateLayout)
    compactQuery.addEventListener('change', updateLayout)
    return () => {
      portraitQuery.removeEventListener('change', updateLayout)
      compactQuery.removeEventListener('change', updateLayout)
    }
  }, [])

  return layout
}
