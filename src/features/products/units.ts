export const UNIT_VALUES = ['un', 'kg', 'g', 'l', 'ml'] as const
export type Unit = (typeof UNIT_VALUES)[number]

export const UNIT_OPTIONS: { value: Unit; label: string }[] = [
  { value: 'un', label: 'Unidad' },
  { value: 'kg', label: 'Kilogramo' },
  { value: 'g', label: 'Gramo' },
  { value: 'l', label: 'Litro' },
  { value: 'ml', label: 'Mililitro' },
]

export const BARCODE_PATTERN = /^\d{8,14}$/
export const BARCODE_ERROR = 'Debe ser un código numérico de 8 a 14 dígitos'
