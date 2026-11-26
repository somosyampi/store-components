export type Run = { text: string; bold?: boolean; italic?: boolean; link?: string }

export type RichText = ({ type: 'paragraph'; children: Run[] } | { type: 'list'; ordered?: boolean; items: Run[][] })[]
