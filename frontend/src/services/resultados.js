import { listarCadastros } from './cadastros.js'
import { obterProjetoDemonstracao, pessoasDemonstracao, podeAlterarSituacao, dataValida } from './projetos.js'
import { financiamentos, producoes, tiposFomento, tiposProducao } from './relacoes.js'
import { registrarOperacao } from './auditoria.js'

let proximoFinanciamento = 2
let proximaProducao = 2

function centavos(valor) {
  const partes = /^(\d{1,13})(?:[.,](\d{1,2}))?$/.exec(String(valor).trim())
  if (!partes) throw new Error('Informe um valor com até 13 dígitos inteiros e duas casas decimais.')
  return BigInt(partes[1]) * 100n + BigInt((partes[2] ?? '').padEnd(2, '0'))
}

function decimal(valor) {
  return (valor / 100n).toString() + '.' + (valor % 100n).toString().padStart(2, '0')
}

function positivo(valor) {
  const total = centavos(valor)
  if (total <= 0n) throw new Error('Informe um valor maior que zero.')
  return total
}

function somaDestinada(item) {
  return item.projetos.reduce((total, apoio) => total + centavos(apoio.valorDestinado), 0n)
}

function apresentarFinanciamento(item, agencias) {
  const destinado = somaDestinada(item)
  return {
    ...item,
    agencia: agencias.find((agencia) => agencia.id === item.idAgencia),
    valorDestinado: decimal(destinado),
    saldo: decimal(centavos(item.valorTotal) - destinado),
    projetos: item.projetos.map((apoio) => ({
      ...apoio, titulo: obterProjetoDemonstracao(apoio.codigoProjeto)?.titulo,
    })),
  }
}

function apresentarProducao(item) {
  return {
    ...item, projetos: [...item.projetos],
    autores: item.autores.map((autor) => ({ ...autor, nome: pessoasDemonstracao[autor.idParticipante] })),
  }
}

export function podeConsultarFinanciamentos(perfil) {
  return perfil === 'Administrador' || perfil === 'Gestor'
}

export function listarFinanciamentos(perfil, idAgencia) {
  if (!podeConsultarFinanciamentos(perfil)) throw new Error('Seu perfil não pode consultar financiamentos.')
  const agencias = listarCadastros('agencias', perfil)
  return [...financiamentos.values()]
    .filter((item) => !idAgencia || item.idAgencia === Number(idAgencia))
    .map((item) => apresentarFinanciamento(item, agencias))
}

export function listarProducoes({ ano, tipo, codigoProjeto, idParticipante } = {}) {
  return [...producoes.values()].filter((item) =>
    (!ano || item.anoPublicacao === Number(ano)) && (!tipo || item.tipo === tipo)
    && (!codigoProjeto || item.projetos.includes(codigoProjeto))
    && (!idParticipante || item.autores.some((autor) => autor.idParticipante === Number(idParticipante))),
  ).map(apresentarProducao)
}

export function podeManterProducao(perfil, item) {
  return perfil === 'Coordenador' && (!item || item.projetos.every((codigo) => {
    const projeto = obterProjetoDemonstracao(codigo)
    return projeto && podeAlterarSituacao(perfil, projeto)
  }))
}

function exigirAdministrador(perfil) {
  if (perfil !== 'Administrador') throw new Error('Somente o Administrador pode manter financiamentos.')
}

function obter(registros, id, nome) {
  const item = registros.get(id)
  if (!item) throw new Error(nome + ' não encontrado.')
  return item
}

export function salvarFinanciamento(perfil, id, campos) {
  exigirAdministrador(perfil)
  const existente = id === null ? null : obter(financiamentos, id, 'Financiamento')
  const idAgencia = Number(campos.idAgencia)
  const { tipoFomento, dataInicioVigencia, dataFimVigencia } = campos
  if (!listarCadastros('agencias', perfil).some((agencia) => agencia.id === idAgencia)) throw new Error('Selecione uma agência.')
  if (!Object.hasOwn(tiposFomento, tipoFomento)) throw new Error('Selecione o tipo de fomento.')
  if (!dataValida(dataInicioVigencia) || !dataValida(dataFimVigencia) || dataFimVigencia < dataInicioVigencia) {
    throw new Error('Informe datas de vigência válidas. O fim deve ser igual ou posterior ao início.')
  }
  const total = positivo(campos.valorTotal)
  if (existente && total < somaDestinada(existente)) throw new Error('O valor total não pode ser inferior ao já destinado.')
  const registroId = id ?? proximoFinanciamento++
  financiamentos.set(registroId, {
    id: registroId, idAgencia, tipoFomento, dataInicioVigencia, dataFimVigencia,
    valorTotal: decimal(total), projetos: existente?.projetos ?? [],
  })
  registrarOperacao(perfil, existente ? 'Alteração' : 'Inclusão', 'financiamento', registroId, 'Cadastro de financiamento salvo.')
  return registroId
}

export function associarFinanciamento(perfil, id, codigoProjeto, valor) {
  exigirAdministrador(perfil)
  const item = obter(financiamentos, id, 'Financiamento')
  if (!obterProjetoDemonstracao(codigoProjeto)) throw new Error('Selecione um projeto.')
  if (item.projetos.some((apoio) => apoio.codigoProjeto === codigoProjeto)) throw new Error('Este projeto já recebe recursos deste financiamento.')
  const destinado = positivo(valor)
  if (destinado + somaDestinada(item) > centavos(item.valorTotal)) throw new Error('O valor destinado excede o saldo disponível.')
  item.projetos.push({ codigoProjeto, valorDestinado: decimal(destinado) })
  registrarOperacao(perfil, 'Inclusão', 'financiamento_projeto', id + '/' + codigoProjeto, 'Projeto associado ao financiamento.')
}

export function removerAssociacao(perfil, id, codigoProjeto) {
  exigirAdministrador(perfil)
  const item = obter(financiamentos, id, 'Financiamento')
  const indice = item.projetos.findIndex((apoio) => apoio.codigoProjeto === codigoProjeto)
  if (indice < 0) throw new Error('A associação não está mais disponível.')
  item.projetos.splice(indice, 1)
  registrarOperacao(perfil, 'Exclusão', 'financiamento_projeto', id + '/' + codigoProjeto, 'Associação removida.')
}

export function excluirFinanciamento(perfil, id) {
  exigirAdministrador(perfil)
  const item = obter(financiamentos, id, 'Financiamento')
  if (item.projetos.length) throw new Error('Remova as associações com projetos antes de excluir este financiamento.')
  financiamentos.delete(id)
  registrarOperacao(perfil, 'Exclusão', 'financiamento', id, 'Financiamento excluído.')
}

export function salvarProducao(perfil, id, campos) {
  const existente = id === null ? null : obter(producoes, id, 'Registro de produção')
  if (!podeManterProducao(perfil, existente)) throw new Error('Seu perfil não pode manter esta produção.')
  const titulo = campos.titulo.trim()
  const meioDivulgacao = campos.meioDivulgacao.trim()
  const anoPublicacao = Number(campos.anoPublicacao)
  if (!titulo || titulo.length > 250 || !meioDivulgacao || meioDivulgacao.length > 200) throw new Error('Informe título e meio de divulgação válidos.')
  if (!Object.hasOwn(tiposProducao, campos.tipo)) throw new Error('Selecione o tipo da produção.')
  if (!Number.isSafeInteger(anoPublicacao) || anoPublicacao < 1 || anoPublicacao > 65535) throw new Error('Informe um ano de publicação válido.')
  const projetos = [...new Set(campos.projetos)]
  if (!projetos.length || !podeManterProducao(perfil, { projetos })) throw new Error('Selecione pelo menos um projeto sob sua coordenação.')
  const ids = campos.autores.map(Number)
  if (ids.length > 255) throw new Error('Cada produção pode ter até 255 autores.')
  if (!ids.length || new Set(ids).size !== ids.length || !ids.every((autor) => Object.hasOwn(pessoasDemonstracao, autor))) {
    throw new Error('Selecione pelo menos um autor cadastrado, sem repetição.')
  }
  const registroId = id ?? proximaProducao++
  const autores = ids.map((idParticipante, indice) => ({ idParticipante, ordemAutoria: indice + 1 }))
  producoes.set(registroId, {
    id: registroId, titulo, meioDivulgacao, anoPublicacao, tipo: campos.tipo, projetos, autores,
  })
  registrarOperacao(perfil, existente ? 'Alteração' : 'Inclusão', 'producao_cientifica', registroId, 'Produção salva com seus projetos e autores.')
  return registroId
}

export function excluirProducao(perfil, id) {
  const item = obter(producoes, id, 'Registro de produção')
  if (!podeManterProducao(perfil, item)) throw new Error('Seu perfil não pode excluir esta produção.')
  producoes.delete(id)
  registrarOperacao(perfil, 'Exclusão', 'producao_cientifica', id, 'Produção excluída.')
}

export function totalizarPorAgencia(perfil) {
  if (perfil !== 'Gestor') throw new Error('Seu perfil não pode consultar os totais por agência.')
  const totais = new Map()
  for (const item of financiamentos.values()) {
    totais.set(item.idAgencia, (totais.get(item.idAgencia) ?? 0n) + centavos(item.valorTotal))
  }
  return listarCadastros('agencias', perfil).map((agencia) => ({
    ...agencia, total: decimal(totais.get(agencia.id) ?? 0n),
  }))
}
