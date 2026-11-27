import { Router } from 'express'
import { pool } from './db.js'

const router = Router()
const tipos = new Set(['DOCENTE', 'DISCENTE', 'TECNICO'])
const erro = (status, codigo, message) => Object.assign(new Error(message), { status, codigo })
const texto = valor => typeof valor === 'string' ? valor.trim() : ''

for (const [rota, tabela] of [['participantes', 'participante'], ['agencias', 'agencia_financiadora']]) {
  const agencia = rota === 'agencias'
  const chave = agencia ? 'id_agencia' : 'id_participante'
  const caminho = '/' + rota

  async function consultar(req, res) {
    const id = req.params.id
    const campos = agencia ? 'sigla, nome'
      : 'nome, email_institucional AS emailInstitucional, tipo' + (req.usuario.perfil === 'Administrador' ? ', cpf' : '')
    const [dados] = await pool.execute(
      `SELECT ${chave} AS id, ${campos} FROM ${tabela}${id ? ` WHERE ${chave}=?` : ''} ORDER BY nome, ${chave}`, id ? [id] : [])
    if (id && !dados.length) throw erro(404, 'NAO_ENCONTRADO', 'Cadastro não encontrado.')
    res.json({ dados: id ? dados[0] : dados })
  }

  async function gravar(req, res) {
    if (req.usuario.perfil !== 'Administrador') throw erro(403, 'SEM_PERMISSAO', 'Somente o Administrador pode manter cadastros.')
    const id = req.params.id
    const excluir = req.method === 'DELETE'
    const { nome, sigla, cpf, emailInstitucional, tipo } = req.body ?? {}
    const nomeLimpo = texto(nome)
    const siglaLimpa = texto(sigla).toUpperCase()
    const documento = texto(cpf).replace(/[.-]/g, '')
    const email = texto(emailInstitucional).toLowerCase()
    if (!excluir && (!nomeLimpo || nomeLimpo.length > 150 || (agencia
      ? !siglaLimpa || siglaLimpa.length > 15
      : !/^\d{11}$/.test(documento) || email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !tipos.has(tipo)))) {
      throw erro(422, 'VALIDACAO', 'Revise os campos do cadastro.')
    }
    const colunas = agencia ? ['nome', 'sigla'] : ['nome', 'cpf', 'email_institucional', 'tipo']
    const valores = agencia ? [nomeLimpo, siglaLimpa] : [nomeLimpo, documento, email, tipo]
    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      const operacao = excluir ? 'DELETE' : id ? 'UPDATE' : 'INSERT'
      const sql = excluir ? `DELETE FROM ${tabela} WHERE ${chave}=?`
        : id ? `UPDATE ${tabela} SET ${colunas.map(c => c + '=?').join(',')} WHERE ${chave}=?`
          : `INSERT INTO ${tabela}(${colunas.join(',')}) VALUES (${colunas.map(() => '?').join(',')})`
      const [resultado] = await conn.execute(sql, excluir ? [id] : id ? [...valores, id] : valores)
      if (id && !resultado.affectedRows) throw erro(404, 'NAO_ENCONTRADO', 'Cadastro não encontrado.')
      const identificador = id ?? resultado.insertId
      await conn.execute(
        'INSERT INTO log_auditoria(id_usuario,tabela,operacao,chave_registro,descricao) VALUES (?,?,?,?,?)',
        [req.usuario.idUsuario, tabela, operacao, String(identificador), 'Manutenção de cadastro.'])
      await conn.commit()
      if (excluir) return res.sendStatus(204)
      res.status(id ? 200 : 201).json({ dados: { id: Number(identificador) } })
    } catch (falha) {
      await conn.rollback()
      if (['ER_DUP_ENTRY', 'ER_ROW_IS_REFERENCED_2', 'ER_SIGNAL_EXCEPTION'].includes(falha.code)) {
        throw erro(409, 'CONFLITO', 'O cadastro está duplicado ou possui vínculos que impedem a alteração.')
      }
      throw falha
    } finally {
      conn.release()
    }
  }

  router.get(caminho, consultar)
  router.get(caminho + '/:id', consultar)
  router.post(caminho, gravar)
  router.patch(caminho + '/:id', gravar)
  if (!agencia) router.delete(caminho + '/:id', gravar)
}

export default router
