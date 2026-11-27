import { Router } from 'express'
import { pool } from './db.js'

const router = Router()
const consultas = {
  RF13: ['id', 'SELECT codigo_publico AS Código,titulo AS Título,situacao AS Situação FROM projeto WHERE id_coordenador=? ORDER BY codigo'],
  RF14: ['codigo', `SELECT a.nome AS Nome,v.funcao AS Função,v.data_entrada AS Entrada,v.data_saida AS Saída
    FROM participacao v JOIN participante a USING(id_participante) JOIN projeto p ON p.codigo=v.codigo_projeto
    WHERE p.codigo_publico=? ORDER BY v.data_entrada,a.nome`],
  RF15: ['codigo', `SELECT c.titulo AS Título,c.tipo AS Tipo,c.ano_publicacao AS Ano,c.meio_divulgacao AS Divulgação
    FROM producao_cientifica c JOIN producao_projeto v USING(id_producao)
    JOIN projeto p ON p.codigo=v.codigo_projeto WHERE p.codigo_publico=? ORDER BY c.titulo`],
  RF16: ['id', `SELECT id_financiamento AS Identificador,tipo_fomento AS Fomento,valor_total AS Valor,
    data_inicio_vigencia AS Início,data_fim_vigencia AS Fim FROM financiamento WHERE id_agencia=? ORDER BY id_financiamento`],
  RF17: [null, `SELECT p.codigo_publico AS Código,p.titulo AS Título,a.nome AS Coordenador
    FROM projeto p JOIN participante a ON a.id_participante=p.id_coordenador ORDER BY p.codigo`],
  RF18: ['ano', 'SELECT titulo AS Título,tipo AS Tipo,ano_publicacao AS Ano FROM producao_cientifica WHERE ano_publicacao=? AND (? IS NULL OR tipo=?) ORDER BY titulo'],
  RF19: [null, `SELECT a.sigla AS Agência,COALESCE(SUM(f.valor_total),0) AS Total
    FROM agencia_financiadora a LEFT JOIN financiamento f USING(id_agencia)
    GROUP BY a.id_agencia,a.sigla ORDER BY Total DESC,a.sigla`],
  RF20: ['recorte', `SELECT a.nome AS Participante,COUNT(DISTINCT v.codigo_projeto) AS Projetos
    FROM participante a JOIN participacao v USING(id_participante)
    WHERE (?='historico' OR (v.data_entrada<=? AND (v.data_saida IS NULL OR v.data_saida>=?)))
    GROUP BY a.id_participante,a.nome HAVING Projetos>1 ORDER BY Projetos DESC,a.nome`],
}

router.get('/consultas/:codigo', async (req, res) => {
  const { codigo } = req.params
  if (!Object.hasOwn(consultas, codigo)) return res.status(404).json({ erro:{mensagem:'Consulta não encontrada.'} })
  const { perfil } = req.usuario
  if ((codigo === 'RF16' && !['Administrador', 'Gestor'].includes(perfil)) ||
      (['RF17','RF18','RF19','RF20'].includes(codigo) && perfil !== 'Gestor')) {
    return res.status(403).json({ erro:{mensagem:'Seu perfil não pode executar esta consulta.'} })
  }
  const [campo, sql] = consultas[codigo]
  const filtro = campo ? req.query[campo] : null
  if ((campo && (typeof filtro !== 'string' || !filtro.trim() || filtro.length > 20))
      || (['id','ano'].includes(campo) && (!/^\d+$/.test(filtro) || Number(filtro) < 1 || Number(filtro) > (campo === 'ano' ? 65535 : 4294967295)))
      || (campo === 'recorte' && !['ativo','historico'].includes(filtro))
      || (codigo === 'RF18' && req.query.tipo !== undefined && (typeof req.query.tipo !== 'string' || !['ARTIGO','CAPITULO_LIVRO','LIVRO','SOFTWARE','RELATORIO_TECNICO','OUTRO'].includes(req.query.tipo)))) {
    return res.status(422).json({ erro:{mensagem:'Revise os filtros da consulta.'} })
  }
  const hoje = new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date())
  const tipo = req.query.tipo ?? null
  const parametros = codigo === 'RF18' ? [Number(filtro),tipo,tipo] : codigo === 'RF20' ? [filtro,hoje,hoje] : campo ? [filtro] : []
  const [dados] = await pool.execute(sql, parametros)
  res.json({ dados })
})

router.get('/auditoria', async (req, res) => {
  if (req.usuario.perfil !== 'Administrador') return res.status(403).json({ erro:{mensagem:'A auditoria é exclusiva do Administrador.'} })
  const [dados] = await pool.execute(`SELECT l.id_log AS ID,l.data_hora AS Data,u.login AS Usuário,l.tabela AS Tabela,
    l.operacao AS Operação,l.chave_registro AS Registro,l.descricao AS Descrição
    FROM log_auditoria l JOIN usuario u USING(id_usuario) ORDER BY l.id_log DESC LIMIT 100`)
  res.json({ dados })
})

export default router
