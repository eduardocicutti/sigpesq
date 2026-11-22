import { financiamentos, producoes } from './relacoes.js'
import { registrarOperacao } from './auditoria.js'
export const docentes = { 1: 'Ana Lima', 2: 'Carlos Monteiro' }
export const idDocenteDemonstracao = 1
export const situacoes = Object.freeze({
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
})

const projetos = [
  { codigo: 'PRJ-001', titulo: 'Qualidade da água no norte capixaba', descricao: 'Acompanhamento de indicadores de qualidade da água.', idCoordenador: 1, dataInicio: '2026-03-02', dataTermino: '2026-12-15', situacao: 'EM_ANDAMENTO' },
  { codigo: 'PRJ-002', titulo: 'Monitoramento da biodiversidade costeira', descricao: 'Inventário de espécies da zona costeira.', idCoordenador: 2, dataInicio: '2026-02-03', dataTermino: '2027-01-22', situacao: 'EM_ANDAMENTO' },
  { codigo: 'PRJ-003', titulo: 'Acervo digital de publicações científicas', descricao: 'Organização das publicações em um acervo digital.', idCoordenador: 1, dataInicio: '2026-04-06', dataTermino: '2026-10-30', situacao: 'CONCLUIDO' },
]
export const pessoasDemonstracao = { ...docentes, 3: 'Marina Alves', 4: 'Rafael Pereira' }
export const funcoesEquipe = Object.freeze({
  VICE_COORDENADOR: 'Vice-coordenador',
  PESQUISADOR: 'Pesquisador',
  BOLSISTA: 'Bolsista',
  COLABORADOR: 'Colaborador',
  VOLUNTARIO: 'Voluntário',
  OUTRO: 'Outro',
})

function vinculoCoordenacao(idParticipante, dataEntrada) {
  return { idParticipante, funcao: 'COORDENADOR', dataEntrada, dataSaida: null }
}

const equipes = new Map(projetos.map((projeto) => [
  projeto.codigo,
  [vinculoCoordenacao(projeto.idCoordenador, projeto.dataInicio)],
]))
equipes.get('PRJ-001').push({ idParticipante: 3, funcao: 'BOLSISTA', dataEntrada: '2026-03-05', dataSaida: '2026-08-31' })

function apresentar(projeto) {
  return { ...projeto, coordenador: docentes[projeto.idCoordenador] }
}

export function podeCriarProjeto(perfil) {
  return perfil === 'Administrador' || perfil === 'Coordenador'
}

export function podeAlterarSituacao(perfil, projeto) {
  return perfil === 'Coordenador' && projeto.idCoordenador === idDocenteDemonstracao
}

export function podeEditarProjeto(perfil, projeto) {
  return perfil === 'Administrador' || podeAlterarSituacao(perfil, projeto)
}

function normalizarBusca(texto) {
  return texto.normalize('NFD').replace(/(?<=\p{Script=Latin})\p{M}+/gu, '').toLocaleLowerCase('pt-BR')
}

export async function listarProjetos({ busca = '', situacao = '', idCoordenador = '', pagina = 1, tamanho = 20 } = {}) {
  if (!Number.isInteger(pagina) || pagina < 1 || !Number.isInteger(tamanho) || tamanho < 1 || tamanho > 100) {
    throw new Error('Paginação inválida.')
  }
  const termo = normalizarBusca(busca.trim())
  const encontrados = projetos.filter((projeto) =>
    normalizarBusca(`${projeto.codigo} ${projeto.titulo}`).includes(termo)
    && (!situacao || projeto.situacao === situacao)
    && (!idCoordenador || projeto.idCoordenador === Number(idCoordenador)),
  )
  return {
    dados: encontrados.slice((pagina - 1) * tamanho, pagina * tamanho).map(apresentar),
    paginacao: { pagina, tamanho, total: encontrados.length },
  }
}

export async function carregarTodosProjetos(filtros = {}) {
  const { dados, paginacao } = await listarProjetos({ ...filtros, tamanho: 100 })
  const paginas = Array.from({ length: Math.max(0, Math.ceil(paginacao.total / 100) - 1) }, (_, indice) => indice + 2)
  const adicionais = await Promise.all(paginas.map((pagina) => listarProjetos({ ...filtros, tamanho: 100, pagina })))
  return dados.concat(adicionais.flatMap((pagina) => pagina.dados))
}

export function obterProjetoDemonstracao(codigo) {
  const projeto = projetos.find((item) => item.codigo === codigo)
  return projeto ? apresentar(projeto) : null
}

export function obterEquipeProjeto(codigo) {
  return (equipes.get(codigo) ?? []).map((vinculo) => ({ ...vinculo }))
}

export function listarProjetosDoParticipante(id) {
  return projetos.flatMap((projeto) => {
    const vinculos = obterEquipeProjeto(projeto.codigo).filter((vinculo) => vinculo.idParticipante === id)
    if (!vinculos.length && projeto.idCoordenador !== id) return []
    return [{ ...apresentar(projeto), vinculos }]
  })
}

export function dataValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor) || valor.startsWith('0000')) return false
  const instante = new Date(valor + 'T00:00:00Z')
  return !Number.isNaN(instante.valueOf()) && instante.toISOString().slice(0, 10) === valor
}

function dadosBasicos({ titulo, descricao, dataInicio, dataTermino }) {
  titulo = titulo.trim()
  descricao = descricao.trim()
  if (!titulo || titulo.length > 200) throw new Error('Informe um título de até 200 caracteres.')
  if (!descricao) throw new Error('Informe a descrição.')
  if (!dataValida(dataInicio) || !dataValida(dataTermino)) throw new Error('Informe datas válidas de início e término.')
  if (dataTermino < dataInicio) throw new Error('O término deve ser na data de início ou depois dela.')
  return { titulo, descricao, dataInicio, dataTermino }
}

function buscarRegistro(codigo) {
  const projeto = projetos.find((item) => item.codigo === codigo)
  if (!projeto) throw new Error('Projeto não encontrado.')
  return projeto
}

export async function criarProjeto(perfil, valores) {
  if (!podeCriarProjeto(perfil)) throw new Error('Seu perfil não pode cadastrar projetos.')
  const codigo = valores.codigo.trim().toUpperCase()
  if (!codigo || codigo.length > 20) throw new Error('Informe um código de até 20 caracteres.')
  if (projetos.some((item) => item.codigo === codigo)) throw new Error('Já existe um projeto com esse código.')
  const idCoordenador = perfil === 'Administrador' ? Number(valores.idCoordenador) : idDocenteDemonstracao
  if (!Object.hasOwn(docentes, idCoordenador)) throw new Error('Selecione um docente coordenador.')
  if (!Object.hasOwn(situacoes, valores.situacao)) throw new Error('Selecione uma situação válida.')
  const projeto = { codigo, ...dadosBasicos(valores), idCoordenador, situacao: valores.situacao }
  projetos.unshift(projeto)
  equipes.set(codigo, [vinculoCoordenacao(idCoordenador, projeto.dataInicio)])
  registrarOperacao(perfil, 'Inclusão', 'projeto', codigo, 'Projeto cadastrado com vínculo de coordenação.')
  return { dados: apresentar(projeto) }
}

export async function editarProjeto(perfil, codigo, valores) {
  const projeto = buscarRegistro(codigo)
  if (!podeEditarProjeto(perfil, projeto)) throw new Error('Seu perfil não pode editar este projeto.')
  Object.assign(projeto, dadosBasicos(valores))
  registrarOperacao(perfil, 'Alteração', 'projeto', codigo, 'Dados básicos atualizados.')
  return { dados: apresentar(projeto) }
}

export async function alterarSituacaoProjeto(perfil, codigo, situacao) {
  const projeto = buscarRegistro(codigo)
  if (!podeAlterarSituacao(perfil, projeto)) throw new Error('Somente o coordenador do projeto pode alterar a situação.')
  if (!Object.hasOwn(situacoes, situacao)) throw new Error('Selecione uma situação válida.')
  projeto.situacao = situacao
  registrarOperacao(perfil, 'Alteração', 'projeto', codigo, 'Situação atualizada.')
  return { dados: apresentar(projeto) }
}

export async function vincularParticipante(perfil, codigo, valores) {
  const projeto = buscarRegistro(codigo)
  if (!podeAlterarSituacao(perfil, projeto)) throw new Error('Somente o coordenador deste projeto pode vincular participantes.')
  const idParticipante = Number(valores.idParticipante)
  if (!Object.hasOwn(pessoasDemonstracao, idParticipante)) throw new Error('Selecione um participante.')
  if (!Object.hasOwn(funcoesEquipe, valores.funcao)) throw new Error('Selecione uma função válida.')
  const { funcao, dataEntrada } = valores
  const dataSaida = valores.dataSaida || null
  if (!dataValida(dataEntrada) || (dataSaida !== null && (!dataValida(dataSaida) || dataSaida < dataEntrada))) {
    throw new Error('Informe datas válidas. A saída não pode ser anterior à entrada.')
  }
  const equipe = equipes.get(codigo)
  if (equipe.some((item) => item.idParticipante === idParticipante && item.dataEntrada === dataEntrada)) {
    throw new Error('Já existe um vínculo para este participante na data de entrada.')
  }
  equipe.push({ idParticipante, funcao, dataEntrada, dataSaida })
  registrarOperacao(perfil, 'Inclusão', 'participacao', [codigo, idParticipante, dataEntrada].join('/'), 'Participante vinculado ao projeto.')
}

export async function encerrarVinculo(perfil, codigo, idParticipante, dataEntrada, dataSaida) {
  const projeto = buscarRegistro(codigo)
  if (!podeAlterarSituacao(perfil, projeto)) throw new Error('Somente o coordenador deste projeto pode encerrar vínculos.')
  const vinculo = equipes.get(codigo).find((item) =>
    item.idParticipante === idParticipante && item.dataEntrada === dataEntrada && !item.dataSaida,
  )
  if (!vinculo) throw new Error('Vínculo ativo não encontrado.')
  if (vinculo.funcao === 'COORDENADOR') throw new Error('Solicite ao Administrador a troca de coordenação.')
  if (!dataValida(dataSaida) || dataSaida < dataEntrada) throw new Error('A saída não pode ser anterior à entrada.')
  vinculo.dataSaida = dataSaida
  registrarOperacao(perfil, 'Alteração', 'participacao', [codigo, idParticipante, dataEntrada].join('/'), 'Vínculo encerrado.')
}

export async function trocarCoordenacao(perfil, codigo, idCoordenador) {
  if (perfil !== 'Administrador') throw new Error('Somente o Administrador pode trocar a coordenação.')
  const projeto = buscarRegistro(codigo)
  idCoordenador = Number(idCoordenador)
  if (!Object.hasOwn(docentes, idCoordenador)) throw new Error('Selecione um docente.')
  if (projeto.idCoordenador === idCoordenador) throw new Error('Este docente já coordena o projeto.')
  const dataEntrada = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  const equipe = equipes.get(codigo)
  if (equipe.some((item) => item.idParticipante === idCoordenador && item.dataEntrada === dataEntrada)) {
    throw new Error('O docente já possui um vínculo com essa data de entrada. A coordenação foi preservada.')
  }
  const atual = equipe.find((item) => item.funcao === 'COORDENADOR' && !item.dataSaida)
  if (dataEntrada < atual.dataEntrada) throw new Error('A coordenação ainda não iniciou.')
  atual.dataSaida = dataEntrada
  equipe.push(vinculoCoordenacao(idCoordenador, dataEntrada))
  projeto.idCoordenador = idCoordenador
  registrarOperacao(perfil, 'Alteração', 'projeto', codigo, 'Coordenação atualizada com preservação do histórico.')
}

export async function excluirProjeto(perfil, codigo) {
  const projeto = buscarRegistro(codigo)
  if (!podeEditarProjeto(perfil, projeto)) throw new Error('Seu perfil não pode excluir este projeto.')
  const temProducao = [...producoes.values()].some((item) => item.projetos.includes(codigo))
  const temFinanciamento = [...financiamentos.values()].some((item) => item.projetos.some((apoio) => apoio.codigoProjeto === codigo))
  if (equipes.get(codigo).length || temProducao || temFinanciamento) {
    throw new Error('Este projeto tem vínculos e não pode ser excluído. O coordenador pode alterar a situação para Cancelado.')
  }
  projetos.splice(projetos.indexOf(projeto), 1)
  equipes.delete(codigo)
  registrarOperacao(perfil, 'Exclusão', 'projeto', codigo, 'Projeto excluído.')
}

export async function obterResumoProjetos() {
  return { dados: {
    'Em andamento': projetos.filter((item) => item.situacao === 'EM_ANDAMENTO').length,
    'Concluído': projetos.filter((item) => item.situacao === 'CONCLUIDO').length,
  } }
}
