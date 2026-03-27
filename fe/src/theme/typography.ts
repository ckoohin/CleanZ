export const fontFamily = {
  headline: ["Manrope", "sans-serif"],
  body: ["Manrope", "sans-serif"],
  label: ["Inter", "sans-serif"],
} as const

export const fontSize = {
  displayLg: "3.5rem",
  headlineMd: "1.75rem",
  bodyLg: "1rem",
  labelMd: "0.875rem",
  labelSm: "0.75rem",
} as const

export type FontFamily = typeof fontFamily
export type FontSize = typeof fontSize