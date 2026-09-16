import { useEffect, useMemo } from 'react'
import {
  ModusWcCard,
  ModusWcIcon,
  ModusWcModal,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'
import type { Person, ReviewCycle, ReviewEmployeeGroup } from '../types'
import { getActiveCyclesForEmployee } from '../utils/activeEmployeeCycles'
import { createTagBadge } from '../utils/modusTableCells'
import { PerformanceDataTable } from './PerformanceDataTable'
import { TraqsperaPageBody, TraqsperaPageHeader } from './TraqsperaPageHeader'

type ReviewGroupMembersModalProps = {
  modalId: string
  group: ReviewEmployeeGroup | null
  cycles: ReviewCycle[]
  getPerson: (id: string) => Person | undefined
  onClose: () => void
}

export function ReviewGroupMembersModal({
  modalId,
  group,
  cycles,
  getPerson,
  onClose,
}: ReviewGroupMembersModalProps) {
  const open = group !== null

  useEffect(() => {
    const dialog = document.getElementById(modalId) as HTMLDialogElement | null
    if (!dialog) return
    const handleClose = () => onClose()
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [modalId, onClose])

  useEffect(() => {
    const dialog = document.getElementById(modalId) as HTMLDialogElement | null
    if (open) dialog?.showModal()
    else dialog?.close()
  }, [open, modalId])

  const tableData = useMemo(() => {
    if (!group) return []
    return group.memberIds.map((memberId) => {
      const person = getPerson(memberId)
      const activeCycles = getActiveCyclesForEmployee(memberId, cycles)
      return {
        id: memberId,
        name: person?.name ?? 'Unknown employee',
        title: person?.title ?? '—',
        department: person?.department ?? '—',
        activeCycleCount: activeCycles.length,
        activeCycles,
      }
    })
  }, [group, cycles, getPerson])

  const memberCount = group?.memberIds.length ?? 0
  const subtitle =
    group?.description ??
    (memberCount === 0
      ? 'This group has no members yet.'
      : `${memberCount} employee${memberCount === 1 ? '' : 's'}. Active review cycles are those currently in progress for each person.`)

  return (
    <ModusWcModal
      modalId={modalId}
      backdrop="default"
      position="top"
      fullscreen
      showClose
      aria-label={group ? `Members of ${group.name}` : 'Review group members'}
    >
      <span slot="header">{group?.name ?? 'Group members'}</span>
      <div slot="content" className="review-group-members-modal-content min-h-0 min-w-0 flex-1 overflow-auto">
        <TraqsperaPageBody>
          <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-3">
            <TraqsperaPageHeader
              title={group?.name ?? 'Group members'}
              subtitle={subtitle}
              onBack={onClose}
              backAriaLabel="Back to review groups"
            />

            {memberCount > 0 && (
              <ModusWcCard bordered padding="compact" customClass={`${TRAQ_CARD_CLASS} tq-table-card`}>
                <div slot="title" className="flex w-full min-w-0 items-center gap-2 mb-4">
                  <ModusWcIcon name="people_group" decorative />
                  <ModusWcTypography
                    hierarchy="h4"
                    size="md"
                    weight="semibold"
                    label="Employees and active cycles"
                  />
                </div>
                <PerformanceDataTable
                  caption={`Employees in ${group?.name ?? 'review group'}`}
                  density="comfortable"
                  columns={[
                    { id: 'name', header: 'Employee', accessor: 'name', sortable: true },
                    { id: 'title', header: 'Title', accessor: 'title', sortable: true },
                    { id: 'department', header: 'Department', accessor: 'department', sortable: true },
                    {
                      id: 'activeCycles',
                      header: 'Active review cycle',
                      accessor: 'activeCycleCount',
                      sortable: true,
                      cellRenderer: (_value, row) => {
                        const activeCycles = (row as { activeCycles: ReviewCycle[] }).activeCycles
                        const wrap = document.createElement('div')
                        wrap.className = 'flex flex-wrap items-center gap-1'
                        if (activeCycles.length === 0) {
                          const muted = document.createElement('span')
                          muted.className =
                            'text-[var(--modus-wc-color-base-content-low-contrast)] text-sm'
                          muted.textContent = 'None'
                          wrap.appendChild(muted)
                          return wrap
                        }
                        activeCycles.forEach((cycle) => {
                          wrap.appendChild(createTagBadge(cycle.name, 'primary'))
                        })
                        return wrap
                      },
                    },
                  ]}
                  data={tableData}
                />
              </ModusWcCard>
            )}
          </div>
        </TraqsperaPageBody>
      </div>
    </ModusWcModal>
  )
}
