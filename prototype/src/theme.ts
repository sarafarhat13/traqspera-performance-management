export const LIGHT_THEME = {
  theme: 'modus-modern' as const,
  mode: 'light' as const,
}

/** Keep Modus on light surfaces even when the OS prefers dark. */
export function bootstrapLightTheme() {
  localStorage.setItem('modus-theme-config', JSON.stringify(LIGHT_THEME))
  localStorage.setItem('preferred-mode', 'light')

  const root = document.documentElement
  root.setAttribute('data-theme', 'modus-modern-light')
  root.setAttribute('data-mode', 'light')
  root.classList.remove('dark')
  root.classList.add('light')
}
