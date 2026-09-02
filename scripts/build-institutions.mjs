/**
 * Builds the generated institution dataset from the pinned hipolabs snapshot,
 * the paginated ROR India education slice, and the existing fixture entries.
 *
 * No third-party packages are required. Node 22 provides global fetch.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Deliberately pinned: hipolabs is community-maintained, so a bad upstream edit
// must appear as a reviewable generated-data diff rather than changing silently.
const HIPOLABS_PINNED_SHA = '47b9d0732cebdd6492101627031e096b674c48f8';
// Single scope switch: an ISO alpha-2 code narrows both sources, `null` takes
// every country for the worldwide phase.
const COUNTRY_CODE = 'IN';
const ROR_FILTER = ['types:education', COUNTRY_CODE ? `country.country_code:${COUNTRY_CODE}` : null]
  .filter(Boolean)
  .join(',');
const ROR_PAGE_SIZE = 20;
const REQUEST_DELAY_MS = 150;
const USER_AGENT = 'Calmi-Web-institutions-refresh/1.0 (+https://github.com/Calmi-Web)';
const HIPOLABS_URL = `https://raw.githubusercontent.com/Hipo/university-domains-list/${HIPOLABS_PINNED_SHA}/world_universities_and_domains.json`;
const ROR_API_URL = 'https://api.ror.org/v2/organizations';
const GITHUB_COMMITS_URL = 'https://api.github.com/repos/Hipo/university-domains-list/commits?path=world_universities_and_domains.json&per_page=1';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixtureFile = resolve(
  projectRoot,
  'src/app/features/student-verification/services/student-verification.fixtures.ts',
);
const outputFile = resolve(
  projectRoot,
  'src/app/features/student-verification/services/institutions.data.ts',
);

const sleep = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

async function fetchJson(url, { label, retryOnce = false } = {}) {
  const attempts = retryOnce ? 2 : 1;
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': USER_AGENT,
        },
      });
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        console.warn(`[institutions] ${label ?? url} failed; retrying once: ${errorMessage(error)}`);
        await sleep(REQUEST_DELAY_MS * 2);
      }
    }
  }

  throw new Error(`${label ?? url} failed twice: ${errorMessage(lastError)}`);
}

function parseTsString(value) {
  return value
    .replace(/\\(['"\\])/g, '$1')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t');
}

function readFixtureInstitutions() {
  const source = readFileSync(fixtureFile, 'utf8');
  const institutions = [];
  const objectPattern = /\{\s*id:\s*(['"])([\s\S]*?)\1,\s*name:\s*(['"])([\s\S]*?)\3,\s*domains:\s*\[([\s\S]*?)\]\s*\}/g;
  const domainPattern = /(['"])([\s\S]*?)\1/g;

  for (const match of source.matchAll(objectPattern)) {
    const domains = [];
    for (const domainMatch of match[5].matchAll(domainPattern)) {
      domains.push(parseTsString(domainMatch[2]));
    }
    institutions.push({
      id: parseTsString(match[2]),
      name: parseTsString(match[4]),
      domains,
    });
  }

  if (institutions.length === 0) {
    throw new Error(`No fixture institutions found in ${fixtureFile}`);
  }
  return institutions;
}

function normalizeName(name) {
  return String(name ?? '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .replace(/^the(?:\s+|$)/, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

const ALIAS_GROUPS = [
  ['iiitdm', 'indian institute of information technology design and manufacturing'],
  ['iiit', 'indian institute of information technology'],
  ['iiser', 'indian institute of science education and research'],
  ['iisc', 'indian institute of science'],
  ['iit', 'indian institute of technology'],
  ['nit', 'national institute of technology'],
  ['iim', 'indian institute of management'],
  ['bits', 'birla institute of technology and science'],
  ['aiims', 'all india institute of medical sciences'],
  ['nift', 'national institute of fashion technology'],
  ['nid', 'national institute of design'],
  ['vit', 'vellore institute of technology'],
  ['srm', 'srm institute of science and technology'],
  ['dr', 'doctor'],
  ['st', 'saint'],
];

function matchingWords(name) {
  return String(name ?? '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^the(?:\s+|$)/, '')
    .trim();
}

function applyAliases(words, direction) {
  let result = words;
  for (const [shortName, longName] of ALIAS_GROUPS) {
    const from = direction === 'expand' ? shortName : longName;
    const to = direction === 'expand' ? longName : shortName;
    result = result.replace(new RegExp(`(?:^|\\s)${from}(?=\\s|$)`, 'g'), (match) => (
      `${match.startsWith(' ') ? ' ' : ''}${to}`
    ));
  }
  return result.replace(/\s+/g, ' ').trim();
}

function removeQualifiers(words) {
  return words
    .replace(/\s*\([^)]*\)/g, ' ')
    .replace(/\s*,\s*[^,]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function candidateKeysForName(name) {
  const rawWords = matchingWords(name);
  if (!rawWords) return new Map();

  const variants = new Map([
    [normalizeName(name), 'raw'],
    [normalizeName(applyAliases(rawWords, 'expand')), 'alias-expanded'],
    [normalizeName(applyAliases(rawWords, 'collapse')), 'alias-collapsed'],
  ]);
  const qualifierlessWords = removeQualifiers(rawWords);
  if (qualifierlessWords && qualifierlessWords !== rawWords) {
    variants.set(`qualifier:${normalizeName(qualifierlessWords)}`, 'qualifierless');
    variants.set(
      `qualifier:${normalizeName(applyAliases(qualifierlessWords, 'expand'))}`,
      'qualifierless-alias-expanded',
    );
    variants.set(
      `qualifier:${normalizeName(applyAliases(qualifierlessWords, 'collapse'))}`,
      'qualifierless-alias-collapsed',
    );
  }
  variants.delete('');
  return variants;
}

function recordCandidateKeys(record) {
  const keys = new Map();
  for (const name of record.matchNames ?? [record.name]) {
    for (const [key, kind] of candidateKeysForName(name)) {
      if (!keys.has(key)) keys.set(key, { kind, name });
    }
  }
  return keys;
}

function qualifierSignature(name) {
  const source = String(name ?? '');
  const parenthetical = [...source.matchAll(/\(([^)]*)\)/g)].map((match) => matchingWords(match[1]));
  const commaMatch = source.match(/,\s*([^,]+)$/);
  const comma = commaMatch ? matchingWords(commaMatch[1]) : '';
  return [...new Set([...parenthetical, comma].filter(Boolean))].sort().join('|');
}

function qualifierlessKey(key) {
  return key.startsWith('qualifier:') ? key : null;
}

function sharedIdentityKeys(left, right, allRecords) {
  const leftKeys = recordCandidateKeys(left);
  const rightKeys = recordCandidateKeys(right);
  const shared = [...leftKeys.keys()].filter((key) => rightKeys.has(key));
  const regular = shared.filter((key) => !qualifierlessKey(key));
  if (regular.length > 0) return regular;

  const qualifierCounts = new Map();
  for (const record of allRecords) {
    for (const key of recordCandidateKeys(record).keys()) {
      if (!qualifierlessKey(key)) continue;
      qualifierCounts.set(key, (qualifierCounts.get(key) ?? 0) + 1);
    }
  }
  return shared.filter((key) => (qualifierCounts.get(key) ?? 0) === 1);
}

function qualifierCompatible(left, right, sharedKeys) {
  const leftNames = left.matchNames ?? [left.name];
  const rightNames = right.matchNames ?? [right.name];
  for (const leftName of leftNames) {
    const leftKeys = candidateKeysForName(leftName);
    for (const rightName of rightNames) {
      const rightKeys = candidateKeysForName(rightName);
      if (!sharedKeys.some((key) => leftKeys.has(key) && rightKeys.has(key))) continue;
      const leftQualifier = qualifierSignature(leftName);
      const rightQualifier = qualifierSignature(rightName);
      if (!leftQualifier || !rightQualifier || leftQualifier === rightQualifier) return true;
    }
  }
  return false;
}

function canMergeIdentity(left, right, allRecords) {
  if (left.rorId && right.rorId && left.rorId !== right.rorId) return null;
  const sharedKeys = sharedIdentityKeys(left, right, allRecords);
  if (sharedKeys.length === 0) return null;
  if (sharedKeys.every((key) => qualifierlessKey(key))) {
    if (!qualifierCompatible(left, right, sharedKeys)) return null;
  }
  return sharedKeys;
}

function displayRank(record) {
  if (record.sourceType === 'fixture') return 0;
  if (record.sourceType === 'hipolabs') return 1;
  return 2;
}

function mergeIdentityRecord(target, incoming) {
  const targetRank = displayRank(target);
  const incomingRank = displayRank(incoming);
  if (incomingRank < targetRank || (incomingRank === targetRank && incoming.name.length < target.name.length)) {
    target.name = incoming.name;
    target.sourceType = incoming.sourceType;
  }
  target.matchNames = [...new Set([...(target.matchNames ?? [target.name]), ...(incoming.matchNames ?? [incoming.name])])];
  target.domains = normalizeDomains(target.domains, incoming.domains);
  target.rorId ??= incoming.rorId;
  target.sourceTypes = new Set([...(target.sourceTypes ?? []), ...(incoming.sourceTypes ?? [])]);
  target.rorIds = new Set([...(target.rorIds ?? []), ...(incoming.rorIds ?? [])]);
}

function mergeIdentityRecords(records, label) {
  const merged = [];
  let collapsedPairs = 0;
  for (const incoming of records) {
    const matches = [];
    for (const existing of merged) {
      const sharedKeys = canMergeIdentity(existing, incoming, [...merged, incoming]);
      if (sharedKeys) matches.push({ existing, sharedKeys });
    }
    if (matches.length === 0) {
      merged.push({
        ...incoming,
        matchNames: [...new Set(incoming.matchNames ?? [incoming.name])],
        sourceTypes: new Set(incoming.sourceTypes ?? [incoming.sourceType]),
        rorIds: new Set(incoming.rorIds ?? (incoming.rorId ? [incoming.rorId] : [])),
      });
      continue;
    }

    const target = matches[0].existing;
    for (const { existing, sharedKeys } of matches) {
      const incomingName = existing === target ? incoming.name : existing.name;
      console.log(`[institutions] merge ${label}: "${target.name}" <= "${incomingName}" via ${sharedKeys.join(', ')}`);
      if (sharedKeys.length > 1) {
        console.log(`[institutions] multi-key match ${label}: "${target.name}" / "${incomingName}" via ${sharedKeys.join(', ')}`);
      }
      if (existing !== target) {
        mergeIdentityRecord(target, existing);
        merged.splice(merged.indexOf(existing), 1);
      }
      if (existing === target) mergeIdentityRecord(target, incoming);
      collapsedPairs += 1;
    }
  }
  return { records: merged, collapsedPairs };
}
function slugify(name) {
  return String(name ?? '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Registry suffixes that must never become an allowlist entry: an institution
// claiming `ac.in` would authorise every academic domain in India. Real ROR
// records do carry these (Adani University -> `ac.in`), so filter at the source
// as well as at runtime. Mirrors the guard in student-verification.service.ts.
const REGISTRY_SUFFIXES = new Set([
  'ac.in', 'co.in', 'edu.in', 'ernet.in', 'firm.in', 'gen.in', 'gov.in', 'ind.in',
  'mil.in', 'net.in', 'nic.in', 'org.in', 'res.in',
  'ac.uk', 'edu.au', 'ac.nz', 'ac.jp', 'edu.sg', 'com', 'net', 'org', 'edu', 'in', 'uk',
]);

/** A domain is allowlist-eligible only if it is a concrete registrable host. */
function isEligibleDomain(domain) {
  if (!domain || domain.length > 253 || domain.startsWith('.') || domain.endsWith('.')) return false;
  if (!/^[a-z0-9.-]+$/.test(domain)) return false; // ASCII only; punycode is already ASCII.
  const labels = domain.split('.');
  if (labels.length < 2) return false;
  if (labels.some((label) => !label || label.startsWith('-') || label.endsWith('-'))) return false;
  return !REGISTRY_SUFFIXES.has(domain);
}

function normalizeDomains(...values) {
  const domains = new Set();
  for (const value of values.flat(Infinity)) {
    if (typeof value !== 'string') continue;
    const domain = value.trim().toLowerCase();
    if (isEligibleDomain(domain)) domains.add(domain);
  }
  return [...domains].sort((left, right) => left.localeCompare(right));
}

function preferredRorName(record) {
  const names = Array.isArray(record.names) ? record.names : [];
  const preferred = names.find((name) => name?.types?.includes('ror_display'))
    ?? names.find((name) => name?.types?.includes('label'))
    ?? names.find((name) => name?.lang === 'en')
    ?? names[0];
  return typeof preferred?.value === 'string' ? preferred.value.trim() : '';
}

function rorNames(record) {
  return (Array.isArray(record.names) ? record.names : [])
    .map((name) => typeof name?.value === 'string' ? name.value.trim() : '')
    .filter(Boolean);
}

function bareRorId(value) {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const trimmed = value.trim();
  return trimmed.startsWith('https://ror.org/') ? trimmed : `https://ror.org/${trimmed.replace(/^https?:\/\/ror\.org\//, '')}`;
}

async function resolveHipolabsSha() {
  const response = await fetchJson(GITHUB_COMMITS_URL, { label: 'GitHub hipolabs SHA lookup', retryOnce: true });
  const sha = response?.[0]?.sha;
  if (typeof sha !== 'string' || !sha) {
    throw new Error('GitHub did not return a commit SHA for world_universities_and_domains.json');
  }
  console.log(`[institutions] Current hipolabs SHA: ${sha}`);
}

async function fetchHipolabs() {
  const response = await fetchJson(HIPOLABS_URL, { label: 'hipolabs dataset', retryOnce: true });
  if (!Array.isArray(response)) throw new Error('hipolabs response was not an array');
  return response.filter((record) => (
    (!COUNTRY_CODE || record?.alpha_two_code === COUNTRY_CODE) && String(record.name ?? '').trim()
  ));
}

async function fetchRorIndiaEducation() {
  const records = [];
  let page = 1;
  let expectedTotal = Number.POSITIVE_INFINITY;

  while (records.length < expectedTotal) {
    const url = `${ROR_API_URL}?filter=${ROR_FILTER}&page=${page}`;
    const response = await fetchJson(url, { label: `ROR page ${page}`, retryOnce: true });
    const items = Array.isArray(response?.items) ? response.items : [];
    if (page === 1 && Number.isFinite(Number(response?.number_of_results))) {
      expectedTotal = Number(response.number_of_results);
    }
    if (items.length === 0) break;
    records.push(...items);
    if (page === 1 || page % 25 === 0 || records.length >= expectedTotal) {
      console.log(`[institutions] ROR page ${page}: ${Math.min(records.length, expectedTotal)}/${expectedTotal}`);
    }
    if (items.length < ROR_PAGE_SIZE || records.length >= expectedTotal) break;
    page += 1;
    await sleep(REQUEST_DELAY_MS);
  }

  return records;
}

function aggregateHipolabs(records) {
  const byName = new Map();
  for (const record of records) {
    const name = String(record.name ?? '').trim();
    const key = normalizeName(name);
    if (!key) continue;
    const existing = byName.get(key);
    if (existing) {
      existing.domains = normalizeDomains(existing.domains, record.domains);
    } else {
      byName.set(key, {
        name,
        domains: normalizeDomains(record.domains),
      });
    }
  }
  return byName;
}

function aggregateRor(records) {
  const byId = new Map();
  for (const record of records) {
    const id = bareRorId(record?.id);
    const name = preferredRorName(record);
    if (!id || !name) continue;
    const existing = byId.get(id);
    if (existing) {
      existing.domains = normalizeDomains(existing.domains, record.domains);
      existing.names = [...new Set([...existing.names, ...rorNames(record)])];
    } else {
      byId.set(id, {
        id,
        name,
        names: rorNames(record),
        domains: normalizeDomains(record.domains),
      });
    }
  }
  return [...byId.values()];
}

function joinSources(hipolabsRecords, rorRecords) {
  const hipolabs = aggregateHipolabs(hipolabsRecords);
  const sourceRecords = [];
  for (const record of hipolabs.values()) {
    sourceRecords.push({
      name: record.name,
      matchNames: [record.name],
      domains: normalizeDomains(record.domains),
      sourceType: 'hipolabs',
      sourceTypes: ['hipolabs'],
    });
  }
  for (const record of rorRecords) {
    sourceRecords.push({
      name: record.name,
      matchNames: [record.name, ...record.names],
      // ROR-only records must never turn sparse ROR domains into allowlist entries.
      domains: normalizeDomains(record.domains),
      rorId: record.id,
      sourceType: 'ror',
      sourceTypes: ['ror'],
    });
  }

  const merged = mergeIdentityRecords(sourceRecords, 'sources');
  const sourceEntries = merged.records.map((record) => ({
    name: record.name,
    matchNames: record.matchNames,
    domains: record.domains,
    sourceType: record.sourceType,
    sourceTypes: [...record.sourceTypes],
    ...(record.rorId ? { rorId: record.rorId } : {}),
  }));
  const matchedRorIds = new Set(
    merged.records
      .filter((record) => record.sourceTypes.has('hipolabs'))
      .flatMap((record) => [...record.rorIds]),
  );

  return {
    sourceEntries,
    matchedRorIds,
    duplicatePairsCollapsed: merged.collapsedPairs,
  };
}

function mergeSourcesWithFixtures(sourceEntries, fixtureInstitutions) {
  const fixtureById = new Map(fixtureInstitutions.map((fixture) => [fixture.id, fixture]));
  const records = fixtureInstitutions.map((fixture) => ({
    id: fixture.id,
    name: fixture.name,
    matchNames: [fixture.name],
    domains: normalizeDomains(fixture.domains),
    sourceType: 'fixture',
    sourceTypes: ['fixture'],
  }));
  const coveredFixtureIds = new Set();

  for (const source of sourceEntries) {
    if (!source.name.trim()) continue;
    const generatedId = slugify(source.name);
    const fixture = fixtureById.get(generatedId);
    const matchNames = [...(source.matchNames ?? [source.name])];
    if (fixture) {
      // Exact fixture IDs remain authoritative even where aliases cannot infer
      // the relationship (for example IISc Bangalore).
      matchNames.push(fixture.name);
    }
    records.push({
      id: fixture?.id ?? generatedId,
      name: source.name.trim(),
      matchNames,
      domains: normalizeDomains(source.domains),
      sourceType: source.sourceType,
      sourceTypes: source.sourceTypes ?? [source.sourceType],
      ...(source.rorId ? { rorId: source.rorId } : {}),
      ...(fixture ? { fixtureId: fixture.id } : {}),
    });
  }

  const merged = mergeIdentityRecords(records, 'fixtures');
  const entries = merged.records
    .map((record) => {
      const fixture = record.sourceTypes.has('fixture') ? fixtureById.get(record.id) : undefined;
      if (fixture) {
        if (record.sourceTypes.size > 1) coveredFixtureIds.add(fixture.id);
        return {
          id: fixture.id,
          name: fixture.name,
          domains: normalizeDomains(record.domains, fixture.domains),
          ...(record.rorId ? { rorId: record.rorId } : {}),
        };
      }
      return {
        id: slugify(record.name),
        name: record.name,
        domains: normalizeDomains(record.domains),
        ...(record.rorId ? { rorId: record.rorId } : {}),
      };
    })
    .filter((entry) => entry.name.trim())
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    entries,
    coveredFixtureIds,
    missingFixtures: fixtureInstitutions.filter((fixture) => !coveredFixtureIds.has(fixture.id)),
    duplicatePairsCollapsed: merged.collapsedPairs,
  };
}
function tsString(value) {
  return `'${String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')}'`;
}

function renderDataFile(entries, sourceProvenance, version) {
  const lines = [
    '// GENERATED FILE — do not edit by hand. Run `npm run institutions:refresh`.',
    "import type { Institution } from '../models/student-verification.model';",
    '',
    `export const GENERATED_INSTITUTIONS_VERSION = ${tsString(version)};`,
    `export const GENERATED_INSTITUTIONS_SOURCES = ${tsString(sourceProvenance)};`,
    'export const GENERATED_INSTITUTIONS: readonly Institution[] = [',
  ];

  for (const entry of entries) {
    const rorProperty = entry.rorId ? `, rorId: ${tsString(entry.rorId)}` : '';
    const domains = entry.domains.map((domain) => tsString(domain)).join(', ');
    lines.push(`  { id: ${tsString(entry.id)}, name: ${tsString(entry.name)}, domains: [${domains}]${rorProperty} },`);
  }
  lines.push('];', '');
  return lines.join('\n');
}

function auditRequestedInstitutions(entries) {
  const checks = [
    ['IIT Bhilai', 'Indian Institute of Technology Bhilai'],
    ['IIT Goa'],
    ['IIT Jammu'],
    ['IIT (ISM) Dhanbad', 'Indian Institute of Technology Dhanbad'],
    ['IIT (BHU) Varanasi'],
  ];
  for (const names of checks) {
    const expected = { name: names[0], matchNames: names };
    const matches = entries.filter((entry) => canMergeIdentity(expected, entry, entries));
    const details = matches.map((entry) => `${entry.name}; domains=${entry.domains.length}; rorId=${entry.rorId ?? 'none'}`).join(' | ');
    console.log(`[institutions] Audit ${names.join(' / ')}: count=${matches.length}${details ? `; ${details}` : ''}`);
  }
}

async function main() {
  if (process.argv.includes('--resolve-sha')) {
    await resolveHipolabsSha();
    return;
  }

  const [hipolabsRecords, rorRawRecords] = await Promise.all([
    fetchHipolabs(),
    fetchRorIndiaEducation(),
  ]);
  const rorRecords = aggregateRor(rorRawRecords);
  const fixtures = readFixtureInstitutions();
  const joined = joinSources(hipolabsRecords, rorRecords);
  const merged = mergeSourcesWithFixtures(joined.sourceEntries, fixtures);
  const entries = merged.entries;
  const version = new Date().toISOString().slice(0, 10);
  const provenance = `hipolabs sha ${HIPOLABS_PINNED_SHA}; ROR query ${ROR_FILTER}; counts hipolabs=${hipolabsRecords.length}, ror=${rorRecords.length}, joined=${joined.matchedRorIds.size}`;

  writeFileSync(outputFile, renderDataFile(entries, provenance, version), 'utf8');

  const withDomains = entries.filter((entry) => entry.domains.length > 0).length;
  const domainless = entries.length - withDomains;
  const rorMatched = entries.filter((entry) => entry.rorId).length;
  const duplicatePairsCollapsed = joined.duplicatePairsCollapsed + merged.duplicatePairsCollapsed;
  console.log(`[institutions] Generated ${outputFile}`);
  console.log(`[institutions] Counts: total=${entries.length}, with domains=${withDomains}, domainless=${domainless}, ror-matched=${rorMatched}, duplicate-pairs-collapsed=${duplicatePairsCollapsed}`);
  console.log(`[institutions] Fixtures: ${merged.coveredFixtureIds.size} preserved from upstream, ${merged.missingFixtures.length} missing upstream.`);
  auditRequestedInstitutions(entries);
  if (merged.missingFixtures.length > 0) {
    console.log('[institutions] Fixture entries not covered upstream:');
    for (const fixture of merged.missingFixtures) console.log(`  - ${fixture.id}: ${fixture.name}`);
  }
}

main().catch((error) => {
  console.error(`[institutions] ERROR: ${errorMessage(error)}`);
  process.exitCode = 1;
});