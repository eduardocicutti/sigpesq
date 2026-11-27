import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { performance } from 'node:perf_hooks'

assert.equal(process.env.DB_HOST,'127.0.0.1')
assert.equal(process.env.DB_PORT,'33927')
assert.equal(process.env.DB_NAME,'sigpesq_restauro')
const { pool } = await import('../../backend/db.js')
const [[{diretorio}]] = await pool.query('SELECT @@datadir AS diretorio')
assert.match(diretorio,/sigpesq-validacao-/)
const { app } = await import('../../backend/app.js')
const { gerarHash } = await import('../../backend/senha.js')
const login = 'carga-' + randomUUID().slice(0,12)
const senha = randomUUID()
const servidor = app.listen(0,'127.0.0.1')
try {
  await new Promise((resolve,reject) => {servidor.once('listening',resolve);servidor.once('error',reject)})
  const [[{total}]] = await pool.execute('SELECT COUNT(*) AS total FROM projeto')
  const faltam = 10000-Number(total)
  assert.ok(faltam>=0)
  if (faltam) {
    const digitos = "JSON_TABLE('[0,1,2,3,4,5,6,7,8,9]', '$[*]' COLUMNS (n INT PATH '$'))"
    const indice = 'a.n*1000+b.n*100+c.n*10+d.n'
    await pool.execute(`INSERT INTO projeto(codigo_publico,titulo,descricao,data_inicio,data_termino,situacao,id_coordenador)
      SELECT CONCAT('CARGA-QA-',${indice}),CONCAT('Projeto sintético ',${indice}),'Dados de teste','2026-01-01','2027-01-01','EM_ANDAMENTO',1
      FROM ${digitos} a CROSS JOIN ${digitos} b CROSS JOIN ${digitos} c CROSS JOIN ${digitos} d WHERE ${indice}<?`,[faltam])
  }
  const [[contagem]] = await pool.execute('SELECT COUNT(*) AS total FROM projeto')
  assert.equal(Number(contagem.total),10000)
  await pool.execute("INSERT INTO usuario(login,senha_hash,perfil) VALUES (?,?,'GESTOR')",[login,await gerarHash(senha)])
  const base = 'http://127.0.0.1:' + servidor.address().port + '/api/v1'
  const sessao = await fetch(base+'/sessao',{method:'POST',headers:{'X-SIGPesq':'1','Content-Type':'application/json'},body:JSON.stringify({login,senha})})
  assert.equal(sessao.status,200)
  const headers = {cookie:sessao.headers.get('set-cookie').split(';')[0]}
  for (const path of ['/projetos','/projetos?busca=Projeto+sintético&pagina=250','/projetos?busca=Pesquisa+inexistente',
    '/painel','/consultas/RF13?id=1','/consultas/RF17']) {
    const tempos = []
    for (let i=0;i<6;i++) {
      const inicio = performance.now()
      const r = await fetch(base+path,{headers})
      assert.equal(r.status,200)
      await r.json()
      if (i>0) tempos.push(performance.now()-inicio)
    }
    const pico=Math.max(...tempos)
    console.log(path, 'máximo (ms):', pico.toFixed(1))
    assert.ok(pico<=3000)
  }
} finally {
  servidor.close()
  await pool.end()
}
