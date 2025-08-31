import align_text from 'align-text'

export const align = align_text

export interface AlignConfig {
  character: string
  indent: number
  prefix: string
}

export function centerAlign(len: number, longest: number): AlignConfig {
  return {
    character: '\t',
    indent: Math.floor((longest - len) / 2),
    prefix: '~ ',
  }
}
