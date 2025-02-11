import align_text from 'align-text'

export const align = align_text

export function centerAlign(len, longest) {
  return {
    character: '\t',
    indent: Math.floor((longest - len) / 2),
    prefix: '~ ',
  }
}
