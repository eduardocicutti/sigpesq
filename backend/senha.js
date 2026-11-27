import { pbkdf2, randomBytes, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const derivar = promisify(pbkdf2)

export async function gerarHash(senha) {
  const sal = randomBytes(16).toString('hex')
  const hash = await derivar(senha, sal, 1_000_000, 32, 'sha256')
  return ['pbkdf2:sha256:1000000', sal, hash.toString('hex')].join('$')
}

export async function verificarSenha(senha, codificado) {
  const partes = /^pbkdf2:sha256:(\d{1,8})\$([^$]{1,128})\$([\da-f]{64})$/i.exec(codificado)
  if (!partes) return false
  const iteracoes = Number(partes[1])
  if (iteracoes < 1 || iteracoes > 10_000_000) return false
  const calculado = await derivar(senha, partes[2], iteracoes, 32, 'sha256')
  return timingSafeEqual(calculado, Buffer.from(partes[3], 'hex'))
}
