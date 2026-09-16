import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ModusWcButton,
  ModusWcCard,
  ModusWcIcon,
  ModusWcModal,
  ModusWcTextInput,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import { usePerformance } from '../context/PerformanceContext'
import type { ReviewEmployeeGroup } from '../types'
import { readInputString } from '../utils/modusFormEvents'
import {
  createTableActionButton,
  createTableActionGroup,
} from '../utils/modusTableCells'
import { reviewerPreviewLabel } from '../utils/reviewer'
import { TraqsperaPageBody, TraqsperaPageHeader } from './TraqsperaPageHeader'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'
import { PerformanceDataTable } from './PerformanceDataTable'
import {
  ReviewGroupFormModal,
  formValuesFromGroup,
  type ReviewGroupFormValues,
} from './ReviewGroupFormModal'
import { ReviewGroupMembersModal } from './ReviewGroupMembersModal'

const GROUP_FORM_MODAL_ID = 'review-group-form-modal'
const DELETE_GROUP_MODAL_ID = 'review-group-delete-modal'
const MEMBERS_MODAL_ID = 'review-group-members-modal'

function createEmptyGroup(): ReviewEmployeeGroup {
  return {
    id: `rgrp-${crypto.randomUUID().slice(0, 8)}`,
    name: '',
    memberIds: [],
    defaultReviewerAssignment: { type: 'crew_manager' },
    createdBy: 'HR Admin',
  }
}

export function ReviewGroupsAdmin() {
  const { state, setView, saveReviewGroup, deleteReviewGroup, getPerson } = usePerformance()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<ReviewEmployeeGroup | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ReviewEmployeeGroup | null>(null)
  const [membersGroup, setMembersGroup] = useState<ReviewEmployeeGroup | null>(null)

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return state.reviewGroups
    return state.reviewGroups.filter(
      (g) =>
        g.name.toLowerCase().includes(query) ||
        (g.description ?? '').toLowerCase().includes(query),
    )
  }, [state.reviewGroups, search])

  const tableData = useMemo(
    () =>
      filteredGroups.map((group) => {
        const sampleMember = group.memberIds[0]
          ? getPerson(group.memberIds[0])
          : undefined
        const previewPerson = sampleMember ?? state.people.find((p) => p.role === 'employee')
        const reviewerPreview = previewPerson
          ? reviewerPreviewLabel(
              previewPerson,
              group.defaultReviewerAssignment,
              getPerson,
            )
          : '—'
        return {
          id: group.id,
          name: group.name,
          description: group.description ?? '',
          members: group.memberIds.length === 1 ? '1 employee' : `${group.memberIds.length} employees`,
          memberCount: group.memberIds.length,
          reviewerPreview,
        }
      }),
    [filteredGroups, getPerson, state.people],
  )

  const isEditingExisting =
    editingGroup !== null && state.reviewGroups.some((g) => g.id === editingGroup.id)

  const openCreate = () => {
    setEditingGroup(createEmptyGroup())
    setFormOpen(true)
  }

  const openEdit = (group: ReviewEmployeeGroup) => {
    setEditingGroup({ ...group })
    setFormOpen(true)
  }

  const openDuplicate = (group: ReviewEmployeeGroup) => {
    setEditingGroup({
      ...group,
      id: `rgrp-${crypto.randomUUID().slice(0, 8)}`,
      name: `Copy of ${group.name}`,
    })
    setFormOpen(true)
  }

  const handleFormSubmit = (values: ReviewGroupFormValues) => {
    if (!editingGroup) return
    saveReviewGroup({
      ...editingGroup,
      name: values.name,
      description: values.description || undefined,
      memberIds: values.memberIds,
      defaultReviewerAssignment: values.defaultReviewerAssignment,
    })
    setFormOpen(false)
    setEditingGroup(null)
  }

  const confirmDelete = useCallback(() => {
    if (deleteTarget) deleteReviewGroup(deleteTarget.id)
    setDeleteTarget(null)
  }, [deleteTarget, deleteReviewGroup])

  useEffect(() => {
    const dialog = document.getElementById(DELETE_GROUP_MODAL_ID) as HTMLDialogElement | null
    if (!dialog) return
    const handleClose = () => setDeleteTarget(null)
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [])

  useEffect(() => {
    const dialog = document.getElementById(DELETE_GROUP_MODAL_ID) as HTMLDialogElement | null
    if (deleteTarget) dialog?.showModal()
    else dialog?.close()
  }, [deleteTarget])

  const formInitial = editingGroup ? formValuesFromGroup(editingGroup) : undefined

  return (
    <TraqsperaPageBody>
      <TraqsperaPageHeader
        title="Review groups"
        subtitle="Create and maintain employee groups with a default reviewer for performance cycles."
        onBack={() => setView('hr_dashboard')}
        backAriaLabel="Back to dashboard"
        actions={
          <ModusWcButton variant="filled" color="primary" size="sm" onButtonClick={openCreate}>
            <ModusWcIcon name="add" size="xs" decorative />
            Create group
          </ModusWcButton>
        }
      />

      <ModusWcCard bordered padding="compact" customClass={`${TRAQ_CARD_CLASS} tq-table-card`}>
        <div slot="title" className="flex w-full min-w-0 items-center justify-between gap-3 mb-4">
          <div className="flex min-w-0 items-center gap-2">
            <ModusWcIcon name="people_group" decorative />
            <ModusWcTypography hierarchy="h4" size="md" weight="semibold" label="Review groups" />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <ModusWcTextInput
            label="Search"
            size="sm"
            placeholder="Search by group name"
            value={search}
            onInputChange={(e) => setSearch(readInputString(e as CustomEvent))}
          />
          {tableData.length === 0 ? (
            <ModusWcTypography
              hierarchy="p"
              size="sm"
              customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
              label={
                state.reviewGroups.length === 0
                  ? 'No review groups yet. Create a group to reuse employee cohorts across cycles.'
                  : 'No groups match your search.'
              }
            />
          ) : (
            <PerformanceDataTable
              caption="Review employee groups"
              columns={[
                { id: 'name', header: 'Group name', accessor: 'name', sortable: true },
                {
                  id: 'members',
                  header: 'Members',
                  accessor: 'memberCount',
                  sortable: true,
                  cellRenderer: (_value, row) =>
                    String((row as { members: string }).members),
                },
                {
                  id: 'reviewer',
                  header: 'Default reviewer',
                  accessor: 'reviewerPreview',
                  sortable: false,
                },
                {
                  id: 'actions',
                  header: '',
                  accessor: 'id',
                  sortable: false,
                  cellRenderer: (value) => {
                    const group = state.reviewGroups.find((g) => g.id === String(value))
                    if (!group) {
                      const empty = document.createElement('span')
                      empty.textContent = ''
                      return empty
                    }
                    return createTableActionGroup([
                      createTableActionButton('Members', () => setMembersGroup(group)),
                      createTableActionButton('Edit', () => openEdit(group)),
                      createTableActionButton('Duplicate', () => openDuplicate(group)),
                      createTableActionButton('Delete', () => setDeleteTarget(group), 'danger'),
                    ])
                  },
                },
              ]}
              data={tableData}
            />
          )}
        </div>
      </ModusWcCard>

      <ReviewGroupMembersModal
        modalId={MEMBERS_MODAL_ID}
        group={membersGroup}
        cycles={state.cycles}
        getPerson={getPerson}
        onClose={() => setMembersGroup(null)}
      />

      <ReviewGroupFormModal
        modalId={GROUP_FORM_MODAL_ID}
        open={formOpen}
        title={isEditingExisting ? 'Edit review group' : 'Create review group'}
        submitLabel="Save group"
        people={state.people}
        initial={formInitial}
        onClose={() => {
          setFormOpen(false)
          setEditingGroup(null)
        }}
        onSubmit={handleFormSubmit}
      />

      <ModusWcModal
        modalId={DELETE_GROUP_MODAL_ID}
        backdrop="default"
        position="center"
        showClose
        aria-label="Delete review group"
      >
        <span slot="header">Delete review group</span>
        <div slot="content">
          <ModusWcTypography
            hierarchy="p"
            size="sm"
            label={`Delete ${deleteTarget?.name ?? 'this group'}? This cannot be undone. Cycles that already launched keep their participant list; draft cycles may lose the group attachment.`}
          />
        </div>
        <div slot="footer" className="flex justify-end gap-2">
          <ModusWcButton
            variant="outlined"
            color="tertiary"
            size="sm"
            onButtonClick={() => setDeleteTarget(null)}
          >
            Cancel
          </ModusWcButton>
          <ModusWcButton variant="filled" color="primary" size="sm" onButtonClick={confirmDelete}>
            Delete
          </ModusWcButton>
        </div>
      </ModusWcModal>
    </TraqsperaPageBody>
  )
}
