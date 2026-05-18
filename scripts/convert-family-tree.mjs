import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const raw = JSON.parse(readFileSync(join(root, 'docs/family_tree/laryn_tree.txt'), 'utf8'));
const subject = raw.subject;

const peopleMap = new Map(); // gedcom_id → person record
const idsByGedcom = new Map(); // gedcom_id → slug id
const relSet = new Set();
const relationships = [];
const visited = new Set();

function toId(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-');
}

function addPerson(node) {
  if (!node?.gedcom_id || peopleMap.has(node.gedcom_id)) return;
  const id = toId(node.name);
  peopleMap.set(node.gedcom_id, {
    id,
    name: node.name,
    gender: node.sex === 'M' ? 'male' : 'female',
    birthDate: node.birth?.date || '',
    birthLocation: node.birth?.place || '',
    deathDate: node.death?.date || null,
    notes: '',
    photos: ['placeholder.svg'],
  });
  idsByGedcom.set(node.gedcom_id, id);
}

function gid(node) {
  return idsByGedcom.get(node?.gedcom_id);
}

function addRel(type, idA, idB) {
  if (!idA || !idB) return;
  const fwd = `${type}|${idA}|${idB}`;
  const rev = `${type}|${idB}|${idA}`;
  if (relSet.has(fwd) || (type === 'spouse' && relSet.has(rev))) return;
  relSet.add(fwd);
  relationships.push({ personAId: idA, personBId: idB, type });
}

function processLineage(person) {
  if (!person?.gedcom_id || visited.has(person.gedcom_id)) return;
  visited.add(person.gedcom_id);
  addPerson(person);

  const pId = gid(person);

  // Spouses at this level — add as people, create spouse edges
  if (person.spouses) {
    for (const spouse of person.spouses) {
      addPerson(spouse);
      addRel('spouse', pId, gid(spouse));
    }
  }

  // Recurse up through parents
  if (person.parents) {
    for (const pp of person.parents) {
      if (pp.father) {
        addPerson(pp.father);
        addRel('parent', gid(pp.father), pId);
        processLineage(pp.father);
      }
      if (pp.mother) {
        addPerson(pp.mother);
        addRel('parent', gid(pp.mother), pId);
        processLineage(pp.mother);
      }
      if (pp.father && pp.mother) {
        addRel('spouse', gid(pp.father), gid(pp.mother));
      }
    }
  }
}

// Walk the subject and all ancestors
processLineage(subject);

// Walk children (one level down, plus their spouses)
if (subject.children) {
  const subjectId = gid(subject);
  for (const child of subject.children) {
    addPerson(child);
    addRel('parent', subjectId, gid(child));
    if (child.spouses) {
      for (const spouse of child.spouses) {
        addPerson(spouse);
        addRel('spouse', gid(child), gid(spouse));
      }
    }
  }
}

const people = [...peopleMap.values()];

const out = {
  family_id: 'brown-family',
  people,
  relationships,
};

writeFileSync(join(root, 'src/data/family.json'), JSON.stringify(out, null, 2));

console.log(`Done. ${people.length} people, ${relationships.length} relationships.`);
console.log('People:', people.map(p => `${p.id} (${p.gender})`).join('\n       '));
console.log('Rels:', relationships.map(r => `${r.type}: ${r.personAId} → ${r.personBId}`).join('\n      '));
