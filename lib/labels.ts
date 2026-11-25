type Values = Record<string, string | number>

export const fill = (text: string, values: Values) =>
  text.replace(/\{(\w+)\}/g, (placeholder, key: string) => (Object.hasOwn(values, key) ? String(values[key]) : placeholder))

export const plural = (one: string, other: string, count: number, values: Values = {}) => fill(count === 1 ? one : other, { ...values, count })
