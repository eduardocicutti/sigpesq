export async function requisicao(caminho, { method = 'GET', dados, signal } = {}) {
  const resposta = await fetch('/api/v1' + caminho, {
    method, signal, credentials: 'same-origin',
    headers: { Accept: 'application/json', ...(method === 'GET' ? {} : { 'X-SIGPesq': '1' }),
      ...(dados === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: dados === undefined ? undefined : JSON.stringify(dados),
  })
  if (resposta.status === 204) return null
  const json = await resposta.json().catch(() => null)
  if (!resposta.ok || !json) {
    const erro = new Error(json?.erro?.mensagem ?? 'Não foi possível consultar a API do SIGPesq.')
    erro.status = resposta.status
    if (resposta.status === 401 && caminho !== '/sessao') window.dispatchEvent(new Event('sessao-expirada'))
    throw erro
  }
  return json
}
