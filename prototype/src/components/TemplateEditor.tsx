import { useEffect, useRef, useState } from 'react'
import { ModusWcTypography } from '@trimble-oss/moduswebcomponents-react'
import { usePerformance } from '../context/PerformanceContext'
import type { ReviewTemplate } from '../types'
import { CreateTemplateForm } from './CreateTemplateForm'
import { TraqsperaPageBody, TraqsperaPageHeader } from './TraqsperaPageHeader'

export function TemplateEditor() {
  const { saveTemplate, setView, getTemplate, state } = usePerformance()
  const templateId = state.editingTemplateId ?? state.selectedTemplateId
  const existing = templateId ? getTemplate(templateId) : undefined

  const [draft, setDraft] = useState<ReviewTemplate | null>(existing ?? null)
  const isNewTemplate = useRef(!existing?.name?.trim()).current

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
    saveTemplate({
      ...draft,
      questions: draft.questions.map((q, i) => ({ ...q, order: i + 1 })),
    })
  }

  return (
    <TraqsperaPageBody>
      <TraqsperaPageHeader
        title={isNewTemplate ? 'Create Template' : 'Edit Template'}
        onBack={() => setView('templates')}
        backAriaLabel="Back to review templates"
      />

      <CreateTemplateForm
        draft={draft}
        onDraftChange={setDraft}
        onCancel={() => setView('templates')}
        onSubmit={handleSave}
        submitLabel={isNewTemplate ? 'Create Template' : 'Save template'}
      />
    </TraqsperaPageBody>
  )
}
