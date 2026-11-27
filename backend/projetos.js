import { Router } from 'express'
import { pool } from './db.js'

const situacoes = new Set(['EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'])
const perfis = new Set(['Administrador', 'Coordenador', 'Participante', 'Gestor'])
const colunas = `p.codigo AS idProjeto, p.codigo_publico AS codigo, p.titulo, p.descricao,
  DATE_FORMAT(p.data_inicio,'%Y-%m-%d') AS dataInicio, DATE_FORMAT(p.data_termino,'%Y-%m-%d') AS dataTermino,
  p.situacao, p.id_coordenador AS idCoordenador, d.nome AS coordenador`
const origem = 'FROM projeto p JOIN participante d ON d.id_participante=p.id_coordenador'

class ErroProjeto extends Error {
  constructor(status, codigo, mensagem, campos) {
    super(mensagem)
    Object.assign(this, { status, codigo, campos })
  }
}

function inteiro(valor, maximo) {
  return ['string','number'].includes(typeof valor) && /^\d+$/.test(String(valor))
    && Number(valor) >= 1 && Number(valor) <= maximo
}

function dataValida(valor) {
  if (typeof valor !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(valor)) return false
  const data = new Date(valor + 'T00:00:00Z')
  return !Number.isNaN(data.valueOf()) && data.toISOString().slice(0, 10) === valor
}

function texto(valor) {
  return typeof valor === 'string' ? valor.trim() : ''
}

export function validarProjeto(dados, usuario) {
  if (!['Administrador','Coordenador'].includes(usuario.perfil)) throw new ErroProjeto(403,'SEM_PERMISSAO','Seu perfil não pode cadastrar projetos.')
  const codigo = texto(dados?.codigo).toUpperCase()
  const titulo = texto(dados?.titulo)
  const descricao = texto(dados?.descricao)
  const { dataInicio, dataTermino, situacao } = dados ?? {}
  const id = usuario.perfil === 'Coordenador' ? usuario.idParticipante : dados?.idCoordenador
  const campos = {}
  if (!codigo || [...codigo].length > 20) campos.codigo = 'Informe um código de até 20 caracteres.'
  if (!titulo || [...titulo].length > 200) campos.titulo = 'Informe um título de até 200 caracteres.'
  if (!descricao || Buffer.byteLength(descricao) > 65535) campos.descricao = 'Informe uma descrição de até 65.535 bytes.'
  if (!dataValida(dataInicio)) campos.dataInicio = 'Informe uma data inicial válida.'
  if (!dataValida(dataTermino) || dataTermino < dataInicio) campos.dataTermino = 'O término deve ser válido e igual ou posterior ao início.'
  if (!situacoes.has(situacao)) campos.situacao = 'Selecione a situação do projeto.'
  if (!inteiro(id, 4294967295)) campos.idCoordenador = 'Selecione um docente.'
  if (Object.keys(campos).length) throw new ErroProjeto(422,'VALIDACAO',Object.values(campos)[0],campos)
  return [codigo,titulo,descricao,dataInicio,dataTermino,situacao,Number(id)]
}

async function detalhe(db, codigo) {
  const [[projeto]] = await db.execute(`SELECT ${colunas} ${origem} WHERE p.codigo_publico=?`, [codigo])
  if (!projeto) throw new ErroProjeto(404,'NAO_ENCONTRADO','Projeto não encontrado.')
  const [equipe] = await db.execute(`SELECT pc.id_participante AS idParticipante, pa.nome, pc.funcao,
    DATE_FORMAT(pc.data_entrada,'%Y-%m-%d') AS dataEntrada, DATE_FORMAT(pc.data_saida,'%Y-%m-%d') AS dataSaida
    FROM participacao pc JOIN participante pa USING(id_participante) WHERE pc.codigo_projeto=?
    ORDER BY pc.data_entrada, pa.nome, pc.id_participante`, [projeto.idProjeto])
  return { ...projeto, equipe }
}

export async function cadastrarProjeto(db, usuario, dados) {
  const valores = validarProjeto(dados, usuario)
  const conexao = await db.getConnection()
  try {
    await conexao.beginTransaction()
    const [[docente]] = await conexao.execute('SELECT tipo FROM participante WHERE id_participante=? FOR SHARE', [valores[6]])
    if (docente?.tipo !== 'DOCENTE') throw new ErroProjeto(422,'VALIDACAO','Selecione um docente.',{ idCoordenador:'Selecione um docente.' })
    await conexao.execute('CALL sp_cadastrar_projeto(?,?,?,?,?,?,?,@id_projeto)', valores)
    const projeto = await detalhe(conexao, valores[0])
    await conexao.execute(`INSERT INTO log_auditoria (id_usuario,tabela,operacao,chave_registro,descricao)
      VALUES (?,'projeto','INSERT',?,'Projeto cadastrado com vínculo de coordenação.')`, [usuario.idUsuario,String(projeto.idProjeto)])
    await conexao.commit()
    return projeto
  } catch (erro) {
    await conexao.rollback()
    if (erro.code === 'ER_DUP_ENTRY') throw new ErroProjeto(409,'DUPLICIDADE','Já existe um projeto com esse código.')
    throw erro
  } finally {
    conexao.release()
  }
}

const router = Router()
const rota = (handler) => async (req,res,next) => {
  try {
    if (!req.usuario) throw new ErroProjeto(401,'SEM_SESSAO','Entre no sistema.')
    if (!perfis.has(req.usuario.perfil)) throw new ErroProjeto(403,'SEM_PERMISSAO','Perfil sem acesso.')
    await handler(req,res)
  } catch (erro) {
    if (!(erro instanceof ErroProjeto)) return next(erro)
    res.status(erro.status).json({erro:{codigo:erro.codigo,mensagem:erro.message,campos:erro.campos}})
  }
}

router.get('/painel', rota(async (req,res) => {
  const hoje = new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date())
  const coordenador = req.usuario.perfil === 'Coordenador' ? req.usuario.idParticipante : null
  const filtro = coordenador === null ? '' : ' AND p.id_coordenador=?'
  const parametros = coordenador === null ? [] : [coordenador]
  const [situacoes] = await pool.execute(
    'SELECT p.situacao,COUNT(*) AS total FROM projeto p WHERE 1=1' + filtro + ' GROUP BY p.situacao',parametros)
  const [proximos] = await pool.execute(
    `SELECT ${colunas} ${origem} WHERE p.situacao='EM_ANDAMENTO'
      AND p.data_termino BETWEEN CAST(? AS DATE) AND DATE_ADD(CAST(? AS DATE), INTERVAL 90 DAY)${filtro}
      ORDER BY p.data_termino,p.codigo LIMIT 10`,[hoje,hoje,...parametros])
  res.json({dados:{situacoes:Object.fromEntries(situacoes.map(r => [r.situacao,Number(r.total)])),proximos}})
}))

router.get('/docentes',rota(async (_req,res) => {
  const [dados] = await pool.execute("SELECT id_participante AS idParticipante,nome FROM participante WHERE tipo='DOCENTE' ORDER BY nome,id_participante")
  res.json({dados})
}))

router.get('/projetos',rota(async (req,res) => {
  const { pagina='1', tamanho='20', busca='', situacao='', idCoordenador='' } = req.query
  if (!inteiro(pagina,4294967295) || !inteiro(tamanho,100) || typeof busca !== 'string'
    || (situacao && !situacoes.has(situacao)) || (idCoordenador && !inteiro(idCoordenador,4294967295))) {
    throw new ErroProjeto(422,'VALIDACAO','Revise os filtros e a paginação.')
  }
  const filtros = [], parametros = []
  if (busca.trim()) {
    filtros.push('(LOCATE(?,p.titulo)>0 OR LOCATE(?,p.codigo_publico)>0)')
    parametros.push(busca.trim(),busca.trim())
  }
  if (situacao) { filtros.push('p.situacao=?'); parametros.push(situacao) }
  if (idCoordenador) { filtros.push('p.id_coordenador=?'); parametros.push(Number(idCoordenador)) }
  const fonte = origem + (filtros.length ? ' WHERE '+ filtros.join(' AND ') : '')
  const [[{total}]] = await pool.execute('SELECT COUNT(*) AS total '+fonte,parametros)
  const offset = (Number(pagina)-1)*Number(tamanho)
  const [dados] = await pool.execute(`SELECT ${colunas} ${fonte} ORDER BY p.codigo DESC LIMIT ${Number(tamanho)} OFFSET ${offset}`,parametros)
  res.json({dados,paginacao:{pagina:Number(pagina),tamanho:Number(tamanho),total:Number(total)}})
}))
router.get('/projetos/:codigo',rota(async (req,res) => res.json({dados:await detalhe(pool,req.params.codigo)})))
router.post('/projetos',rota(async (req,res) => res.status(201).json({dados:await cadastrarProjeto(pool,req.usuario,req.body)})))

async function atualizarProjeto(req, apenasSituacao) {
  const conexao = await pool.getConnection()
  try {
    await conexao.beginTransaction()
    const [[projeto]] = await conexao.execute(
      'SELECT codigo, id_coordenador, situacao FROM projeto WHERE codigo_publico=? FOR UPDATE', [req.params.codigo])
    if (!projeto) throw new ErroProjeto(404, 'NAO_ENCONTRADO', 'Projeto não encontrado.')
    const coordenador = req.usuario.perfil === 'Coordenador' && req.usuario.idParticipante === projeto.id_coordenador
    if (!coordenador && (apenasSituacao || req.usuario.perfil !== 'Administrador')) {
      throw new ErroProjeto(403, 'SEM_PERMISSAO', 'Seu perfil não pode alterar este projeto.')
    }
    if (apenasSituacao) {
      const situacao = req.body?.situacao
      if (!situacoes.has(situacao)) throw new ErroProjeto(422, 'VALIDACAO', 'Selecione uma situação válida.')
      await conexao.execute('UPDATE projeto SET situacao=? WHERE codigo=?', [situacao, projeto.codigo])
    } else {
      const [, titulo, descricao, inicio, termino] = validarProjeto({
        ...req.body, codigo: req.params.codigo, idCoordenador: projeto.id_coordenador, situacao: projeto.situacao,
      }, req.usuario)
      await conexao.execute('UPDATE projeto SET titulo=?, descricao=?, data_inicio=?, data_termino=? WHERE codigo=?',
        [titulo, descricao, inicio, termino, projeto.codigo])
    }
    await conexao.execute(
      "INSERT INTO log_auditoria (id_usuario,tabela,operacao,chave_registro,descricao) VALUES (?,'projeto','UPDATE',?,?)",
      [req.usuario.idUsuario, String(projeto.codigo), apenasSituacao ? 'Situação atualizada.' : 'Dados básicos atualizados.'])
    const dados = await detalhe(conexao, req.params.codigo)
    await conexao.commit()
    return dados
  } catch (erro) {
    await conexao.rollback()
    throw erro
  } finally {
    conexao.release()
  }
}

router.patch('/projetos/:codigo', rota(async (req, res) => res.json({ dados: await atualizarProjeto(req, false) })))
router.patch('/projetos/:codigo/situacao', rota(async (req, res) => res.json({ dados: await atualizarProjeto(req, true) })))

const funcoes = new Set(['VICE_COORDENADOR', 'PESQUISADOR', 'BOLSISTA', 'COLABORADOR', 'VOLUNTARIO', 'OUTRO'])
const equipeUrl = '/projetos/:codigo/participacoes'

async function projetoDaEquipe(db, req) {
  const [[projeto]] = await db.execute(
    'SELECT codigo, id_coordenador FROM projeto WHERE codigo_publico=? FOR UPDATE', [req.params.codigo])
  if (!projeto) throw new ErroProjeto(404, 'NAO_ENCONTRADO', 'Projeto não encontrado.')
  if (req.usuario.perfil !== 'Coordenador' || req.usuario.idParticipante !== projeto.id_coordenador) {
    throw new ErroProjeto(403, 'SEM_PERMISSAO', 'Somente o coordenador deste projeto pode gerir os vínculos.')
  }
  return projeto.codigo
}

router.get(equipeUrl + '/candidatos', rota(async (req, res) => {
  await projetoDaEquipe(pool, req)
  const [dados] = await pool.execute('SELECT id_participante AS idParticipante, nome FROM participante ORDER BY nome, id_participante')
  res.json({ dados })
}))

async function gravarVinculo(req, encerrar) {
  const { idParticipante, dataEntrada } = encerrar ? req.params : req.body ?? {}
  const { funcao, dataSaida } = req.body ?? {}
  if (!inteiro(idParticipante, 4294967295) || !dataValida(dataEntrada)
      || (!encerrar && !funcoes.has(funcao))
      || ((encerrar || dataSaida) && (!dataValida(dataSaida) || dataSaida < dataEntrada))) {
    throw new ErroProjeto(422, 'VALIDACAO', 'Revise o participante, a função e as datas do vínculo.')
  }
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const codigo = await projetoDaEquipe(conn, req)
    const chave = [codigo, Number(idParticipante), dataEntrada]
    if (encerrar) {
      const [resultado] = await conn.execute(
        "UPDATE participacao SET data_saida=? WHERE codigo_projeto=? AND id_participante=? AND data_entrada=? AND data_saida IS NULL AND funcao<>'COORDENADOR'",
        [dataSaida, ...chave])
      if (!resultado.affectedRows) throw new ErroProjeto(409, 'CONFLITO', 'O vínculo não está aberto ou corresponde à coordenação principal.')
    } else {
      await conn.execute('INSERT INTO participacao(codigo_projeto,id_participante,data_entrada,funcao,data_saida) VALUES (?,?,?,?,?)',
        [...chave, funcao, dataSaida || null])
    }
    await conn.execute(
      "INSERT INTO log_auditoria(id_usuario,tabela,operacao,chave_registro,descricao) VALUES (?,'participacao',?,?,?)",
      [req.usuario.idUsuario, encerrar ? 'UPDATE' : 'INSERT', chave.join('/'), encerrar ? 'Vínculo encerrado.' : 'Participante vinculado ao projeto.'])
    const dados = await detalhe(conn, req.params.codigo)
    await conn.commit()
    return dados
  } catch (erro) {
    await conn.rollback()
    if (erro.code === 'ER_DUP_ENTRY') throw new ErroProjeto(409, 'DUPLICIDADE', 'Já existe um vínculo para este participante e data.')
    if (erro.code === 'ER_NO_REFERENCED_ROW_2') throw new ErroProjeto(422, 'VALIDACAO', 'Participante não encontrado.')
    throw erro
  } finally {
    conn.release()
  }
}

router.post(equipeUrl, rota(async (req, res) => res.status(201).json({ dados: await gravarVinculo(req, false) })))
router.patch(equipeUrl + '/:idParticipante/:dataEntrada/encerramento',
  rota(async (req, res) => res.json({ dados: await gravarVinculo(req, true) })))

router.put('/projetos/:codigo/coordenador', rota(async (req, res) => {
  if (req.usuario.perfil !== 'Administrador') throw new ErroProjeto(403, 'SEM_PERMISSAO', 'Somente o Administrador pode trocar a coordenação.')
  const id = req.body?.idCoordenador
  if (!inteiro(id, 4294967295)) throw new ErroProjeto(422, 'VALIDACAO', 'Selecione um docente.')
  const hoje = new Intl.DateTimeFormat('sv-SE', {timeZone:'America/Sao_Paulo'}).format(new Date())
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [[projeto]] = await conn.execute('SELECT codigo,id_coordenador FROM projeto WHERE codigo_publico=? FOR UPDATE', [req.params.codigo])
    if (!projeto) throw new ErroProjeto(404,'NAO_ENCONTRADO','Projeto não encontrado.')
    if (projeto.id_coordenador === Number(id)) throw new ErroProjeto(409,'CONFLITO','Este docente já coordena o projeto.')
    const [[docente]] = await conn.execute('SELECT tipo FROM participante WHERE id_participante=? FOR SHARE', [Number(id)])
    if (docente?.tipo !== 'DOCENTE') throw new ErroProjeto(422,'VALIDACAO','Selecione um docente.')
    const [ativos] = await conn.execute(
      "SELECT data_entrada,id_participante FROM participacao WHERE codigo_projeto=? AND funcao='COORDENADOR' AND data_saida IS NULL FOR UPDATE", [projeto.codigo])
    if (ativos.length !== 1 || ativos[0].id_participante !== projeto.id_coordenador || ativos[0].data_entrada > hoje) {
      throw new ErroProjeto(409,'CONFLITO','O projeto não tem uma coordenação vigente que possa ser encerrada.')
    }
    await conn.execute("UPDATE participacao SET data_saida=? WHERE codigo_projeto=? AND id_participante=? AND data_entrada=?",
      [hoje, projeto.codigo, projeto.id_coordenador, ativos[0].data_entrada])
    await conn.execute("INSERT INTO participacao(codigo_projeto,id_participante,data_entrada,funcao) VALUES (?,?,?,'COORDENADOR')", [projeto.codigo,Number(id),hoje])
    await conn.execute('UPDATE projeto SET id_coordenador=? WHERE codigo=?', [Number(id),projeto.codigo])
    await conn.execute("INSERT INTO log_auditoria(id_usuario,tabela,operacao,chave_registro,descricao) VALUES (?,'projeto','UPDATE',?,'Coordenação atualizada.')",
      [req.usuario.idUsuario,String(projeto.codigo)])
    const dados = await detalhe(conn, req.params.codigo)
    await conn.commit()
    res.json({dados})
  } catch (erro) {
    await conn.rollback()
    if (erro.code === 'ER_DUP_ENTRY') throw new ErroProjeto(409,'DUPLICIDADE','O docente já possui vínculo com esta data de entrada.')
    throw erro
  } finally { conn.release() }
}))

router.delete('/projetos/:codigo', rota(async (req, res) => {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [[projeto]] = await conn.execute('SELECT codigo,id_coordenador FROM projeto WHERE codigo_publico=? FOR UPDATE', [req.params.codigo])
    if (!projeto) throw new ErroProjeto(404,'NAO_ENCONTRADO','Projeto não encontrado.')
    if (req.usuario.perfil !== 'Administrador' &&
        (req.usuario.perfil !== 'Coordenador' || req.usuario.idParticipante !== projeto.id_coordenador)) {
      throw new ErroProjeto(403,'SEM_PERMISSAO','Seu perfil não pode excluir este projeto.')
    }
    await conn.execute('DELETE FROM projeto WHERE codigo=?', [projeto.codigo])
    await conn.execute("INSERT INTO log_auditoria(id_usuario,tabela,operacao,chave_registro,descricao) VALUES (?,'projeto','DELETE',?,'Projeto excluído.')",
      [req.usuario.idUsuario,String(projeto.codigo)])
    await conn.commit()
    res.sendStatus(204)
  } catch (erro) {
    await conn.rollback()
    if (erro.code === 'ER_ROW_IS_REFERENCED_2') throw new ErroProjeto(409,'CONFLITO','O projeto possui vínculos. O coordenador pode marcar a situação como Cancelado.')
    throw erro
  } finally { conn.release() }
}))
export default router
