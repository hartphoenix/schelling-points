import * as howler from 'howler'

export type Clip =
  | 'Ex'
  | 'Oh'
  | 'Winner'

export interface PlayOptions {
  volume?: number
  loop?: boolean
  preload?: boolean
  autoplay?: boolean
  mute?: boolean
  rate?: number
}

export class Player {
  constructor(private urlBase: string) {
  }

  playSound(clip: Clip, options: PlayOptions = { autoplay: true, preload: true }): howler.Howl {
      return new howler.Howl({
          src: [this._clipPath(clip)],
          ...options,
      });
  }

  _clipPath(clip: Clip): string {
      const dashName = clip.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
      return `${this.urlBase}/${dashName}.mp3`
  }
}
