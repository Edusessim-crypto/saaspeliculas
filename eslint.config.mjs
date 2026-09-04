// eslint-config-next v16 já exporta flat config nativa.
// Passá-la por FlatCompat gera referência circular no ESLint 9.
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'

const config = [
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'coverage/**'] },
  ...nextCoreWebVitals,
]

export default config
