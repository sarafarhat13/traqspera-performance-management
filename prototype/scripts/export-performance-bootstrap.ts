import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  seedTemplates,
  seedCycles,
  seedReviews,
  seedReviewGroups,
  seedPeople,
} from '../src/data/seed'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const payload = {
  seedVersion: 28,
  activePersonId: 'mgr-1',
  templates: seedTemplates,
  reviewGroups: seedReviewGroups,
  cycles: seedCycles,
  reviews: seedReviews,
  people: seedPeople,
}

const outDir = join(root, '..', 'integration', 'traqspera-web', 'database', 'seeders', 'data')
mkdirSync(outDir, { recursive: true })
const outPath = join(outDir, 'performance_bootstrap.json')
writeFileSync(outPath, JSON.stringify(payload, null, 2))
console.log('Wrote', outPath)
