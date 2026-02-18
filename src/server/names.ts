import * as fs from 'fs'
import * as t from './types'

export function randomFromList<T>(list: T[]): T {
  const randomIndex = Math.floor(Math.random() * list.length)
  return list[randomIndex]
}

export class Chooser {
    private lists: string[][]

    constructor(paths: string[]) {
        this.lists = []
        for (const path of paths) {
            const lines = fs.readFileSync(path, { encoding: 'utf8', flag: 'r' }).split('\n')
            this.lists.push(lines.map(s => s.toLowerCase()))
        }
    }

    choose(isDuplicate: (gameId: t.GameId) => boolean): string {
        let name: string
        do {
            name = this.lists.map(randomFromList).join('-')
        } while (isDuplicate(name))

        return name
    }
}
