import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { usePerformance } from '../context/PerformanceContext'
import { buildPerformancePath, parsePerformancePath } from './performancePaths'

/**
 * Keeps PerformanceContext view/selection state and the browser URL in sync.
 * Must render inside PerformanceProvider and a React Router context.
 */
export function PerformanceUrlSync() {
  const { state, applyRouteState } = usePerformance()
  const location = useLocation()
  const navigate = useNavigate()
  const applyingFromUrlRef = useRef(false)

  useEffect(() => {
    const route = parsePerformancePath(location.pathname, location.search)
    if (!route) {
      navigate('/', { replace: true })
      return
    }

    applyingFromUrlRef.current = true
    applyRouteState(route)
    queueMicrotask(() => {
      applyingFromUrlRef.current = false
    })
  }, [location.pathname, location.search, applyRouteState, navigate])

  useEffect(() => {
    if (applyingFromUrlRef.current) return

    const target = buildPerformancePath(state)
    const current = `${location.pathname}${location.search}`
    if (target === current) return

    navigate(target)
  }, [
    state.view,
    state.selectedCycleId,
    state.selectedTemplateId,
    state.editingTemplateId,
    state.selectedPersonId,
    state.selectedReviewId,
    state.employeeDetailsTab,
    state.activePersonId,
    state.reviews,
    location.pathname,
    location.search,
    navigate,
  ])

  return null
}
