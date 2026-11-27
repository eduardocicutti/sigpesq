import { useEffect, useState } from 'react'
import ProjetoForm from './ProjetoForm.jsx'
import { requisicao } from './services/api.js'
import { situacoes } from './services/projetos.js'
import './sigpesq.css'

const caminhoAtual = () => location.pathname + location.search
const dataLocal = data => data ? data.split('-').reverse().join('/') : 'Em aberto'

function useConsulta(caminho) {
  const [resultado, setResultado] = useState(null)
  const [tentativa, repetir] = useState(0)
  useEffect(() => {
    if (!caminho) return
    const controle = new AbortController()
    requisicao(caminho, { signal: controle.signal }).then(json => {
      if (!controle.signal.aborted) setResultado({ caminho, json })
    }).catch(erro => {
      if (!controle.signal.aborted) setResultado({ caminho, erro })
    })
    return () => controle.abort()
  }, [caminho, tentativa])
  return { ...(resultado?.caminho === caminho ? resultado : {}), tentar: () => {
    setResultado(null)
    repetir(n => n + 1)
  } }
}

function Estado({ consulta }) {
  return consulta.erro ? <div role="alert">{consulta.erro.message} <button onClick={consulta.tentar}>Tentar novamente</button></div>
    : <p role="status">Carregando…</p>
}

function Login({ entrar }) {
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [visivel, setVisivel] = useState(false)
  async function autenticar(evento) {
    evento.preventDefault()
    const dados = Object.fromEntries(new FormData(evento.currentTarget))
    setErro('')
    setOcupado(true)
    try { entrar((await requisicao('/sessao', { method: 'POST', dados })).dados) }
    catch (falha) { setErro(falha.message) }
    finally { setOcupado(false) }
  }
  return <main className="acesso"><form className="cartao entrada" onSubmit={autenticar}>
    <h1>Entrar no SIGPesq</h1>
    <label htmlFor="login">Login</label><input id="login" name="login" autoComplete="username" maxLength={40} required />
    <label htmlFor="senha">Senha</label><div className="campo-senha">
      <input id="senha" name="senha" type={visivel ? 'text' : 'password'} autoComplete="current-password" required />
      <button type="button" aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'} aria-controls="senha" onClick={() => setVisivel(!visivel)}>
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>{visivel && <path d="m3 3 18 18"/>}</svg>
      </button></div>
    {erro && <p role="alert">{erro}</p>}<button className="primario" disabled={ocupado}>Entrar</button>
  </form></main>
}

export default function ProjetosApi() {
  const [usuario, setUsuario] = useState(null)
  const [iniciando, setIniciando] = useState(true)
  const [erro, setErro] = useState('')
  const [tentativa, repetir] = useState(0)
  useEffect(() => {
    const controle = new AbortController()
    requisicao('/sessao', { signal: controle.signal })
      .then(json => { if (!controle.signal.aborted) setUsuario(json.dados) })
      .catch(falha => { if (!controle.signal.aborted && falha.status !== 401) setErro(falha.message) })
      .finally(() => { if (!controle.signal.aborted) setIniciando(false) })
    const expirar = () => setUsuario(null)
    window.addEventListener('sessao-expirada', expirar)
    return () => { controle.abort(); window.removeEventListener('sessao-expirada', expirar) }
  }, [tentativa])
  if (iniciando || erro) return <main className="acesso"><Estado consulta={{erro: erro && {message:erro}, tentar: () => {setErro(''); setIniciando(true); repetir(n => n+1)} }} /></main>
  if (!usuario) return <Login entrar={setUsuario} />
  return <AreaProjetos usuario={usuario} sair={() => setUsuario(null)} />
}

function AreaProjetos({ usuario, sair }) {
  const [rota, setRota] = useState(caminhoAtual)
  const [erro, setErro] = useState('')
  useEffect(() => {
    const voltar = () => setRota(caminhoAtual())
    window.addEventListener('popstate', voltar)
    return () => window.removeEventListener('popstate', voltar)
  }, [])
  function navegar(destino) {
    history.pushState(null,'',destino)
    setRota(caminhoAtual())
  }
  async function encerrar() {
    try { await requisicao('/sessao', {method:'DELETE'}); history.replaceState(null,'','/'); sair() }
    catch (falha) { if (falha.status === 401) sair(); else setErro(falha.message) }
  }
  const [path, query] = rota.split('?')
  const criar = ['Administrador','Coordenador'].includes(usuario.perfil)
  const lista = ['/', '/login','/projetos','/projetos/'].includes(path)
  const novo = path === '/projetos/novo'
  const detalhe = !novo && /^\/projetos\/[^/]+$/.test(path)
  const consulta = useConsulta(lista ? '/projetos?' + (query ?? '') : detalhe ? path :
    novo && usuario.perfil === 'Administrador' ? '/docentes' : null)
  const params = new URLSearchParams(query)
  const titulo = lista ? 'Projetos' : novo ? 'Novo projeto' : detalhe ? 'Detalhes do projeto' : 'Página indisponível'
  return <><header className="topo"><button className="marca" onClick={() => navegar('/projetos')}>SIGPesq</button>
    <span className="identidade">{usuario.login} · {usuario.perfil}</span><button onClick={encerrar}>Sair</button></header>
    <div className="estrutura"><nav aria-label="Navegação principal"><button aria-current="page" onClick={() => navegar('/projetos')}>Projetos</button></nav>
    <main className="conteudo"><h1>{titulo}</h1>{erro && <p role="alert">{erro}</p>}
    {lista ? <section className="cartao">
      {criar && <button className="primario" onClick={() => navegar('/projetos/novo')}>Novo projeto</button>}
      <form key={params.get('busca') ?? ''} className="filtro" onSubmit={e => {
        e.preventDefault(); const busca = String(new FormData(e.currentTarget).get('busca')).trim()
        navegar('/projetos?' + new URLSearchParams(busca ? {busca} : {}))
      }}><label htmlFor="busca">Título ou código</label><input id="busca" name="busca" type="search" defaultValue={params.get('busca') ?? ''}/><button>Buscar</button></form>
      {consulta.json ? <Lista resposta={consulta.json} abrir={codigo => navegar('/projetos/' + encodeURIComponent(codigo))} paginar={pagina => {
        params.set('pagina', pagina); navegar('/projetos?' + params)
      }} /> : <Estado consulta={consulta}/>}
    </section> : novo && criar ? usuario.perfil === 'Administrador' && !consulta.json ? <Estado consulta={consulta}/> :
      <ProjetoForm modo="novo" perfil={usuario.perfil} opcoesDocentes={Object.fromEntries((consulta.json?.dados ?? []).map(p => [p.idParticipante,p.nome]))}
        nomeCoordenador={usuario.nomeParticipante ?? usuario.login} cancelar={() => navegar('/projetos')} salvar={async dados => {
          if (dados.idCoordenador) dados.idCoordenador = Number(dados.idCoordenador)
          const json = await requisicao('/projetos',{method:'POST',dados})
          navegar('/projetos/' + encodeURIComponent(json.dados.codigo))
        }} /> : detalhe ? consulta.json ? <Detalhe projeto={consulta.json.dados}/> : <Estado consulta={consulta}/> :
      <p role="alert">{novo ? 'Seu perfil não pode cadastrar projetos.' : 'Esta página não está disponível no modo integrado.'}</p>}
    {!lista && !novo && <button onClick={() => navegar('/projetos')}>Voltar aos projetos</button>}
    </main></div></>
}

function Lista({resposta, abrir, paginar}) {
  const {dados, paginacao:{pagina,tamanho,total}} = resposta
  if (!dados.length) return <p>Nenhum projeto encontrado.</p>
  return <><div className="tabela"><table><thead><tr><th>Código</th><th>Título</th><th>Coordenação</th><th>Situação</th></tr></thead>
    <tbody>{dados.map(p => <tr key={p.idProjeto}><td>{p.codigo}</td><td><button className="link" onClick={() => abrir(p.codigo)}>{p.titulo}</button></td>
    <td>{p.coordenador}</td><td>{situacoes[p.situacao]}</td></tr>)}</tbody></table></div>
    {total > tamanho && <div className="paginacao"><button disabled={pagina<=1} onClick={() => paginar(pagina-1)}>Anterior</button>
    <span>Página {pagina}</span><button disabled={pagina*tamanho>=total} onClick={() => paginar(pagina+1)}>Próxima</button></div>}</>
}

function Detalhe({projeto:p}) {
  return <section className="cartao"><h2>{p.titulo}</h2><p>{p.descricao}</p><dl className="dados">
    {Object.entries({'Código':p.codigo,'Coordenação':p.coordenador,'Situação':situacoes[p.situacao],'Início':dataLocal(p.dataInicio),'Término':dataLocal(p.dataTermino)})
      .map(([rotulo,valor]) => <div key={rotulo}><dt>{rotulo}</dt><dd>{valor}</dd></div>)}</dl>
    <h2>Equipe</h2><ul>{p.equipe.map(v => <li key={v.idParticipante + '/' + v.dataEntrada}>{v.nome} · {v.funcao.toLowerCase().replaceAll('_',' ')} · {dataLocal(v.dataEntrada)} a {dataLocal(v.dataSaida)}</li>)}</ul></section>
}
