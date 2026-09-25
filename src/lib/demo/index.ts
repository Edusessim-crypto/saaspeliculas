/**
 * Chave do modo demonstracao.
 *
 * Quando ligado, as funcoes de leitura em `src/lib/data/` devolvem o dataset
 * de `./data` em vez de consultar o Supabase, e a sessao vem de um cookie.
 * Serve para apresentar o produto sem banco — nao e caminho de producao.
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

/** Cookie que guarda o papel escolhido na tela de login da demo. */
export const DEMO_ROLE_COOKIE = 'demo_role'
