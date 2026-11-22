export const tiposFomento = Object.freeze({ BOLSA: 'Bolsa', AUXILIO: 'Auxílio', CONVENIO: 'Convênio', OUTRO: 'Outro' })
export const tiposProducao = Object.freeze({
  ARTIGO: 'Artigo', CAPITULO_LIVRO: 'Capítulo de livro', LIVRO: 'Livro', SOFTWARE: 'Software',
  RELATORIO_TECNICO: 'Relatório técnico', OUTRO: 'Outro',
})

export const financiamentos = new Map([[1, {
  id: 1, idAgencia: 1, tipoFomento: 'AUXILIO', valorTotal: '20000.00',
  dataInicioVigencia: '2026-03-02', dataFimVigencia: '2026-12-15',
  projetos: [{ codigoProjeto: 'PRJ-001', valorDestinado: '15000.00' }],
}]])

export const producoes = new Map([[1, {
  id: 1, titulo: 'Boletim de qualidade da água', tipo: 'RELATORIO_TECNICO', anoPublicacao: 2026,
  meioDivulgacao: 'Boletim de pesquisa', projetos: ['PRJ-001'],
  autores: [{ idParticipante: 1, ordemAutoria: 1 }, { idParticipante: 3, ordemAutoria: 2 }],
}]])
