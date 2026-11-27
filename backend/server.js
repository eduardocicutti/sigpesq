import { app } from './app.js'
import { pool } from './db.js'

const porta = Number(process.env.PORT || 3001)
await pool.query('SELECT 1')
const servidor = app.listen(porta,()=>console.log('SIGPesq API na porta',porta))
for (const sinal of ['SIGINT','SIGTERM']) {
  process.once(sinal,()=>servidor.close(()=>pool.end()))
}
