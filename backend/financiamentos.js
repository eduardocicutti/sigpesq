import { Router } from 'express'
import { pool } from './db.js'

const router = Router()
const erro = (status, message) => Object.assign(new Error(message), {status, codigo: status === 409 ? 'CONFLITO' : 'FINANCIAMENTO'})
const tipos = new Set(['BOLSA','AUXILIO','CONVENIO','OUTRO'])
const idValido = v => ['string','number'].includes(typeof v) && /^\d+$/.test(v) && Number(v) > 0 && Number(v) <= 4294967295
function dinheiro(v) {
  const valor = typeof v === 'string' ? v.replace(',', '.') : ''
  if (!/^\d{1,13}(\.\d{1,2})?$/.test(valor) || Number(valor) <= 0) throw erro(422,'Informe um valor positivo com até duas casas decimais.')
  return valor
}
function data(v) {
  if (typeof v !== 'string' || !/^[1-9]\d{3}-\d\d-\d\d$/.test(v)) return false
  const d = new Date(v + 'T00:00:00Z')
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10) === v
}
router.use('/financiamentos', (req,res,next) => {
  const permitidos = req.method === 'GET' ? ['Administrador','Gestor'] : ['Administrador']
  if (!permitidos.includes(req.usuario.perfil)) return next(erro(403,'Seu perfil não pode realizar esta operação.'))
  if (req.query.agencia !== undefined && !idValido(req.query.agencia)) return next(erro(422,'Agência inválida.'))
  next()
})
router.get('/financiamentos', async (req,res) => {
  const agencia = req.query.agencia
  const [dados] = await pool.execute(`SELECT f.id_financiamento AS id,a.nome AS agencia,f.id_agencia AS idAgencia,f.tipo_fomento AS tipoFomento,
    f.valor_total AS valorTotal,f.data_inicio_vigencia AS dataInicioVigencia,f.data_fim_vigencia AS dataFimVigencia,
    f.valor_total-COALESCE(v.destinado,0) AS saldo FROM financiamento f JOIN agencia_financiadora a USING(id_agencia)
    LEFT JOIN (SELECT id_financiamento,SUM(valor_destinado) AS destinado FROM financiamento_projeto GROUP BY id_financiamento) v USING(id_financiamento)
    ${agencia ? 'WHERE f.id_agencia=?' : ''} ORDER BY f.id_financiamento DESC`,agencia ? [agencia] : [])
  res.json({dados})
})
router.get('/financiamentos/:id/apoios', async (req,res) => {
  if (!idValido(req.params.id)) throw erro(422,'Financiamento inválido.')
  const [dados] = await pool.execute(`SELECT p.codigo_publico AS codigo,p.titulo,f.valor_destinado AS valor
    FROM financiamento_projeto f JOIN projeto p ON p.codigo=f.codigo_projeto WHERE f.id_financiamento=? ORDER BY p.codigo`,[req.params.id])
  res.json({dados})
})

async function gravar(req,res,apoio = false) {
  const {id,codigo} = req.params
  if (id && !idValido(id)) throw erro(422,'Financiamento inválido.')
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    if (id) {
      const [[item]] = await conn.execute('SELECT id_financiamento FROM financiamento WHERE id_financiamento=? FOR UPDATE',[id])
      if (!item) throw erro(404,'Financiamento não encontrado.')
    }
    let registro = id
    let tabela = 'financiamento'
    const operacao = req.method === 'DELETE' ? 'DELETE' : req.method === 'PATCH' ? 'UPDATE' : 'INSERT'
    if (apoio) {
      tabela = 'financiamento_projeto'
      const codigoPublico = codigo ?? req.body?.codigo
      if (typeof codigoPublico !== 'string' || !codigoPublico.trim() || codigoPublico.length > 20) throw erro(422,'Informe o código público do projeto.')
      const [[projeto]] = await conn.execute('SELECT codigo FROM projeto WHERE codigo_publico=?',[codigoPublico])
      if (!projeto) throw erro(404,'Projeto não encontrado.')
      if (codigo) {
        const [r] = await conn.execute('DELETE FROM financiamento_projeto WHERE id_financiamento=? AND codigo_projeto=?',[id,projeto.codigo])
        if (!r.affectedRows) throw erro(404,'Apoio não encontrado.')
      } else await conn.execute('INSERT INTO financiamento_projeto(id_financiamento,codigo_projeto,valor_destinado) VALUES (?,?,?)',
        [id,projeto.codigo,dinheiro(req.body?.valor)])
      registro = id + '/' + projeto.codigo
    } else if (operacao === 'DELETE') {
      await conn.execute('DELETE FROM financiamento WHERE id_financiamento=?',[id])
    } else {
      const {idAgencia,tipoFomento,valorTotal,dataInicioVigencia,dataFimVigencia} = req.body ?? {}
      if (!idValido(idAgencia) || !tipos.has(tipoFomento) || !data(dataInicioVigencia) || !data(dataFimVigencia) || dataFimVigencia < dataInicioVigencia) {
        throw erro(422,'Revise a agência, o tipo e as datas de vigência.')
      }
      const valores = [idAgencia,tipoFomento,dinheiro(valorTotal),dataInicioVigencia,dataFimVigencia]
      if (id) await conn.execute('UPDATE financiamento SET id_agencia=?,tipo_fomento=?,valor_total=?,data_inicio_vigencia=?,data_fim_vigencia=? WHERE id_financiamento=?',[...valores,id])
      else {
        const [r] = await conn.execute('INSERT INTO financiamento(id_agencia,tipo_fomento,valor_total,data_inicio_vigencia,data_fim_vigencia) VALUES (?,?,?,?,?)',valores)
        registro = r.insertId
      }
    }
    await conn.execute('INSERT INTO log_auditoria(id_usuario,tabela,operacao,chave_registro,descricao) VALUES (?,?,?,?,?)',
      [req.usuario.idUsuario,tabela,operacao,String(registro),'Manutenção de financiamento.'])
    await conn.commit()
    if (operacao === 'DELETE') return res.sendStatus(204)
    res.status(operacao === 'INSERT' ? 201 : 200).json({dados:{id:Number(id ?? registro)}})
  } catch (falha) {
    await conn.rollback()
    if (falha.code === 'ER_SIGNAL_EXCEPTION') throw erro(409,'O valor ultrapassa o saldo disponível ou fica abaixo do total destinado.')
    if (falha.code === 'ER_DUP_ENTRY') throw erro(409,'Este projeto já está vinculado ao financiamento.')
    if (falha.code === 'ER_ROW_IS_REFERENCED_2') throw erro(409,'Remova os apoios antes de excluir o financiamento.')
    if (falha.code === 'ER_NO_REFERENCED_ROW_2') throw erro(422,'Agência ou projeto não encontrado.')
    throw falha
  } finally { conn.release() }
}
router.post('/financiamentos',(req,res) => gravar(req,res))
router.patch('/financiamentos/:id',(req,res) => gravar(req,res))
router.delete('/financiamentos/:id',(req,res) => gravar(req,res))
router.post('/financiamentos/:id/apoios',(req,res) => gravar(req,res,true))
router.delete('/financiamentos/:id/apoios/:codigo',(req,res) => gravar(req,res,true))
export default router
