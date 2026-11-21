import { useEffect, useRef, useState } from 'react'
import { listarProjetos, obterResumoProjetos } from './services/projetos.js'
import './sigpesq.css'

const perfis = ['Administrador', 'Coordenador', 'Participante', 'Gestor']
const mensagensSecao = {
  Produções: 'Nenhuma produção disponível nesta demonstração.',
  Financiamentos: 'Nenhum financiamento disponível nesta demonstração.',
}

export default function App() {
  const [perfil, setPerfil] = useState('')
  const [selecionado, setSelecionado] = useState(perfis[0])
  const [pagina, setPagina] = useState('Painel')
  const [busca, setBusca] = useState('')
  const [termo, setTermo] = useState('')
  const [projeto, setProjeto] = useState(null)
  const [aba, setAba] = useState('Equipe')
  const [numeroPagina, setNumeroPagina] = useState(1)
  const [resultado, setResultado] = useState(null)
  const [resumo, setResumo] = useState({})
  const [tentativa, setTentativa] = useState(0)
  const titulo = useRef(null)
  const campoBusca = useRef(null)
  const chave = JSON.stringify([perfil, termo, numeroPagina, tentativa])
  const atual = resultado?.chave === chave ? resultado : null
  const carregando = !atual
  const erro = atual?.erro
  const visiveis = atual?.lista?.dados ?? []
  const total = atual?.lista?.paginacao.total ?? 0

  useEffect(() => {
    titulo.current?.focus()
  }, [perfil, pagina, projeto])

  useEffect(() => {
    if (!perfil) return
    let ativo = true
    listarProjetos({ busca: termo, pagina: numeroPagina })
      .then((lista) => { if (ativo) setResultado({ chave, lista }) })
      .catch(() => { if (ativo) setResultado({ chave, erro: 'Não foi possível carregar os projetos.' }) })
    return () => { ativo = false }
  }, [chave, perfil, termo, numeroPagina])

  useEffect(() => {
    if (!perfil || pagina !== 'Painel') return
    let ativo = true
    obterResumoProjetos()
      .then(({ dados }) => { if (ativo) setResumo(dados) })
      .catch(() => { if (ativo) setResumo({}) })
    return () => { ativo = false }
  }, [perfil, pagina, tentativa])

  function buscar(valor) {
    setNumeroPagina(1)
    setTermo(valor.trim())
  }

  function navegar(destino) {
    setPagina(destino)
    setProjeto(null)
    setBusca('')
    buscar('')
  }

  if (!perfil) return (
    <main className="acesso">
      <form className="cartao entrada" onSubmit={(evento) => { evento.preventDefault(); setPerfil(selecionado); navegar('Painel') }}>
        <h1 ref={titulo} tabIndex={-1}>Demonstração do SIGPesq</h1>
        <p>Escolha um perfil para consultar projetos fictícios.</p>
        <label htmlFor="perfil">Perfil</label>
        <select id="perfil" value={selecionado} onChange={(evento) => setSelecionado(evento.target.value)}>
          {perfis.map((item) => <option key={item}>{item}</option>)}
        </select>
        <button className="primario">Entrar</button>
      </form>
    </main>
  )

  const painel = pagina === 'Painel'
  return (
    <>
      <header className="topo">
        <button className="marca" onClick={() => navegar('Painel')}>SIGPesq</button>
        <span className="identidade">{perfil} · Demonstração</span>
        <button onClick={() => { setPerfil(''); setResultado(null); setResumo({}) }}>Sair</button>
      </header>
      <div className="estrutura">
        <nav aria-label="Navegação principal">
          {['Painel', 'Projetos'].map((item) => (
            <button key={item} aria-current={pagina === item ? 'page' : undefined} onClick={() => navegar(item)}>{item}</button>
          ))}
        </nav>
        <main className="conteudo">
          <h1 ref={titulo} tabIndex={-1}>{projeto?.titulo ?? pagina}</h1>
          {projeto ? (
            <>
              <button onClick={() => setProjeto(null)}>Voltar para projetos</button>
              <dl className="cartao dados">
                <div><dt>Código</dt><dd>{projeto.codigo}</dd></div>
                <div><dt>Coordenação</dt><dd>{projeto.coordenador || 'Não informada'}</dd></div>
                <div><dt>Situação</dt><dd>{rotularSituacao(projeto.situacao)}</dd></div>
              </dl>
              <section className="cartao">
                <div className="abas" role="group" aria-label="Seções do projeto">
                  {['Equipe', 'Produções', ...(['Administrador', 'Gestor'].includes(perfil) ? ['Financiamentos'] : [])].map((item) =>
                    <button key={item} aria-pressed={aba === item} onClick={() => setAba(item)}>{item}</button>,
                  )}
                </div>
                <p aria-live="polite">{aba === 'Equipe' ? (projeto.coordenador || 'Coordenação não informada.') : mensagensSecao[aba]}</p>
              </section>
            </>
          ) : (
            <>
              {painel && <div className="resumo">
                {['Em andamento', 'Concluído'].map((situacao) => <div key={situacao}><span>{situacao === 'Concluído' ? 'Concluídos' : situacao}</span><strong>{resumo[situacao] ?? '—'}</strong></div>)}
              </div>}
              <section className="cartao">
                {painel ? <h2>Projetos de demonstração</h2> : (
                  <form className="filtro" onSubmit={(evento) => { evento.preventDefault(); buscar(busca) }}>
                    <label htmlFor="busca">Código ou título</label>
                    <input ref={campoBusca} id="busca" type="search" value={busca} onChange={(evento) => setBusca(evento.target.value)} />
                    <button type="submit">Buscar</button>
                    {termo && <button type="button" onClick={() => { setBusca(''); buscar(''); campoBusca.current?.focus() }}>Limpar busca</button>}
                  </form>
                )}
                {carregando ? <p role="status">Carregando projetos…</p> : erro ? <div><p role="alert">{erro}</p><button onClick={() => setTentativa((valor) => valor + 1)}>Tentar novamente</button></div> : visiveis.length ? <div className="tabela" tabIndex={0} role="region" aria-label="Tabela de projetos"><table>
                  <thead><tr><th scope="col">Projeto</th><th scope="col">Coordenação</th><th scope="col">Término</th><th scope="col">Situação</th></tr></thead>
                  <tbody>
                    {visiveis.map((item) => <tr key={item.codigo}>
                      <td><button className="link" onClick={() => { setPagina('Projetos'); setProjeto(item); setAba('Equipe') }}>{item.titulo}</button><small>{item.codigo}</small></td>
                      <td>{item.coordenador || 'Não informado'}</td><td>{formatarData(item.dataTermino)}</td><td>{rotularSituacao(item.situacao)}</td>
                    </tr>)}
                  </tbody>
                </table></div> : <p role="status">{termo ? 'Nenhum projeto corresponde à busca. Altere ou limpe o filtro.' : 'Nenhum projeto disponível.'}</p>}
                {atual?.lista && total > atual.lista.paginacao.tamanho && !painel && (
                  <div className="paginacao" role="group" aria-label="Paginação de projetos">
                    <button disabled={numeroPagina === 1} onClick={() => { titulo.current?.focus(); setNumeroPagina(numeroPagina - 1) }}>Anterior</button>
                    <span role="status">Página {numeroPagina} de {Math.ceil(total / atual.lista.paginacao.tamanho)}</span>
                    <button disabled={numeroPagina * atual.lista.paginacao.tamanho >= total} onClick={() => { titulo.current?.focus(); setNumeroPagina(numeroPagina + 1) }}>Próxima</button>
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </>
  )
}

function rotularSituacao(situacao) {
  return ({ EM_ANDAMENTO: 'Em andamento', CONCLUIDO: 'Concluído', CANCELADO: 'Cancelado' })[situacao] ?? 'Não informada'
}

function formatarData(data) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return 'Não informado'
  return data.split('-').reverse().join('/')
}
