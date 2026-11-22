let proximoId = 1
const eventos = []
const usuariosDemo = { Administrador: 'admin', Coordenador: 'coordenador', Participante: 'participante', Gestor: 'gestor' }

export function registrarOperacao(perfil, operacao, tabela, chave, descricao) {
  eventos.unshift({
    id: proximoId++, dataHora: new Date().toISOString(), usuario: usuariosDemo[perfil],
    perfil, operacao, tabela, chave: String(chave), descricao,
  })
}

export function listarAuditoria(perfil) {
  if (perfil !== 'Administrador') throw new Error('Seu perfil não pode acessar a auditoria.')
  return eventos.map((evento) => ({ ...evento }))
}
