import test from 'node:test'
import assert from 'node:assert/strict'
import { validarProjeto, cadastrarProjeto } from '../projetos.js'

const usuario = {idUsuario:12, perfil:'Coordenador',idParticipante:2}
const dados = {codigo:'prj-01', titulo:'Pesquisa', descricao:'Estudo', dataInicio:'2024-02-29',
  dataTermino:'2024-02-29', situacao:'EM_ANDAMENTO',idCoordenador:9}

test('coordenação vem da sessão do docente; administrador escolhe o docente', () => {
  assert.equal(validarProjeto(dados,usuario)[6],2)
  assert.equal(validarProjeto(dados,{perfil:'Administrador'})[6],9)
  assert.throws(() => validarProjeto(dados,{perfil:'Gestor'}),{status:403})
})

test('datas, tipos e limites de armazenamento são validados antes da transação', () => {
  for (const invalido of [{dataInicio:'2023-02-29'}, {dataTermino:'2024-02-28'}, {titulo:7},
    {codigo:' '.repeat(10)}, {descricao:'á'.repeat(32768)}, {situacao:'EM ABERTO'}]) {
    assert.throws(() => validarProjeto({...dados,...invalido},usuario),{status:422})
  }
})

test('falha na gravação da auditoria reverte cadastro e vínculo', async () => {
  const eventos=[]
  const conexao={
    beginTransaction:async()=>eventos.push('inicio'),commit:async()=>eventos.push('commit'),
    rollback:async()=>eventos.push('rollback'),release:()=>eventos.push('liberada'),
    execute:async(sql)=>{
      if(sql.includes('SELECT tipo')) return [[{tipo:'DOCENTE'}]]
      if(sql.startsWith('CALL')) {eventos.push('projeto e vínculo');return []}
      if(sql.includes('AS idProjeto')) return [[{idProjeto:10,codigo:'PRJ-01'}]]
      if(sql.includes('FROM participacao')) return [[]]
      if(sql.includes('INSERT INTO log_auditoria')) throw Error('Log indisponível')
      throw Error('SQL inesperado')
    },
  }
  await assert.rejects(cadastrarProjeto({getConnection:async()=>conexao},usuario,dados),/Log indisponível/)
  assert.deepEqual(eventos,['inicio','projeto e vínculo','rollback','liberada'])
})
