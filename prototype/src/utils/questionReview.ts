import type { Question } from '../types'

/** Ensure each template question has a text answer slot in local form state. */
export function seedQuestionAnswerKeys(
  questions: Question[],
  existing?: Record<string, string>,
): Record<string, string> {
  const seed: Record<string, string> = { ...existing }
  questions.forEach((q) => {
    if (seed[q.id] === undefined) seed[q.id] = ''
  })
  return seed
}
