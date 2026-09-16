import { useCallback, useMemo } from 'react'
import {
  ModusWcBadge,
  ModusWcButton,
  ModusWcIcon,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import { readTableSelectedRowIds, rowIdSetEqual } from '../utils/tableRowSelection'
import { PerformanceDataTable } from './PerformanceDataTable'

export type LaunchCycleGroupPickerItem = {
  id: string
  name: string
  description?: string
  membersLabel: string
  reviewerPreview: string
}

type LaunchCycleGroupPickerProps = {
  groups: LaunchCycleGroupPickerItem[]
  attachedGroupIds: string[]
  onAttachedGroupIdsChange: (groupIds: string[]) => void
  onAttachAll: () => void
  onClearAll: () => void
  onCreateGroup: () => void
}

export function LaunchCycleGroupPicker({
  groups,
  attachedGroupIds,
  onAttachedGroupIdsChange,
  onAttachAll,
  onClearAll,
  onCreateGroup,
}: LaunchCycleGroupPickerProps) {
  const tableData = useMemo(
    () =>
      groups.map((group) => ({
        id: group.id,
        name: group.name,
        description: group.description?.trim() || '—',
        members: group.membersLabel,
        reviewerPreview: group.reviewerPreview,
      })),
    [groups],
  )

  const columns = useMemo(
    () => [
      { id: 'name', header: 'Group name', accessor: 'name', sortable: true },
      {
        id: 'description',
        header: 'Description',
        accessor: 'description',
        sortable: true,
      },
      { id: 'members', header: 'Members', accessor: 'members', sortable: true },
      {
        id: 'reviewer',
        header: 'Default reviewer',
        accessor: 'reviewerPreview',
        sortable: false,
      },
    ],
    [],
  )

  const handleRowSelectionChange = useCallback(
    (event: CustomEvent<{ selectedRowIds: string[] }>) => {
      const newIds = readTableSelectedRowIds(event)
      if (rowIdSetEqual(attachedGroupIds, newIds)) return
      onAttachedGroupIdsChange(newIds)
    },
    [attachedGroupIds, onAttachedGroupIdsChange],
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <ModusWcTypography
            hierarchy="p"
            size="sm"
            weight="semibold"
            customClass="!m-0"
            label="Review groups for this cycle"
          />
          <ModusWcBadge variant="filled" size="sm">
            {attachedGroupIds.length === 1
              ? '1 selected'
              : `${attachedGroupIds.length} selected`}
          </ModusWcBadge>
        </div>
        <div className="flex flex-wrap gap-2">
          <ModusWcButton
            variant="outlined"
            color="tertiary"
            size="xs"
            disabled={groups.length === 0}
            onButtonClick={onAttachAll}
          >
            Select all groups
          </ModusWcButton>
          <ModusWcButton
            variant="borderless"
            color="tertiary"
            size="xs"
            disabled={attachedGroupIds.length === 0}
            onButtonClick={onClearAll}
          >
            Clear selection
          </ModusWcButton>
          <ModusWcButton variant="outlined" color="tertiary" size="xs" onButtonClick={onCreateGroup}>
            <ModusWcIcon name="add" size="xs" decorative />
            Create group
          </ModusWcButton>
        </div>
      </div>

      <ModusWcTypography
        hierarchy="p"
        size="sm"
        customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
        label="Select one or more groups. Each group adds its members as participants and applies that group’s default reviewer."
      />

      {groups.length === 0 ? (
        <ModusWcTypography
          hierarchy="p"
          size="sm"
          customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
          label="No review groups in the library yet. Create your first group."
        />
      ) : (
        <PerformanceDataTable
          caption="Review groups available for this cycle"
          columns={columns}
          data={tableData}
          density="comfortable"
          selectable="multi"
          selectedRowIds={attachedGroupIds}
          onRowSelectionChange={handleRowSelectionChange}
        />
      )}
    </div>
  )
}
