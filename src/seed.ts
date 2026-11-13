import type { Category, Exercise } from './types'

const raw: [string, Category, string][] = [
  ['Bankdrücken', 'barbell', 'Brust'],
  ['Schrägbankdrücken', 'barbell', 'Brust'],
  ['Kurzhantel-Bankdrücken', 'dumbbell', 'Brust'],
  ['Kurzhantel-Schrägbankdrücken', 'dumbbell', 'Brust'],
  ['Fliegende', 'dumbbell', 'Brust'],
  ['Brustpresse', 'machine', 'Brust'],
  ['Butterfly', 'machine', 'Brust'],
  ['Kabel-Crossover', 'cable', 'Brust'],
  ['Liegestütze', 'bodyweight', 'Brust'],
  ['Dips', 'bodyweight', 'Brust'],
  ['Kniebeuge', 'barbell', 'Beine'],
  ['Frontkniebeuge', 'barbell', 'Beine'],
  ['Kreuzheben', 'barbell', 'Rücken'],
  ['Rumänisches Kreuzheben', 'barbell', 'Beine'],
  ['Beinpresse', 'machine', 'Beine'],
  ['Beinstrecker', 'machine', 'Beine'],
  ['Beinbeuger', 'machine', 'Beine'],
  ['Ausfallschritte', 'dumbbell', 'Beine'],
  ['Bulgarian Split Squat', 'dumbbell', 'Beine'],
  ['Goblet Squat', 'dumbbell', 'Beine'],
  ['Hip Thrust', 'barbell', 'Po'],
  ['Wadenheben stehend', 'machine', 'Waden'],
  ['Wadenheben sitzend', 'machine', 'Waden'],
  ['Adduktoren', 'machine', 'Beine'],
  ['Abduktoren', 'machine', 'Po'],
  ['Klimmzüge', 'bodyweight', 'Rücken'],
  ['Latzug', 'cable', 'Rücken'],
  ['Rudern vorgebeugt', 'barbell', 'Rücken'],
  ['Kurzhantel-Rudern', 'dumbbell', 'Rücken'],
  ['Kabelrudern sitzend', 'cable', 'Rücken'],
  ['Rudermaschine', 'machine', 'Rücken'],
  ['T-Bar-Rudern', 'barbell', 'Rücken'],
  ['Face Pulls', 'cable', 'Schultern'],
  ['Rückenstrecker', 'bodyweight', 'Rücken'],
  ['Schulterdrücken', 'barbell', 'Schultern'],
  ['Kurzhantel-Schulterdrücken', 'dumbbell', 'Schultern'],
  ['Schulterpresse', 'machine', 'Schultern'],
  ['Seitheben', 'dumbbell', 'Schultern'],
  ['Seitheben am Kabel', 'cable', 'Schultern'],
  ['Reverse Butterfly', 'machine', 'Schultern'],
  ['Aufrechtes Rudern', 'barbell', 'Schultern'],
  ['Shrugs', 'dumbbell', 'Nacken'],
  ['Langhantel-Curls', 'barbell', 'Bizeps'],
  ['Kurzhantel-Curls', 'dumbbell', 'Bizeps'],
  ['Hammer-Curls', 'dumbbell', 'Bizeps'],
  ['SZ-Curls', 'barbell', 'Bizeps'],
  ['Kabel-Curls', 'cable', 'Bizeps'],
  ['Preacher Curls', 'machine', 'Bizeps'],
  ['Trizepsdrücken am Kabel', 'cable', 'Trizeps'],
  ['French Press', 'barbell', 'Trizeps'],
  ['Trizeps Überkopf', 'dumbbell', 'Trizeps'],
  ['Enges Bankdrücken', 'barbell', 'Trizeps'],
  ['Crunches', 'bodyweight', 'Bauch'],
  ['Plank', 'bodyweight', 'Bauch'],
  ['Beinheben hängend', 'bodyweight', 'Bauch'],
  ['Kabel-Crunch', 'cable', 'Bauch'],
  ['Russian Twist', 'bodyweight', 'Bauch'],
  ['Laufband', 'cardio', 'Cardio'],
  ['Rudergerät', 'cardio', 'Cardio'],
  ['Fahrrad-Ergometer', 'cardio', 'Cardio'],
  ['Crosstrainer', 'cardio', 'Cardio'],
  ['Stepper', 'cardio', 'Cardio'],
]

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export const SEED_EXERCISES: Exercise[] = raw.map(([name, category, muscle]) => ({
  id: `ex-${slug(name)}`,
  name,
  category,
  muscle,
}))
