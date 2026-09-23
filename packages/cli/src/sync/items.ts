import { parse } from 'yaml'
import type { Location } from './files.js'
import type { ItemKind, ItemSource, Scope } from './types.js'

/** Một Skill/Agent tìm thấy trong nguồn đã tải: `path` là thư mục Skill hoặc file Agent, để copy. */
export type FoundItem = { name: string; path: string; sha256: string }

/** Bản cài skill/agent có trong thư mục của một Scope. `symlink`: do công cụ khác tạo (vd. `npx skills`). */
export type InstalledItem = { name: string; symlink: boolean; sha256: string }

/**
 * Cách một loại thứ được tải từ nguồn và cài vào Scope (ADR 0005): Skill là thư mục `<name>/SKILL.md`, Agent là
 * file `<name>.md`. Phần tải nguồn, Danh mục nguồn và luật sở hữu dùng chung cho mọi loại.
 */
export type ItemHandler = {
  kind: ItemKind
  /** Thư mục Claude Code đọc cho từng Scope; `null` khi Scope không có (scope `local`). */
  dir(scope: Scope, location: Location): string | null
  /** Tìm các thứ trong `root` (gốc nguồn đã tải, hoặc `path` của nó). */
  find(root: string, source: ItemSource): Promise<FoundItem[]>
  list(dir: string): Promise<InstalledItem[]>
  /** Thay Bản cài `name` bằng bản copy của `from`. Symlink cũ chỉ bị gỡ link, không đụng thứ nó trỏ tới. */
  install(from: string, dir: string, name: string): Promise<void>
  remove(dir: string, name: string): Promise<void>
}

export const ITEM_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

/**
 * `name` trong frontmatter của `text`; `undefined` khi không có frontmatter. Frontmatter không phải YAML hợp lệ
 * (vd. `description: Use when: ...` không có ngoặc kép) vẫn được Claude Code nạp, nên khi đó đọc dòng `name:` thay vì
 * làm hỏng cả nguồn.
 */
export function frontmatterName(text: string): string | undefined {
  const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1]
  if (front === undefined) return undefined
  let name: unknown
  try {
    name = (parse(front) as { name?: unknown } | null)?.name
  } catch {
    name = /^name:[ \t]*(['"]?)(.*?)\1[ \t]*$/m.exec(front)?.[2]
  }
  return typeof name === 'string' && name ? name : undefined
}
