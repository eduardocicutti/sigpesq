import assert from 'node:assert/strict'
import test from 'node:test'
import { listarProjetos } from '../src/services/projetos.js'
import { listarCadastros } from '../src/services/cadastros.js'
import { listarAuditoria } from '../src/services/auditoria.js'
import { listarFinanciamentos, salvarFinanciamento, associarFinanciamento } from '../src/services/resultados.js'

test('projetos têm identificadores inteiros únicos e código público', async () => {
  const { dados } = await listarProjetos()
  assert.ok(dados.length)
  assert.equal(new Set(dados.map(p => p.idProjeto)).size, dados.length)
  assert.ok(dados.every(p => Number.isSafeInteger(p.idProjeto) && p.idProjeto > 0 && typeof p.codigo === 'string'))
})

test('perfis de consulta recebem somente os dados autorizados', () => {
  for (const perfil of ['Coordenador', 'Participante', 'Gestor']) {
    assert.ok(listarCadastros('participantes', perfil).every(p => !Object.hasOwn(p, 'cpf')))
    assert.throws(() => listarAuditoria(perfil))
  }
  assert.throws(() => listarFinanciamentos('Participante'))
})

test('destinação financeira mantém centavos e rejeita excesso sem alterar o saldo', () => {
  const id = salvarFinanciamento('Administrador', null, {
    idAgencia: 1, tipoFomento: 'BOLSA', valorTotal: '0,30',
    dataInicioVigencia: '2026-03-02', dataFimVigencia: '2026-12-15',
  })
  associarFinanciamento('Administrador', id, 'PRJ-001', '0,10')
  assert.throws(() => associarFinanciamento('Administrador', id, 'PRJ-002', '0,21'))
  const item = listarFinanciamentos('Gestor').find(f => f.id === id)
  assert.equal(item.saldo, '0.20')
  assert.equal(item.projetos.length, 1)
})
