import password from '@inquirer/password'
import { pool } from './db.js'
import { gerarHash } from './senha.js'

async function cadastrar() {
  const login = (process.argv[2] || '').trim()
  if (!login || login.length > 40) throw Error('Use npm run admin -- LOGIN (até 40 caracteres).')
  const senha = await password({message:'Senha do primeiro administrador', mask:'*'})
  if (!senha || senha.length > 1024) throw Error('Informe uma senha de até 1024 caracteres.')
  const repetida = await password({message:'Confirme a senha', mask:'*'})
  if (senha !== repetida) throw Error('As senhas diferem.')
  const hash = await gerarHash(senha)
  const conn = await pool.getConnection()
  const lock = 'sigpesq_primeiro_administrador'
  try {
    const [[{obtido}]] = await conn.execute('SELECT GET_LOCK(?, 5) AS obtido',[lock])
    if (Number(obtido) !== 1) throw Error('Cadastro de administrador em andamento.')
    await conn.beginTransaction()
    const [admins] = await conn.query("SELECT id_usuario FROM usuario WHERE perfil='ADMINISTRADOR' LIMIT 1")
    if (admins.length) throw Error('A base já possui administrador.')
    const [ret] = await conn.execute("INSERT INTO usuario(login,senha_hash,perfil,ativo) VALUES (?,?,'ADMINISTRADOR',1)",[login,hash])
    await conn.execute("INSERT INTO log_auditoria(id_usuario,tabela,operacao,chave_registro,descricao) VALUES (?,'usuario','INSERT',?,'Primeiro administrador cadastrado')",[ret.insertId,String(ret.insertId)])
    await conn.commit()
    console.log('Administrador cadastrado.')
  } catch (erro) {
    await conn.rollback()
    throw erro
  } finally {
    try { await conn.execute('SELECT RELEASE_LOCK(?)',[lock]) } finally { conn.release() }
  }
}

try { await cadastrar() }
catch (erro) { console.error(erro.code || erro.message); process.exitCode=1 }
finally { await pool.end() }
