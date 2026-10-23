import { useEffect, useRef, useState } from 'react'
import { ModusWcAlert, ModusWcTypography } from '@trimble-oss/moduswebcomponents-react'
import { usePerformance } from '../context/PerformanceContext'
import type { ReviewTemplate } from '../types'
import { CreateTemplateForm } from './CreateTemplateForm'
import { TraqsperaPageBody, TraqsperaPageHeader } from './TraqsperaPageHeader'
import { isTemplateEditable } from '../utils/templateLifecycle'

export function TemplateEditor() {
  const { saveTemplate, setView, getTemplate, state } = usePerformance()
  const templateId = state.editingTemplateId ?? state.selectedTemplateId
  const existing = templateId ? getTemplate(templateId) : undefined

  const [draft, setDraft] = useState<ReviewTemplate | null>(existing ?? null)
  const isNewTemplate = useRef(!existing?.name?.trim()).current
  const readOnly = draft ? !isTemplateEditable(draft) : false
  const viewingPublished = Boolean(
    draft?.lifecycleStatus === 'published' && !draft.isArchived,
  )

  useEffect(() => {
    if (existing) setDraft({ ...existing, questions: [...existing.questions] })
  }, [existing?.id])

  if (!draft) {
    return (
      <TraqsperaPageBody>
        <ModusWcTypography hierarchy="p" size="md" label="No template selected." />
      </TraqsperaPageBody>
    )
  }

  const handleSave = () => {
    if (readOnly) return
    saveTemplate({
      ...draft,
      questions: draft.questions.map((q, i) => ({ ...q, order: i + 1 })),
    })
  }

  const pageTitle = isNewTemplate
    ? 'Create Template'
    : readOnly
      ? 'View template'
      : 'Edit Template'

  return (
    <TraqsperaPageBody>
      <TraqsperaPageHeader
        title={pageTitle}
        onBack={() => setView('templates')}
        backAriaLabel="Back to review templates"
      />

      <div className="flex flex-col gap-3">
        {viewingPublished ? (
          <ModusWcAlert
            variant="info"
            alertTitle="Published template"
            alertDescription="Published templates cannot be edited. Duplicate this template from the library to create a draft you can change for new review cycles."
          />
        ) : null}

        <CreateTemplateForm
          draft={draft}
          onDraftChange={setDraft}
          onCancel={() => setView('templates')}
          onSubmit={handleSave}
          submitLabel={isNewTemplate ? 'Create Template' : 'Save template'}
          readOnly={readOnly}
        />
      </div>
    </TraqsperaPageBody>
  )
}
