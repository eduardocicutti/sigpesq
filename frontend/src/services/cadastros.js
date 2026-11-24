import { docentes, idDocenteDemonstracao, listarProjetosDoParticipante, pessoasDemonstracao } from './projetos.js'
import { producoes } from './relacoes.js'
import { registrarOperacao } from './auditoria.js'

export const tiposPessoa = Object.freeze({ DOCENTE: 'Docente', DISCENTE: 'Discente', TECNICO: 'Técnico' })
const pessoas = Object.entries(pessoasDemonstracao).map(([id, nome]) => ({
  id: Number(id),
  nome,
  emailInstitucional: nome.toLowerCase().replaceAll(' ', '.') + '@exemplo.invalid',
  cpf: id.padStart(11, '0'),
  tipo: Object.hasOwn(docentes, id) ? 'DOCENTE' : 'DISCENTE',
}))
const agencias = [{ id: 1, sigla: 'FAP', nome: 'Fundação de Amparo à Pesquisa' }]
let proximaPessoa = 5
let proximaAgencia = 2

export function listarCadastros(modulo, perfil) {
  if (modulo === 'agencias') return agencias.map((agencia) => ({ ...agencia }))
  return pessoas.map((pessoa) => {
    if (perfil === 'Administrador') return { ...pessoa }
    const { cpf: _cpf, ...visivel } = pessoa
    return visivel
  })
}

export function salvarCadastro(modulo, perfil, id, dados) {
  if (perfil !== 'Administrador') throw new Error('Somente o Administrador pode manter este cadastro.')
  const nome = dados.nome.trim()
  if (!nome || nome.length > 150) throw new Error('Informe um nome de até 150 caracteres.')
  if (modulo === 'agencias') {
    const sigla = dados.sigla.trim().toUpperCase()
    if (!sigla || sigla.length > 15) throw new Error('Informe uma sigla de até 15 caracteres.')
    if (agencias.some((item) => item.sigla === sigla && item.id !== id)) throw new Error('Esta sigla já está cadastrada.')
    const agenciaId = id ?? proximaAgencia
    atualizarLista(agencias, id, agenciaId, { nome, sigla })
    if (id === null) proximaAgencia++
    registrarOperacao(perfil, id === null ? 'Inclusão' : 'Alteração', 'agencia_financiadora', agenciaId, 'Cadastro de agência salvo.')
    return agenciaId
  }

  const cpf = dados.cpf.replace(/[.\s-]/g, '')
  const emailInstitucional = dados.emailInstitucional.trim().toLowerCase()
  if (!/^\d{11}$/.test(cpf)) throw new Error('Informe o CPF com 11 dígitos.')
  if (emailInstitucional.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInstitucional)) throw new Error('Informe um e-mail válido com até 120 caracteres.')
  if (!Object.hasOwn(tiposPessoa, dados.tipo)) throw new Error('Selecione um tipo válido.')
  if (pessoas.some((item) => item.id !== id && item.cpf === cpf)) throw new Error('Este CPF já está cadastrado.')
  if (pessoas.some((item) => item.id !== id && item.emailInstitucional === emailInstitucional)) throw new Error('Este e-mail já está cadastrado.')
  if (dados.tipo !== 'DOCENTE' && (id === idDocenteDemonstracao || listarProjetosDoParticipante(id).some((item) => item.idCoordenador === id))) {
    throw new Error('Este participante exerce coordenação e precisa permanecer como docente.')
  }
  const participanteId = id ?? proximaPessoa
  atualizarLista(pessoas, id, proximaPessoa, { nome, cpf, emailInstitucional, tipo: dados.tipo })
  if (!id) proximaPessoa++
  pessoasDemonstracao[participanteId] = nome
  if (dados.tipo === 'DOCENTE') docentes[participanteId] = nome
  else delete docentes[participanteId]
  registrarOperacao(perfil, id ? 'Alteração' : 'Inclusão', 'participante', participanteId, 'Cadastro de participante salvo.')
  return participanteId
}

export function excluirParticipante(perfil, id) {
  if (perfil !== 'Administrador') throw new Error('Somente o Administrador pode excluir participantes.')
  const temAutoria = [...producoes.values()].some((item) => item.autores.some((autor) => autor.idParticipante === id))
  if (id === idDocenteDemonstracao || temAutoria || listarProjetosDoParticipante(id).length) throw new Error('Este participante tem vínculos e não pode ser excluído.')
  const indice = pessoas.findIndex((item) => item.id === id)
  if (indice < 0) throw new Error('Participante não encontrado.')
  pessoas.splice(indice, 1)
  delete pessoasDemonstracao[id]
  delete docentes[id]
  registrarOperacao(perfil, 'Exclusão', 'participante', id, 'Cadastro de participante excluído.')
}

function atualizarLista(lista, id, proximoId, dados) {
  if (id === null) {
    lista.push({ id: proximoId, ...dados })
    return
  }
  const existente = lista.find((item) => item.id === id)
  if (!existente) throw new Error('Cadastro não encontrado.')
  Object.assign(existente, dados)
}
