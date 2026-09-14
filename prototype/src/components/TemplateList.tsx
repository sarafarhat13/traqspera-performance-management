import { useMemo } from 'react'
import {
  ModusWcButton,
  ModusWcCard,
  ModusWcIcon,
} from '@trimble-oss/moduswebcomponents-react'
import { usePerformance } from '../context/PerformanceContext'
import { TraqsperaPageBody, TraqsperaPageHeader } from './TraqsperaPageHeader'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'
import { PerformanceDataTable } from './PerformanceDataTable'
import {
  createNeutralTagBadge,
  createTableActionButton,
  createTableActionGroup,
} from '../utils/modusTableCells'
import { formatDate } from '../utils/status'

export function TemplateList() {
  const { state, setView, selectTemplate, startNewTemplate, deleteTemplate } = usePerformance()

  const tableData = useMemo(
    () =>
      state.templates
        .filter((t) => t.name.trim().length > 0)
        .map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          questions: String(t.questions.length),
          createdBy: t.createdBy ?? (t.isPrebuilt ? 'Traqspera' : '—'),
          createdAt: t.createdAt ? formatDate(t.createdAt) : '—',
          createdAtSort: t.createdAt ?? '',
          type: t.isPrebuilt ? 'Prebuilt' : 'Custom',
        })),
    [state.templates],
  )

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

      <ModusWcCard bordered padding="compact" customClass={`${TRAQ_CARD_CLASS} tq-table-card`}>
        <PerformanceDataTable
          caption="Review Templates"
          columns={[
            { id: 'name', header: 'Name', accessor: 'name', sortable: true },
            { id: 'desc', header: 'Description', accessor: 'description', sortable: true },
            { id: 'q', header: 'Questions', accessor: 'questions', sortable: true },
            { id: 'createdBy', header: 'Created by', accessor: 'createdBy', sortable: true },
            {
              id: 'createdAt',
              header: 'Created',
              accessor: 'createdAtSort',
              sortable: true,
              cellRenderer: (_value, row) => String((row as { createdAt: string }).createdAt),
            },
            {
              id: 'type',
              header: 'Type',
              accessor: 'type',
              sortable: true,
              cellRenderer: (value) => createNeutralTagBadge(String(value)),
            },
            {
              id: 'actions',
              header: '',
              accessor: 'id',
              sortable: false,
              cellRenderer: (value, row) => {
                const isPrebuilt = (row as { type: string }).type === 'Prebuilt'
                return createTableActionGroup([
                  createTableActionButton('Edit', () => {
                    selectTemplate(String(value))
                    setView('template_editor')
                  }),
                  createTableActionButton(
                    'Delete',
                    () => deleteTemplate(String(value)),
                    'danger',
                    isPrebuilt,
                  ),
                ])
              },
            },
          ]}
          data={tableData}
        />
      </ModusWcCard>
    </TraqsperaPageBody>
  )
}
