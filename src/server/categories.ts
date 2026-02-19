import * as fs from 'fs'
import * as t from './types'

export function load(path: string): t.Category[] {
    const text = fs.readFileSync(path, { encoding: 'utf8' })
    return JSON.parse(text)
}