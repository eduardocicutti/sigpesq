// Dados sintéticos. Contrato: docs/planejamento/02-CONTRATO-API-INICIAL.md.
const projetos = [
  { codigo: 'PRJ-001', titulo: 'Qualidade da água no norte capixaba', coordenador: 'Ana Lima', dataTermino: '2026-12-15', situacao: 'EM_ANDAMENTO' },
  { codigo: 'PRJ-002', titulo: 'Monitoramento da biodiversidade costeira', coordenador: 'Carlos Monteiro', dataTermino: '2027-01-22', situacao: 'EM_ANDAMENTO' },
  { codigo: 'PRJ-003', titulo: 'Acervo digital de publicações científicas', coordenador: 'Ana Lima', dataTermino: '2026-10-30', situacao: 'CONCLUIDO' },
]

function normalizarBusca(texto) {
  return texto.normalize('NFD').replace(/(?<=\p{Script=Latin})\p{M}+/gu, '').toLocaleLowerCase('pt-BR')
}

export async function listarProjetos({ busca = '', pagina = 1, tamanho = 20 } = {}) {
  if (!Number.isInteger(pagina) || pagina < 1 || !Number.isInteger(tamanho) || tamanho < 1 || tamanho > 100) {
    throw new Error('Paginação inválida.')
  }
  const termo = normalizarBusca(busca.trim())
  const encontrados = projetos.filter(({ codigo, titulo }) =>
    normalizarBusca(`${codigo} ${titulo}`).includes(termo),
  )
  return {
    dados: encontrados.slice((pagina - 1) * tamanho, pagina * tamanho).map((item) => ({ ...item })),
    paginacao: { pagina, tamanho, total: encontrados.length },
  }
}

export async function obterResumoProjetos() {
  return { dados: {
    'Em andamento': projetos.filter((item) => item.situacao === 'EM_ANDAMENTO').length,
    'Concluído': projetos.filter((item) => item.situacao === 'CONCLUIDO').length,
  } }
}
