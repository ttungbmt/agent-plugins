import { parse, type AnyNode, type Expression, type Node, type Program } from 'acorn'
import { ITEM_NAME } from './items.js'

/** Tên literal một script workflow nhắc tới: `agentType: '<x>'` và `workflow('<x>', …)`. */
export type WorkflowRefs = { agentTypes: string[]; workflows: string[] }

/**
 * `meta.name` của một script workflow, đúng như Claude Code đọc: `export const meta = { name: '…', … }` là object
 * literal (không spread, không khoá tính toán), `name` là chuỗi khớp `ITEM_NAME` (dùng được làm tên file). Ngược lại,
 * hoặc script không parse được, thì không phải Workflow: `undefined`.
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

/** Các `agentType` và tên `workflow()` viết bằng chuỗi literal; giá trị tạo lúc chạy bị bỏ qua. Không trùng lặp. */
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

/** Workflow gắn với plugin: gọi agent có tiền tố `<plugin>:`, nên không chạy được khi đứng riêng ngoài plugin đó. */
export function isPluginBound(refs: WorkflowRefs): boolean {
  return refs.agentTypes.some((type) => type.includes(':'))
}

function parseScript(text: string): Program | undefined {
  try {
    // Thân script dùng `await` và `return` ở top-level (Workflow tool bọc nó trong một hàm async).
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
