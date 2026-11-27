import { Router } from 'express'
import { pool } from './db.js'

const router = Router()
const tipos = new Set(['ARTIGO','CAPITULO_LIVRO','LIVRO','SOFTWARE','RELATORIO_TECNICO','OUTRO'])
const falha = (status, message) => Object.assign(new Error(message),{status,codigo:'PRODUCAO'})
const inteiro = (v, max = 4294967295) => ['string','number'].includes(typeof v) && /^\d+$/.test(v) && Number(v)>0 && Number(v)<=max
const limpar = v => typeof v === 'string' ? v.trim() : ''

router.get('/producoes', async (_req,res) => {
  const [dados] = await pool.execute('SELECT id_producao AS id,titulo,tipo,ano_publicacao AS ano,meio_divulgacao AS meio FROM producao_cientifica ORDER BY ano_publicacao DESC,titulo,id_producao')
  const [projetos] = await pool.execute('SELECT pp.id_producao AS id,p.codigo_publico AS codigo,p.id_coordenador AS coordenador FROM producao_projeto pp JOIN projeto p ON p.codigo=pp.codigo_projeto ORDER BY p.codigo')
  const [autores] = await pool.execute('SELECT a.id_producao AS id,a.id_participante AS participante,p.nome FROM autoria a JOIN participante p USING(id_participante) ORDER BY a.ordem_autoria')
  const indice = new Map(dados.map(p => [p.id,{...p,projetos:[],autores:[]}]))
  for (const {id,...projeto} of projetos) indice.get(id)?.projetos.push(projeto)
  for (const {id,...autor} of autores) indice.get(id)?.autores.push(autor)
  res.json({dados:[...indice.values()]})
})

async function gravar(req,res) {
  const usuario = req.usuario
  if (usuario.perfil !== 'Coordenador') throw falha(403,'Somente a coordenação pode manter produções.')
  const id = req.params.id
  if (id && !inteiro(id)) throw falha(422,'Identificador inválido.')
  const excluir = req.method === 'DELETE'
  const {tipo,ano,projetos,autores} = req.body ?? {}
  const titulo = limpar(req.body?.titulo), meio = limpar(req.body?.meio)
  if (!excluir && (!titulo || titulo.length>250 || !meio || meio.length>200 || !tipos.has(tipo) || !inteiro(ano,65535)
    || !Array.isArray(projetos) || !projetos.length || projetos.some(p => !inteiro(p))
    || !Array.isArray(autores) || !autores.length || autores.length>255 || autores.some(a => !inteiro(a))
    || new Set(projetos.map(Number)).size!==projetos.length || new Set(autores.map(Number)).size!==autores.length)) {
    throw falha(422,'Informe título, tipo, ano, meio, projetos e autores distintos.')
  }
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const ids = new Set(excluir ? [] : projetos.map(Number))
    if (id) {
      const [[existente]] = await conn.execute('SELECT id_producao FROM producao_cientifica WHERE id_producao=? FOR UPDATE',[id])
      if (!existente) throw falha(404,'Produção não encontrada.')
      const [atuais] = await conn.execute('SELECT codigo_projeto FROM producao_projeto WHERE id_producao=?',[id])
      if (!atuais.length) throw falha(409,'A produção precisa ter um projeto vinculado.')
      for (const projeto of atuais) ids.add(projeto.codigo_projeto)
    }
    const chaves = [...ids].sort((a,b)=>a-b)
    const [permitidos] = await conn.execute(`SELECT codigo FROM projeto WHERE codigo IN (${chaves.map(()=>'?').join(',')}) AND id_coordenador=? ORDER BY codigo FOR UPDATE`,
      [...chaves,usuario.idParticipante])
    if (permitidos.length !== chaves.length) throw falha(403,'A produção só pode ser mantida pela coordenação de todos os projetos vinculados.')
    let registro = id
    if (id) {
      await conn.execute('DELETE FROM autoria WHERE id_producao=?',[id])
      await conn.execute('DELETE FROM producao_projeto WHERE id_producao=?',[id])
    }
    if (excluir) await conn.execute('DELETE FROM producao_cientifica WHERE id_producao=?',[id])
    else {
      const campos = [titulo,tipo,Number(ano),meio]
      if (id) await conn.execute('UPDATE producao_cientifica SET titulo=?,tipo=?,ano_publicacao=?,meio_divulgacao=? WHERE id_producao=?',[...campos,id])
      else {
        const [r] = await conn.execute('INSERT INTO producao_cientifica(titulo,tipo,ano_publicacao,meio_divulgacao) VALUES (?,?,?,?)',campos)
        registro = r.insertId
      }
      for (const projeto of projetos) await conn.execute('INSERT INTO producao_projeto(id_producao,codigo_projeto) VALUES (?,?)',[registro,Number(projeto)])
      for (const [i,autor] of autores.entries()) await conn.execute('INSERT INTO autoria(id_producao,id_participante,ordem_autoria) VALUES (?,?,?)',[registro,Number(autor),i+1])
    }
    await conn.execute("INSERT INTO log_auditoria(id_usuario,tabela,operacao,chave_registro,descricao) VALUES (?,'producao_cientifica',?,?,?)",
      [usuario.idUsuario,excluir?'DELETE':id?'UPDATE':'INSERT',String(registro),'Manutenção de produção.'])
    await conn.commit()
    if (excluir) return res.sendStatus(204)
    res.status(id?200:201).json({dados:{id:Number(registro)}})
  } catch (erro) {
    await conn.rollback()
    if (erro.code === 'ER_NO_REFERENCED_ROW_2') throw falha(422,'Autor ou projeto não encontrado.')
    throw erro
  } finally { conn.release() }
}

router.post('/producoes',gravar)
router.patch('/producoes/:id',gravar)
router.delete('/producoes/:id',gravar)
export default router
