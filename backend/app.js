import express from 'express'
import projetos from './projetos.js'
import cadastros from './cadastros.js'
import consultas from './consultas.js'
import financiamentos from './financiamentos.js'
import producoes from './producoes.js'
import { autenticar, sessao } from './sessao.js'

export const app = express()
app.disable('x-powered-by')
app.use('/api/v1',(req,res,next)=>{
  res.set('Cache-Control','no-store')
  if (['GET','HEAD','OPTIONS'].includes(req.method)) return next()
  const origem = process.env.FRONTEND_ORIGIN || 'http://localhost:5173'
  if (req.get('X-SIGPesq') !== '1' || (req.get('Origin') && req.get('Origin') !== origem))
    return res.status(403).json({erro:{codigo:'ORIGEM',mensagem:'Origem da solicitação inválida.'}})
  next()
})
app.use(express.json({limit:'96kb'}))
app.use('/api/v1/sessao',sessao)
app.use('/api/v1',autenticar,projetos,cadastros,consultas,financiamentos,producoes)
app.use((_req,res)=>res.status(404).json({erro:{codigo:'NAO_ENCONTRADO',mensagem:'Recurso não encontrado.'}}))
app.use((err,_req,res,_next)=>{
  if (err.type === 'entity.parse.failed') return res.status(400).json({erro:{codigo:'JSON_INVALIDO',mensagem:'JSON inválido.'}})
  if (err.type === 'entity.too.large') return res.status(413).json({erro:{codigo:'LIMITE',mensagem:'Solicitação muito grande.'}})
  if (err.status >= 400 && err.status < 500 && err.codigo)
    return res.status(err.status).json({erro:{codigo:err.codigo,mensagem:err.message,campos:err.campos}})
  console.error('Falha na API', err.code ?? err.name)
  res.status(500).json({erro:{codigo:'INTERNO',mensagem:'Não foi possível concluir a solicitação.'}})
})
