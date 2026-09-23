import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseShorthand } from './shorthand.js'
import { makeTree } from './test-helpers.js'

describe('parseShorthand', () => {
  const at = (text: string, dir = '/unused') => parseShorthand(text, dir, 'demo.yaml')

  it.each([
    ['owner/repo', { source: 'github', repo: 'owner/repo' }],
    ['owner/repo@v1.0', { source: 'github', repo: 'owner/repo', ref: 'v1.0' }],
    ['git@github.com:owner/repo.git', { source: 'git', url: 'git@github.com:owner/repo.git' }],
    ['git@gitlab.example.com:acme/plugins.git#main', { source: 'git', url: 'git@gitlab.example.com:acme/plugins.git', ref: 'main' }],
    ['ssh://git@host/acme/plugins.git', { source: 'git', url: 'ssh://git@host/acme/plugins.git' }],
    ['https://github.com/owner/repo', { source: 'git', url: 'https://github.com/owner/repo.git' }],
    ['https://github.com/owner/repo/', { source: 'git', url: 'https://github.com/owner/repo.git' }],
    ['https://github.com/owner/repo.git#main', { source: 'git', url: 'https://github.com/owner/repo.git', ref: 'main' }],
    ['https://gitlab.com/group/project', { source: 'git', url: 'https://gitlab.com/group/project.git' }],
    ['https://git.example.com/acme/plugins.git', { source: 'git', url: 'https://git.example.com/acme/plugins.git' }],
    ['https://example.com/marketplace.json', { source: 'url', url: 'https://example.com/marketplace.json' }],
    ['https://example.com/plugins', { source: 'url', url: 'https://example.com/plugins' }],
  ])('reads %s', async (text, source) => {
    expect(await at(text)).toEqual(source)
  })

  it('reads a local directory or marketplace.json by what is on disk, normalising the path', async () => {
    const root = await makeTree({ 'mk/.claude-plugin/marketplace.json': '{}', 'files/marketplace.json': '{}' })
    await mkdir(join(root, 'odd.json'))

    expect(await at('./mk/', root)).toEqual({ source: 'directory', path: './mk' })
    expect(await at('./files/../mk', root)).toEqual({ source: 'directory', path: './mk' })
    expect(await at('./odd.json', root)).toEqual({ source: 'directory', path: './odd.json' })
    expect(await at('./files/marketplace.json', root)).toEqual({ source: 'file', path: './files/marketplace.json' })
    expect(await at(join(root, 'mk'), root)).toEqual({ source: 'directory', path: join(root, 'mk') })
  })

  it('rejects a missing path and a file that is not .json', async () => {
    const root = await makeTree({ notes: 'x' })

    await expect(at('./missing', root)).rejects.toThrow(/demo\.yaml: marketplace path "\.\/missing" does not exist/)
    await expect(at('./notes', root)).rejects.toThrow(/demo\.yaml: marketplace file "\.\/notes" must be a \.json file/)
  })

  it('rejects a local path declared by a remote preset', async () => {
    await expect(at('./mk', 'https://example.com/presets')).rejects.toThrow(/cannot be used in remote preset demo\.yaml/)
  })

  it('rejects a string it cannot read', async () => {
    await expect(at('mk')).rejects.toThrow(/demo\.yaml: unrecognised marketplace source "mk"/)
  })
})
