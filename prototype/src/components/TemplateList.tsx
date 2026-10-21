import { useCallback, useMemo, useState } from 'react'
import {
  ModusWcAlert,
  ModusWcButton,
  ModusWcCard,
  ModusWcIcon,
  ModusWcModal,
  ModusWcTabs,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import { useModusDialog } from '../utils/useModusDialog'
import { usePerformance } from '../context/PerformanceContext'
import type { ReviewTemplate } from '../types'
import { TraqsperaPageBody, TraqsperaPageHeader } from './TraqsperaPageHeader'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'
import { PerformanceDataTable } from './PerformanceDataTable'
import type { PerformanceDataTableProps } from './PerformanceDataTable'
import {
  createTableActionGroup,
  createTableIconActionButton,
  createTemplateDisplayStatusBadge,
} from '../utils/modusTableCells'
import { formatDate } from '../utils/status'
import { getTemplateDisplayStatus, type TemplateDisplayStatus } from '../utils/templateLifecycle'

const ARCHIVE_TEMPLATE_MODAL_ID = 'template-archive-confirm-modal'

type TemplateTableColumn = NonNullable<PerformanceDataTableProps['columns']>[number]

type TemplateRow = {
  id: string
  name: string
  description: string
  questions: string
  updatedBy: string
  updatedAt: string
  updatedAtSort: string
  lifecycleStatus: TemplateDisplayStatus
}

function mapTemplateToRow(t: ReviewTemplate): TemplateRow {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    questions: String(t.questions.length),
    updatedBy:
      t.updatedBy ?? t.createdBy ?? (t.isPrebuilt ? 'Traqspera' : '—'),
    updatedAt: (t.updatedAt ?? t.createdAt)
      ? formatDate(t.updatedAt ?? t.createdAt!)
      : '—',
    updatedAtSort: t.updatedAt ?? t.createdAt ?? '',
    lifecycleStatus: getTemplateDisplayStatus(t),
  }
}

export function TemplateList() {
  const {
    state,
    setView,
    selectTemplate,
    startNewTemplate,
    duplicateTemplate,
    archiveTemplate,
    unarchiveTemplate,
    clearTemplateSaveNotice,
  } = usePerformance()

  const [activeTabIndex, setActiveTabIndex] = useState(0)
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; name: string } | null>(null)

  const closeArchiveModal = useCallback(() => setArchiveTarget(null), [])
  const { requestClose: closeArchiveDialog } = useModusDialog(
    ARCHIVE_TEMPLATE_MODAL_ID,
    archiveTarget !== null,
    closeArchiveModal,
  )

  const openArchiveConfirm = useCallback(
    (templateId: string) => {
      const template = state.templates.find((t) => t.id === templateId)
      if (!template || template.isArchived) return
      setArchiveTarget({ id: templateId, name: template.name })
    },
    [state.templates],
  )

  const confirmArchive = useCallback(() => {
    if (!archiveTarget) return
    archiveTemplate(archiveTarget.id)
    closeArchiveDialog()
  }, [archiveTarget, archiveTemplate, closeArchiveDialog])

  const namedTemplates = useMemo(
    () => state.templates.filter((t) => t.name.trim().length > 0),
    [state.templates],
  )

  const activeData = useMemo(
    () => namedTemplates.filter((t) => !t.isArchived).map(mapTemplateToRow),
    [namedTemplates],
  )

  const archivedData = useMemo(
    () => namedTemplates.filter((t) => t.isArchived).map(mapTemplateToRow),
    [namedTemplates],
  )

  const tabs = useMemo(
    () => [
      {
        label: `Active templates (${activeData.length})`,
        icon: 'description',
        iconPosition: 'left' as const,
      },
      {
        label: `Archived templates (${archivedData.length})`,
        icon: 'folder_closed',
        iconPosition: 'left' as const,
      },
    ],
    [activeData.length, archivedData.length],
  )

  const openEditor = useCallback(
    (templateId: string) => {
      selectTemplate(templateId)
      setView('template_editor')
    },
    [selectTemplate, setView],
  )

  const buildColumns = useCallback(
    (mode: 'active' | 'archived'): TemplateTableColumn[] => {
      const base: TemplateTableColumn[] = [
        { id: 'name', header: 'Name', accessor: 'name', sortable: true },
        { id: 'desc', header: 'Description', accessor: 'description', sortable: true },
        { id: 'q', header: 'Questions', accessor: 'questions', sortable: true },
        { id: 'updatedBy', header: 'Updated by', accessor: 'updatedBy', sortable: true },
        {
          id: 'lastUpdate',
          header: 'Last update',
          accessor: 'updatedAtSort',
          sortable: true,
          cellRenderer: (_value, row) => String((row as TemplateRow).updatedAt),
        },
      ]

      if (mode === 'archived') {
        base.push({
          id: 'updatedAt',
          header: 'Archived',
          accessor: 'updatedAtSort',
          sortable: true,
          cellRenderer: (_value, row) => String((row as TemplateRow).updatedAt),
        })
      }

      base.push(
        {
          id: 'status',
          header: 'Status',
          accessor: 'lifecycleStatus',
          sortable: true,
          cellRenderer: (value) =>
            createTemplateDisplayStatusBadge(String(value) as TemplateDisplayStatus),
        },
        {
          id: 'actions',
          header: '',
          accessor: 'id',
          sortable: false,
          cellRenderer: (value) => {
            const templateId = String(value)
            const actions =
              mode === 'active'
                ? [
                    createTableIconActionButton('Edit template', 'pencil', () =>
                      openEditor(templateId),
                    ),
                    createTableIconActionButton('Duplicate template', 'file_copy', () =>
                      duplicateTemplate(templateId),
                    ),
                    createTableIconActionButton('Archive template', 'folder_closed', () =>
                      openArchiveConfirm(templateId),
                    ),
                  ]
                : [
                    createTableIconActionButton('Edit template', 'pencil', () =>
                      openEditor(templateId),
                    ),
                    createTableIconActionButton('Duplicate template', 'file_copy', () =>
                      duplicateTemplate(templateId),
                    ),
                    createTableIconActionButton('Restore template', 'undo', () =>
                      unarchiveTemplate(templateId),
                    ),
                  ]
            return createTableActionGroup(actions, true)
          },
        },
      )

      return base
    },
    [duplicateTemplate, openArchiveConfirm, openEditor, unarchiveTemplate],
  )

  const activeColumns = useMemo(() => buildColumns('active'), [buildColumns])
  const archivedColumns = useMemo(() => buildColumns('archived'), [buildColumns])

  return (
    <TraqsperaPageBody>
      <TraqsperaPageHeader
        title="Review templates"
        subtitle="Create and manage evaluation templates (up to 10 questions)."
        onBack={() => setView('hr_dashboard')}
        backAriaLabel="Back to dashboard"
        actions={
          <ModusWcButton variant="filled" color="primary" size="sm" onButtonClick={startNewTemplate}>
            <ModusWcIcon name="add" size="xs" decorative />
            New Template
          </ModusWcButton>
        }
      />

      <div className="flex flex-col gap-3">
        {state.templateSaveNotice ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <ModusWcAlert
              variant="info"
              alertTitle="Template saved"
              alertDescription={state.templateSaveNotice}
            />
            <ModusWcButton
              variant="outlined"
              color="tertiary"
              size="sm"
              customClass="shrink-0"
              onButtonClick={clearTemplateSaveNotice}
            >
              Dismiss
            </ModusWcButton>
          </div>
        ) : null}

        <div className="tq-template-library-tabs min-w-0">
          <ModusWcTabs
            tabs={tabs}
            activeTabIndex={activeTabIndex}
            tabStyle="boxed"
            size="sm"
            customClass="tq-template-library-tabs__strip"
            aria-label="Template library"
            onTabChange={(e: CustomEvent<{ previousTab: number; newTab: number }>) =>
              setActiveTabIndex(e.detail.newTab)
            }
          />
        </div>

        <div hidden={activeTabIndex !== 0} aria-hidden={activeTabIndex !== 0}>
          <ModusWcCard bordered padding="compact" customClass={`${TRAQ_CARD_CLASS} tq-table-card`}>
            <PerformanceDataTable
              caption="Active review templates"
              columns={activeColumns}
              data={activeData}
            />
          </ModusWcCard>
        </div>

        <div hidden={activeTabIndex !== 1} aria-hidden={activeTabIndex !== 1}>
          <ModusWcCard bordered padding="compact" customClass={`${TRAQ_CARD_CLASS} tq-table-card`}>
            <PerformanceDataTable
              caption="Archived review templates"
              columns={archivedColumns}
              data={archivedData}
            />
          </ModusWcCard>
        </div>
      </div>

      <ModusWcModal
        modalId={ARCHIVE_TEMPLATE_MODAL_ID}
        backdrop="default"
        position="center"
        showClose
        aria-label="Archive review template"
      >
        <span slot="header">Archive template</span>
        <div slot="content">
          <ModusWcTypography
            hierarchy="p"
            size="sm"
            label={`Archive ${archiveTarget?.name ?? 'this template'}? It will move to Archived templates and will not appear when launching new review cycles. You can restore it later from the Archived tab.`}
          />
        </div>
        <div slot="footer" className="flex w-full flex-wrap justify-end gap-2">
          <ModusWcButton
            variant="outlined"
            color="tertiary"
            size="sm"
            onButtonClick={closeArchiveDialog}
          >
            Cancel
          </ModusWcButton>
          <ModusWcButton variant="filled" color="primary" size="sm" onButtonClick={confirmArchive}>
            <ModusWcIcon name="folder_closed" size="xs" decorative />
            Archive
          </ModusWcButton>
        </div>
      </ModusWcModal>
    </TraqsperaPageBody>
  )
}
