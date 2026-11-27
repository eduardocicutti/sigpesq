import { createHash, randomBytes } from 'node:crypto'
import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { pool } from './db.js'
import { verificarSenha } from './senha.js'

const cookie = 'sigpesq_sessao'
const horas = 8
const perfis = { ADMINISTRADOR: 'Administrador', COORDENADOR: 'Coordenador', PARTICIPANTE: 'Participante', GESTOR: 'Gestor' }
const colunas = 'u.id_usuario AS idUsuario, u.id_participante AS idParticipante, u.login, u.perfil, p.nome AS nomeParticipante, p.tipo AS tipoParticipante'
const participante = 'LEFT JOIN participante p ON p.id_participante=u.id_participante'
const hashFicticio = 'pbkdf2:sha256:1000000$usuarioausente$' + '0'.repeat(64)
const codificar = token => createHash('sha256').update(token).digest()
const opcoesCookie = () => ({
  path: '/api/v1', httpOnly: true, sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production' || process.env.FRONTEND_ORIGIN?.startsWith('https://'),
})

function lerCookie(req) {
  return /(?:^|;\s*)sigpesq_sessao=([a-f0-9]{64})(?:;|$)/.exec(req.get('cookie') || '')?.[1]
}

function dadosUsuario(row) {
  if (!row || !Object.hasOwn(perfis,row.perfil)) return null
  if (row.perfil === 'COORDENADOR' && row.tipoParticipante !== 'DOCENTE') return null
  if (row.perfil === 'PARTICIPANTE' && !row.idParticipante) return null
  const {idUsuario, idParticipante, login, nomeParticipante} = row
  return {idUsuario, idParticipante, login, nomeParticipante, perfil: perfis[row.perfil]}
}

export async function autenticar(req,res,next) {
  const token = lerCookie(req)
  if (token) {
    const [rows] = await pool.execute(
      `SELECT ${colunas} FROM sessao s JOIN usuario u ON u.id_usuario=s.id_usuario ${participante}
       WHERE s.token_hash=? AND s.expira_em>UTC_TIMESTAMP() AND u.ativo=1`, [codificar(token)])
    req.usuario = dadosUsuario(rows[0])
  }
  if (!req.usuario) return res.status(401).json({erro:{codigo:'SEM_SESSAO',mensagem:'Entre para continuar.'}})
  next()
}

export const sessao = Router()
sessao.post('/', rateLimit({
  windowMs: 15*60*1000, limit: 25, skipSuccessfulRequests: true,
  message:{erro:{codigo:'TENTATIVAS',mensagem:'Aguarde antes de tentar entrar novamente.'}},
}), async (req,res) => {
  const { login, senha } = req.body ?? {}
  if (typeof login !== 'string' || login.length > 40 || typeof senha !== 'string' || !senha.length || senha.length > 1024)
    return res.status(401).json({erro:{codigo:'CREDENCIAIS',mensagem:'Login ou senha inválidos.'}})
  const [rows] = await pool.execute(`SELECT ${colunas}, u.senha_hash FROM usuario u ${participante} WHERE u.login=? AND u.ativo=1`,[login.trim()])
  const usuario = dadosUsuario(rows[0])
  const valido = await verificarSenha(senha,rows[0]?.senha_hash ?? hashFicticio)
  if (!usuario || !valido) return res.status(401).json({erro:{codigo:'CREDENCIAIS',mensagem:'Login ou senha inválidos.'}})
  const anterior = lerCookie(req)
  if (anterior) await pool.execute('DELETE FROM sessao WHERE token_hash=?',[codificar(anterior)])
  await pool.execute('DELETE FROM sessao WHERE expira_em <= UTC_TIMESTAMP() LIMIT 100')
  const token = randomBytes(32).toString('hex')
  await pool.execute('INSERT INTO sessao(token_hash,id_usuario,expira_em) VALUES (?,?,TIMESTAMPADD(HOUR,?,UTC_TIMESTAMP()))',[codificar(token),usuario.idUsuario,horas])
  res.cookie(cookie, token, {...opcoesCookie(),maxAge:horas*3600_000}).json({dados:usuario})
})
sessao.get('/',autenticar,(req,res)=>res.json({dados:req.usuario}))
sessao.delete('/',async(req,res)=>{
  const token = lerCookie(req)
  if (token) await pool.execute('DELETE FROM sessao WHERE token_hash=?',[codificar(token)])
  res.clearCookie(cookie,opcoesCookie()).sendStatus(204)
})
