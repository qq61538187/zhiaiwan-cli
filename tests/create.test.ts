import { describe, expect, it } from 'vitest'
import { findTemplateById, isValidPackageName, toValidProjectName } from '../src/index.js'

describe('create helpers', () => {
  it('finds npm-tools template', () => {
    const template = findTemplateById('npm-tools')
    expect(template?.repo).toContain('zhiaiwan-template-npm-tools.git')
    expect(typeof template?.processor).toBe('function')
    expect(template?.questions[0]?.key).toBe('projectName')
  })

  it('validates project name', () => {
    expect(toValidProjectName('demo-lib')).toBe('demo-lib')
    expect(() => toValidProjectName('')).toThrow()
    expect(() => toValidProjectName('demo lib')).toThrow()
  })

  it('validates package name format', () => {
    expect(isValidPackageName('@zhiaiwan/template-npm-tools')).toBe(true)
    expect(isValidPackageName('template-npm-tools')).toBe(true)
    expect(isValidPackageName('@zhiaiwan')).toBe(false)
    expect(isValidPackageName('bad name')).toBe(false)
  })
})
