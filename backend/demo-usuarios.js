import { pool } from './db.js'
import { gerarHash, verificarSenha } from './senha.js'

const contas = [
  ['eduardo.cicutti', 'ADMINISTRADOR', null],
  ['antonio', 'GESTOR', null],
  ['jose.antonio.dos.santos', 'COORDENADOR', 'DOCENTE'],
  ['daniel.mendes', 'PARTICIPANTE', 'DISCENTE'],
]

async function prepararContas() {
  if (!['127.0.0.1', 'localhost', '::1'].includes(process.env.DB_HOST || '127.0.0.1') ||
      process.env.NODE_ENV === 'production') {
    throw new Error('Use este comando somente em um banco local de demonstração.')
  }
  const senha = process.env.DEMO_PASSWORD
  if (!senha || senha.length < 12 || senha.length > 1024) {
    throw new Error('Informe DEMO_PASSWORD com 12 a 1024 caracteres.')
  }

  const conn = await pool.getConnection()
  const lock = 'sigpesq_contas_demonstracao'
  let adquirido = false
  try {
    const [[{ obtido }]] = await conn.execute('SELECT GET_LOCK(?, 5) AS obtido', [lock])
    adquirido = Number(obtido) === 1
    if (!adquirido) throw new Error('Outro provisionamento está em andamento.')

    await conn.beginTransaction()
    for (const [login, perfil, tipo] of contas) {
      const [[usuario]] = await conn.execute(
        `SELECT u.perfil, u.ativo, u.senha_hash, p.tipo
           FROM usuario u LEFT JOIN participante p USING (id_participante)
          WHERE u.login = ?`, [login])
      if (usuario) {
        if (usuario.perfil !== perfil || Number(usuario.ativo) !== 1 ||
            (tipo && usuario.tipo !== tipo) || !(await verificarSenha(senha, usuario.senha_hash))) {
          throw new Error(`A conta ${login} já existe com dados diferentes dos esperados.`)
        }
        continue
      }

      let idParticipante = null
      if (tipo) {
        const [[participante]] = await conn.execute(
          `SELECT p.id_participante FROM participante p
            WHERE p.tipo = ? AND NOT EXISTS (
              SELECT 1 FROM usuario u WHERE u.id_participante = p.id_participante
            )
            ORDER BY EXISTS (
              SELECT 1 FROM projeto j WHERE j.id_coordenador = p.id_participante
            ) DESC, p.id_participante LIMIT 1 FOR UPDATE`, [tipo])
        if (!participante) throw new Error(`Nenhum participante disponível para ${perfil}.`)
        idParticipante = participante.id_participante
      }

      const [ret] = await conn.execute(
        'INSERT INTO usuario(login, senha_hash, perfil, ativo, id_participante) VALUES (?, ?, ?, 1, ?)',
        [login, await gerarHash(senha), perfil, idParticipante])
      await conn.execute(
        "INSERT INTO log_auditoria(id_usuario,tabela,operacao,chave_registro,descricao) VALUES (?,'usuario','INSERT',?,'Conta de demonstração provisionada')",
        [ret.insertId, String(ret.insertId)])
    }
    await conn.commit()
    for (const [login, perfil] of contas) console.log(`${login} (${perfil})`)
  } catch (erro) {
    if (adquirido) await conn.rollback()
    throw erro
  } finally {
    try {
      if (adquirido) await conn.execute('SELECT RELEASE_LOCK(?)', [lock])
    } finally {
      conn.release()
    }
  }
}

try {
  await prepararContas()
} catch (erro) {
  console.error(erro.code || erro.message)
  process.exitCode = 1
} finally {
  await pool.end()
}
