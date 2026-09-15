/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', 'recharts'],
    // Cache do router no cliente. Voltar para uma tela ja visitada passa a
    // ser instantaneo em vez de refazer a chamada ao servidor; o realtime
    // e o revalidatePath das Server Actions continuam invalidando o que
    // muda, entao o dado nao envelhece na pratica.
    staleTimes: { dynamic: 30, static: 180 },
  },
}

export default nextConfig
