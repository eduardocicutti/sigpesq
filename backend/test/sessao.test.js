import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { once } from 'node:events'
import { pool } from '../db.js'
import { verificarSenha } from '../senha.js'
import { sessao } from '../sessao.js'

const vetor = ['pbkdf2:sha256:1','salt','120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b'].join('$')

test('lê o formato Werkzeug PBKDF2-SHA256 e rejeita senha incorreta', async()=>{
  assert.equal(await verificarSenha('password',vetor),true)
  assert.equal(await verificarSenha('outra',vetor),false)
})

test('sessão cria cookie HttpOnly, consulta usuário atual e revoga o token',async t=>{
  const tokens = new Map()
  const usuario = {idUsuario:5,idParticipante:9,perfil:'COORDENADOR',tipoParticipante:'DOCENTE',nomeParticipante:'Docente',login:'docente',senha_hash:vetor}
  t.mock.method(pool,'execute',async(sql,parametros)=>{
    if (sql.includes('WHERE u.login=')) return [[usuario]]
    if (sql.includes('INSERT INTO sessao')) tokens.set(parametros[0].toString('hex'),parametros[1])
    if (sql.includes('FROM sessao s')) return [tokens.has(parametros[0].toString('hex')) ? [usuario] : []]
    if (sql.includes('DELETE FROM sessao WHERE token_hash')) tokens.delete(parametros[0].toString('hex'))
    return [[]]
  })
  const app = express().use(express.json()).use('/api/v1/sessao',sessao)
  const server = app.listen(0,'127.0.0.1')
  await once(server,'listening')
  t.after(()=>new Promise(resolve=>server.close(resolve)))
  const url = 'http://127.0.0.1:'+server.address().port+'/api/v1/sessao'
  const resposta = await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({login:'docente',senha:'password'})})
  assert.equal(resposta.status,200)
  assert.equal((await resposta.json()).dados.perfil,'Coordenador')
  const cookie = resposta.headers.get('set-cookie')
  assert.match(cookie,/HttpOnly/)
  const headers = {cookie:cookie.split(';')[0]}
  assert.equal((await fetch(url,{headers})).status,200)
  usuario.tipoParticipante='DISCENTE'
  assert.equal((await fetch(url,{headers})).status,401)
  usuario.tipoParticipante='DOCENTE'
  assert.equal((await fetch(url,{method:'DELETE',headers})).status,204)
  assert.equal((await fetch(url,{headers})).status,401)
})
