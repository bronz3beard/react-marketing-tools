// Fails when the public API and the pages that describe it drift apart.
//
// `docs/api-summary.md` is the one page an AI assistant (or a person in a hurry) reads instead of the whole docs set,
// and `docs/agent-setup.md` inlines the options an assistant is allowed to use. Both are hand-written prose, so this
// checks their *coverage*: every public name must appear in the summary, and every config option and instance method
// must also appear in the setup prompt's allowed list.
//
// Names come from the TypeScript AST, not a regex: `AnalyticsConfig` contains nested object literals
// (`attribution?: boolean | { ttlDays?: number; … }`) and `Destination` has inline parameter objects, and only a
// parser can tell a top-level member from one nested inside a type. A silently empty extraction is treated as a
// failure, so this can't pass by finding nothing.
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const TYPES = 'lib/core/types.ts'
const ERRORS = 'lib/core/errors.ts'
const SERVER = 'lib/server.ts'

class ExtractionError extends Error {}

const parse = (path, text) =>
  ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true)

const typeAlias = (source, name) => {
  const found = source.statements.find(
    statement =>
      ts.isTypeAliasDeclaration(statement) && statement.name.text === name,
  )
  if (!found) {
    throw new ExtractionError(
      `could not find type ${name} in ${source.fileName} — it was renamed or moved, so this check can no longer see it`,
    )
  }
  return found.type
}

/** Direct members of an object type: `{ a: 1, b: { c: 2 } }` gives `a` and `b`, never `c`. */
export const membersOf = (source, name) => {
  const type = typeAlias(source, name)
  if (!ts.isTypeLiteralNode(type)) {
    throw new ExtractionError(
      `${name} in ${source.fileName} is not an object type`,
    )
  }
  const members = type.members
    .filter(
      member => ts.isPropertySignature(member) || ts.isMethodSignature(member),
    )
    .map(member => member.name.getText(source))
  if (members.length === 0) {
    throw new ExtractionError(`${name} in ${source.fileName} has no members`)
  }
  return members
}

/** The string literals of a union type alias, e.g. every AnalyticsErrorCode. */
export const unionMembersOf = (source, name) => {
  const type = typeAlias(source, name)
  if (!ts.isUnionTypeNode(type)) {
    throw new ExtractionError(`${name} in ${source.fileName} is not a union`)
  }
  const values = type.types
    .filter(
      member =>
        ts.isLiteralTypeNode(member) && ts.isStringLiteral(member.literal),
    )
    .map(member => member.literal.text)
  if (values.length === 0) {
    throw new ExtractionError(
      `${name} in ${source.fileName} has no string members`,
    )
  }
  return values
}

/** Every name in `export { … }` and `export type { … }` of a module. */
export const namedExportsOf = source => {
  const names = source.statements
    .filter(
      statement =>
        ts.isExportDeclaration(statement) &&
        statement.exportClause &&
        ts.isNamedExports(statement.exportClause),
    )
    .flatMap(statement =>
      statement.exportClause.elements.map(element => element.name.text),
    )
  if (names.length === 0) {
    throw new ExtractionError(`${source.fileName} exports nothing by name`)
  }
  return names
}

/** The public API, grouped by where it has to be documented. */
export const extractApi = files => {
  const types = parse(TYPES, files[TYPES])
  const options = membersOf(types, 'AnalyticsConfig')
  const methods = membersOf(types, 'Analytics')

  return {
    // Must appear in the summary AND in the prompt's allowed list.
    optionsAndMethods: [...options, ...methods],
    // Must appear in the summary.
    summaryOnly: [
      ...membersOf(types, 'Journey'),
      ...membersOf(types, 'TrackOptions'),
      ...membersOf(types, 'Destination'),
      ...unionMembersOf(parse(ERRORS, files[ERRORS]), 'AnalyticsErrorCode'),
      ...namedExportsOf(parse(SERVER, files[SERVER])),
    ],
  }
}

/** Everything written in backticks; a name mentioned only in prose doesn't count as documented. */
const codeSpans = text =>
  [...text.matchAll(/`([^`\n]+)`/g)].map(match => match[1])

/**
 * Is this name documented? Regex metacharacters are escaped — `.` is an entry point name, and unescaped it would match
 * anything — and whole-word matching applies only to plain identifiers.
 */
const documents = (spans, name) => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = /^[A-Za-z_$][\w$]*$/.test(name)
    ? new RegExp(`\\b${escaped}\\b`)
    : new RegExp(escaped)
  return spans.some(span => pattern.test(span))
}

/** Entry points are documented the way an app imports them, not as the `exports` key. */
const asImport = key =>
  key === '.' ? 'react-marketing-tools' : `react-marketing-tools${key.slice(1)}`

const main = () => {
  const files = Object.fromEntries(
    [TYPES, ERRORS, SERVER].map(path => [path, readFileSync(path, 'utf8')]),
  )
  const { optionsAndMethods, summaryOnly } = extractApi(files)
  const entryPoints = Object.keys(
    JSON.parse(readFileSync('package.json', 'utf8')).exports,
  ).map(asImport)

  const summary = codeSpans(readFileSync('docs/api-summary.md', 'utf8'))
  const prompt = codeSpans(readFileSync('docs/agent-setup.md', 'utf8'))

  const missing = [
    ...[...optionsAndMethods, ...summaryOnly, ...entryPoints]
      .filter(name => !documents(summary, name))
      .map(name => `docs/api-summary.md is missing \`${name}\``),
    ...optionsAndMethods
      .filter(name => !documents(prompt, name))
      .map(name => `docs/agent-setup.md's allowed list is missing \`${name}\``),
  ]

  console.log(
    `     ${optionsAndMethods.length} options and methods, ${summaryOnly.length} other public names, ${entryPoints.length} entry points`,
  )
  for (const problem of missing) console.log(`FAIL ${problem}`)
  if (missing.length > 0) process.exitCode = 1
  console.log(
    `${missing.length === 0 ? 'ok  ' : 'FAIL'} api summary: ${missing.length} undocumented`,
  )
}

// Run only as a script, so the test can import the extractor.
if (process.argv[1]?.endsWith('check-api-summary.mjs')) {
  try {
    main()
  } catch (error) {
    console.log(
      `FAIL ${error instanceof ExtractionError ? error.message : error}`,
    )
    process.exitCode = 1
  }
}
