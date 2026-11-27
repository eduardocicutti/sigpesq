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
export default router
