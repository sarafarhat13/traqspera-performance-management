import type { EmployeeDetailsTab } from '../types'

export type EmployeeMobileHubSection = EmployeeDetailsTab | 'my_earnings' | 'direct_deposits'

export const EMPLOYEE_MOBILE_HUB_TITLE = 'My Info'

export type EmployeeMobileHubItem = {
  id: EmployeeMobileHubSection
  label: string
  description: string
  icon: string
}

export const EMPLOYEE_MOBILE_HUB_ITEMS: EmployeeMobileHubItem[] = [
  {
    id: 'time_off_balance',
    label: 'Time Off',
    description: 'PTO balance, sick leave, absence',
    icon: 'time_off_work',
  },
  {
    id: 'my_earnings',
    label: 'My Earnings',
    description: 'Paystubs, tax documents',
    icon: 'receipt',
  },
  {
    id: 'personal',
    label: 'Personal Information',
    description: 'Name, address, phone number',
    icon: 'user_account',
  },
  {
    id: 'performance',
    label: 'Performance',
    description: 'Annual, quarterly reviews',
    icon: 'star',
  },
  {
    id: 'emergency_contact',
    label: 'Emergency Contact',
    description: 'Emergency contact information',
    icon: 'contacts',
  },
  {
    id: 'direct_deposits',
    label: 'Direct Deposits',
    description: 'Allocation method, bank details',
    icon: 'credit_card',
  },
  {
    id: 'certifications',
    label: 'Certifications',
    description: 'Trainings, licenses',
    icon: 'certificate',
  },
]

export const EMPLOYEE_MOBILE_SECTION_TITLES: Record<EmployeeMobileHubSection, string> = {
  personal: 'Personal Information',
  emergency_contact: 'Emergency Contact',
  certifications: 'Certifications',
  my_hours: 'My Hours',
  time_off_balance: 'Time Off',
  performance: 'Performance',
  additional: 'Additional Info',
  history: 'History',
  my_earnings: 'My Earnings',
  direct_deposits: 'Direct Deposits',
}

export function formatEmployeeCode(personId: string): string {
  const digits = personId.replace(/\D/g, '')
  return `E${digits.padStart(4, '0')}`
}

export function personInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}
