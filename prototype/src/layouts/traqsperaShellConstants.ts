import type { ReactNode } from 'react'

export const TOP_BAR_H = 48
export const NAV_COLLAPSED_W = 40
export const NAV_EXPANDED_W = 224
export const SUB_NAV_W = 232

export type TraqsperaNavPage =
  | 'my_info_personal'
  | 'my_info_hours'
  | 'my_info_certifications'
  | 'my_info_performance'
  | 'employees'
  | 'jobs'
  | 'expenses'
  | 'reports'
  | 'equipment'
  | 'documents'
  | 'settings'
  | 'global_admin'
  | 'p_perf_dashboard'
  | 'p_perf_templates'
  | 'p_perf_my_reviews'
  | 'p_perf_team'

export const MY_INFO_PAGES = new Set<TraqsperaNavPage>([
  'my_info_personal',
  'my_info_hours',
  'my_info_certifications',
  'my_info_performance',
])

export const PERFORMANCE_PAGES = new Set<TraqsperaNavPage>([
  'p_perf_dashboard',
  'p_perf_templates',
  'p_perf_my_reviews',
  'p_perf_team',
])

export const SETTINGS_PAGES = new Set<TraqsperaNavPage>(['settings'])

export const TRAQSPERA_OS = 'var(--modus-wc-font-family), sans-serif'
export const TRAQ_CARD_CLASS = 'tq-surface-card border border-[#e0e1e9] shadow-sm bg-white'
