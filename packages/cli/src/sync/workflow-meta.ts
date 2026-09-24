import { parse, type AnyNode, type Expression, type Node, type Program } from 'acorn'
import { ITEM_NAME } from './items.js'

/** Literal names a workflow script refers to: `agentType: '<x>'` and `workflow('<x>', …)`. */
export type WorkflowRefs = { agentTypes: string[]; workflows: string[] }

/**
 * The `meta.name` of a workflow script, exactly as Claude Code reads it: `export const meta = { name: '…', … }` is an
 * object literal (no spread, no computed keys) and `name` is a string matching `ITEM_NAME` (usable as a file name).
 * Otherwise, or if the script can't be parsed, it is not a Workflow: `undefined`.
 */
export function workflowName(text: string): string | undefined {
  const program = parseScript(text)
  if (!program) return undefined
  for (const statement of program.body) {
    if (statement.type !== 'ExportNamedDeclaration' || statement.declaration?.type !== 'VariableDeclaration') continue
    if (statement.declaration.kind !== 'const') continue
    for (const declarator of statement.declaration.declarations) {
      if (declarator.id.type !== 'Identifier' || declarator.id.name !== 'meta') continue
      const name = literalMetaName(declarator.init)
      return name !== undefined && ITEM_NAME.test(name) ? name : undefined
    }
  }
  return undefined
}

/** The `agentType`s and `workflow()` names written as string literals; runtime-built values are skipped. No duplicates. */
export function workflowRefs(text: string): WorkflowRefs {
  const agentTypes = new Set<string>()
  const workflows = new Set<string>()
  const program = parseScript(text)
  if (program) {
    walk(program, (node) => {
      if (node.type === 'Property' && !node.computed && keyName(node.key) === 'agentType') {
        const value = stringValue(node.value as Expression)
        if (value !== undefined) agentTypes.add(value)
      }
      if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === 'workflow') {
        const first = node.arguments[0]
        const value = first && first.type !== 'SpreadElement' ? stringValue(first) : undefined
        if (value !== undefined) workflows.add(value)
      }
    })
  }
  return { agentTypes: [...agentTypes], workflows: [...workflows] }
}

/** A plugin-bound Workflow: it calls an agent with a `<plugin>:` prefix, so it can't run on its own outside that plugin. */
export function isPluginBound(refs: WorkflowRefs): boolean {
  return refs.agentTypes.some((type) => type.includes(':'))
}

function parseScript(text: string): Program | undefined {
  try {
    // The script body uses top-level `await` and `return` (the Workflow tool wraps it in an async function).
    return parse(text, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      allowAwaitOutsideFunction: true,
      allowReturnOutsideFunction: true,
    })
  } catch {
    return undefined
  }
}

function literalMetaName(init: Expression | null | undefined): string | undefined {
  if (init?.type !== 'ObjectExpression') return undefined
  let name: string | undefined
  for (const property of init.properties) {
    if (property.type !== 'Property' || property.computed) return undefined
    if (keyName(property.key) === 'name') name = stringValue(property.value as Expression)
  }
  return name
}

function keyName(key: Node): string | undefined {
  if (key.type === 'Identifier') return (key as Node & { name: string }).name
  return stringValue(key as Expression)
}

function stringValue(node: Expression): string | undefined {
  if (node.type === 'Literal') return typeof node.value === 'string' ? node.value : undefined
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) return node.quasis[0]?.value.cooked ?? undefined
  return undefined
}

function walk(node: Node, visit: (node: AnyNode) => void): void {
  visit(node as AnyNode)
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const child of value) if (isNode(child)) walk(child, visit)
    } else if (isNode(value)) walk(value, visit)
  }
}

function isNode(value: unknown): value is Node {
  return typeof value === 'object' && value !== null && typeof (value as Node).type === 'string'
}
