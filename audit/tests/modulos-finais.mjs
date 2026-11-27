import assert from 'node:assert/strict'
import { randomInt, randomUUID } from 'node:crypto'

assert.equal(process.env.DB_HOST,'127.0.0.1')
assert.equal(process.env.DB_PORT,'33927')
assert.equal(process.env.DB_NAME,'sigpesq')
const {pool} = await import('../../backend/db.js')
const {app} = await import('../../backend/app.js')
const {gerarHash} = await import('../../backend/senha.js')
const [[{diretorio}]] = await pool.query('SELECT @@datadir AS diretorio')
assert.match(diretorio,/sigpesq-validacao-/)
const senha=randomUUID()
const hash=await gerarHash(senha)
const prefixo='final-' + randomUUID().slice(0,8)
const server=app.listen(0,'127.0.0.1')
try {
  await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject)})
  const base='http://127.0.0.1:'+server.address().port+'/api/v1'
  async function cliente(perfil,idParticipante) {
    const login=prefixo+'-'+perfil.toLowerCase()
    await pool.execute('INSERT INTO usuario(login,senha_hash,perfil,id_participante) VALUES (?,?,?,?)',[login,hash,perfil,idParticipante])
    const headers={'X-SIGPesq':'1','Content-Type':'application/json'}
    const resp=await fetch(base+'/sessao',{method:'POST',headers,body:JSON.stringify({login,senha})})
    assert.equal(resp.status,200)
    headers.cookie=resp.headers.get('set-cookie').split(';')[0]
    return async (method,path,status,dados) => {
      const resp=await fetch(base+path,{method,headers,body:dados===undefined?undefined:JSON.stringify(dados)})
      const json=await resp.json().catch(()=>null)
      if (status!==null) assert.equal(resp.status,status,method+' '+path+' '+JSON.stringify(json?.erro))
      return status===null ? resp.status : json?.dados
    }
  }
  const cpfFicticio = () => '0' + String(randomInt(1e10)).padStart(10,'0')
  async function pessoa(tipo,rotulo) {
    const [r] = await pool.execute('INSERT INTO participante(nome,email_institucional,cpf,tipo) VALUES (?,?,?,?)',
      [prefixo+' '+rotulo,prefixo+'-'+rotulo+'@example.invalid',cpfFicticio(),tipo])
    return {id:r.insertId}
  }
  const docente = await pessoa('DOCENTE','docente')
  const novoDocente = await pessoa('DOCENTE','novo-docente')
  const discente = await pessoa('DISCENTE','discente')
  const admin=await cliente('ADMINISTRADOR',null), coord=await cliente('COORDENADOR',docente.id)
  const gestor=await cliente('GESTOR',null), participante=await cliente('PARTICIPANTE',discente.id)
  const geral={titulo:'Projeto de validação',descricao:'Banco isolado',dataInicio:'2026-01-01',dataTermino:'2027-01-01',situacao:'EM_ANDAMENTO',idCoordenador:docente.id}
  const p1=await coord('POST','/projetos',201,{...geral,codigo:prefixo+'-A'})
  const p2=await coord('POST','/projetos',201,{...geral,codigo:prefixo+'-B'})
  const projetoUrl='/projetos/'+p1.codigo
  await coord('PATCH',projetoUrl,200,{...geral,titulo:'Projeto revisado pelo coordenador'})
  await admin('PATCH',projetoUrl+'/situacao',403,{situacao:'CONCLUIDO'})
  const paineis=await Promise.all([admin('GET','/painel',200),coord('GET','/painel',200)])
  assert.ok(paineis[0].situacoes.EM_ANDAMENTO>=paineis[1].situacoes.EM_ANDAMENTO)
  assert.ok(paineis[1].situacoes.EM_ANDAMENTO>=2)
  const participacoes=projetoUrl+'/participacoes'
  const vinculo={idParticipante:discente.id,funcao:'BOLSISTA',dataEntrada:'2026-01-02'}
  await admin('POST',participacoes,403,vinculo)
  await coord('POST',participacoes,201,vinculo)
  await coord('POST',participacoes,409,vinculo)
  const encerrar=participacoes+'/'+discente.id+'/'+vinculo.dataEntrada+'/encerramento'
  await coord('PATCH',encerrar,422,{dataSaida:'2026-01-01'})
  const fim=await coord('PATCH',encerrar,200,{dataSaida:'2026-09-01'})
  assert.equal(fim.equipe.find(p=>p.idParticipante===discente.id).dataSaida,'2026-09-01')
  await coord('DELETE',projetoUrl,409)
  await coord('PATCH',projetoUrl+'/situacao',200,{situacao:'CANCELADO'})
  const trocaUrl='/projetos/'+p2.codigo+'/coordenador'
  await coord('PUT',trocaUrl,403,{idCoordenador:novoDocente.id})
  await admin('PUT',trocaUrl,422,{idCoordenador:discente.id})
  const troca=await admin('PUT',trocaUrl,200,{idCoordenador:novoDocente.id})
  assert.equal(troca.idCoordenador,novoDocente.id)
  assert.ok(troca.equipe.find(v=>v.idParticipante===docente.id).dataSaida)
  assert.equal(troca.equipe.find(v=>v.idParticipante===novoDocente.id).dataSaida,null)
  await coord('PATCH','/projetos/'+p2.codigo+'/situacao',403,{situacao:'CANCELADO'})
  const p3=await coord('POST','/projetos',201,{...geral,codigo:prefixo+'-C'})

  const cadastro={nome:'Cadastro QA',cpf:cpfFicticio(),emailInstitucional:prefixo+'-cadastro@example.invalid',tipo:'DISCENTE'}
  await participante('POST','/participantes',403,cadastro)
  const {id:pessoaId}=await admin('POST','/participantes',201,cadastro)
  await admin('PATCH','/participantes/'+pessoaId,200,{...cadastro,nome:'Cadastro revisado'})
  assert.equal((await admin('GET','/participantes/'+pessoaId,200)).cpf,cadastro.cpf)
  assert.equal((await participante('GET','/participantes/'+pessoaId,200)).cpf,undefined)
  await admin('DELETE','/participantes/'+pessoaId,204)
  await admin('DELETE','/participantes/'+discente.id,409)
  const {id:agenciaId}=await admin('POST','/agencias',201,{nome:'Agência QA',sigla:prefixo})
  await admin('PATCH','/agencias/'+agenciaId,200,{nome:'Agência revisada',sigla:prefixo})
  assert.equal((await gestor('GET','/agencias/'+agenciaId,200)).nome,'Agência revisada')

  const financiamento={idAgencia:1,tipoFomento:'BOLSA',valorTotal:'100.00',dataInicioVigencia:'2026-01-01',dataFimVigencia:'2027-01-01'}
  await gestor('POST','/financiamentos',403,financiamento)
  await participante('GET','/financiamentos',403)
  const {id}=await admin('POST','/financiamentos',201,financiamento)
  const f='/financiamentos/'+id, apoio=f+'/apoios'
  const retorno=await Promise.all([p1,p2].map((p,i) => admin('POST',apoio+(i ? '/' : ''),null,{codigo:p.codigo,valor:'60.00'})))
  assert.deepEqual(retorno.sort(),[201,409])
  const [v]=await gestor('GET',apoio,200)
  assert.equal(v.valor,'60.00')
  const fundos=await gestor('GET','/financiamentos?agencia=1',200)
  assert.equal(fundos.find(r=>r.id===id).saldo,'40.00')
  await admin('PATCH',f,409,{...financiamento,valorTotal:'59.99'})
  await admin('DELETE',f,409)
  await admin('DELETE',apoio+'/'+encodeURIComponent(v.codigo),204)
  await admin('DELETE',f,204)

  const campos={titulo:'Produção QA',tipo:'ARTIGO',ano:2026,meio:'Caderno QA',projetos:[p1.idProjeto],autores:[discente.id,docente.id]}
  await admin('POST','/producoes',403,campos)
  await coord('POST','/producoes',422,{...campos,autores:[]})
  const {id:producao}=await coord('POST','/producoes',201,campos)
  const pr='/producoes/'+producao
  await coord('PATCH',pr,422,{...campos,titulo:'Não persistir',autores:[4294967295]})
  let producoes=await participante('GET','/producoes',200)
  assert.equal(producoes.find(r=>r.id===producao).titulo,campos.titulo)
  assert.deepEqual(producoes.find(r=>r.id===producao).autores.map(a=>a.participante),campos.autores)
  await coord('PATCH',pr,403,{...campos,projetos:[p1.idProjeto,p2.idProjeto]})
  await coord('PATCH',pr,200,{...campos,autores:campos.autores.toReversed(),projetos:[p1.idProjeto,p3.idProjeto]})
  producoes=await gestor('GET','/producoes',200)
  assert.deepEqual(producoes.find(r=>r.id===producao).autores.map(a=>a.participante),campos.autores.toReversed())
  assert.equal(producoes.find(r=>r.id===producao).projetos.length,2)
  await coord('DELETE',pr,204)
  assert.ok(!(await gestor('GET','/producoes',200)).some(r=>r.id===producao))

  for (const [codigo,filtro] of [['RF13','?id='+docente.id],['RF14','?codigo='+p1.codigo],['RF15','?codigo='+p1.codigo],
    ['RF16','?id=1'],['RF17',''],['RF18','?ano=2026&tipo=ARTIGO'],['RF19',''],['RF20','?recorte=historico'],['RF20','?recorte=ativo']]) {
    const path='/consultas/'+codigo+filtro
    assert.ok(Array.isArray(await gestor('GET',path,200)))
    await participante('GET',path,codigo<='RF15'?200:403)
  }
  await gestor('GET','/consultas/RF20',422)
  await gestor('GET','/auditoria',403)
  const auditoria=await admin('GET','/auditoria',200)
  assert.ok(auditoria.some(l=>l.Tabela==='producao_cientifica' && l.Operação==='DELETE' && l.Registro===String(producao)))
  console.log('PASS: projetos, coordenação, vínculos, cadastros, painel, financiamento concorrente, produção com rollback, RF13–RF20, perfis e auditoria')
} finally {
  server.close()
  await pool.end()
}
