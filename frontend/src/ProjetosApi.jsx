import { useEffect, useState } from 'react'
import ProjetoForm from './ProjetoForm.jsx'
import { requisicao } from './services/api.js'
import { CampoCpf, CampoValor } from './Campos.jsx'
import { situacoes } from './services/projetos.js'
import { funcoesEquipe } from './services/projetos.js'
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
  const cadastro = /^\/(participantes|agencias)$/.exec(path)?.[1]
  const relatorio = path === '/consultas' || path === '/auditoria'
  const criar = ['Administrador','Coordenador'].includes(usuario.perfil)
  const painel = ['/', '/login','/painel'].includes(path)
  const lista = ['/projetos','/projetos/'].includes(path)
  const novo = path === '/projetos/novo'
  const detalhe = !novo && /^\/projetos\/[^/]+(?:\/(editar|situacao))?$/.exec(path)
  const modo = detalhe?.[1]
  const recurso = detalhe && path.split('/').slice(0, 3).join('/')
  const consulta = useConsulta(lista ? '/projetos?' + (query ?? '') : detalhe ? recurso :
    novo && usuario.perfil === 'Administrador' ? '/docentes' : null)
  const projeto = detalhe ? consulta.json?.dados : null
  const coordena = projeto && usuario.perfil === 'Coordenador' && usuario.idParticipante === projeto.idCoordenador
  const podeEditar = coordena || usuario.perfil === 'Administrador'
  const params = new URLSearchParams(query)
  const titulo = lista ? 'Projetos' : novo ? 'Novo projeto' : detalhe ? 'Detalhes do projeto' : 'Página indisponível'
  return <><header className="topo"><button className="marca" onClick={() => navegar('/projetos')}>SIGPesq</button>
    <span className="identidade">{usuario.login} · {usuario.perfil}</span><button onClick={encerrar}>Sair</button></header>
    <div className="estrutura"><nav aria-label="Navegação principal">
      <button aria-current={painel ? 'page' : undefined} onClick={() => navegar('/')}>Painel</button>
      <button aria-current={lista || novo || detalhe ? 'page' : undefined} onClick={() => navegar('/projetos')}>Projetos</button>
      <button aria-current={cadastro === 'participantes' ? 'page' : undefined} onClick={() => navegar('/participantes')}>Participantes</button>
      <button aria-current={cadastro === 'agencias' ? 'page' : undefined} onClick={() => navegar('/agencias')}>Agências</button>
      <button aria-current={path === '/consultas' ? 'page' : undefined} onClick={() => navegar('/consultas')}>Consultas</button>
      <button onClick={() => navegar('/producoes')}>Produções</button>
      {['Administrador','Gestor'].includes(usuario.perfil) && <button onClick={() => navegar('/financiamentos')}>Financiamentos</button>}
      {usuario.perfil === 'Administrador' && <button aria-current={path === '/auditoria' ? 'page' : undefined} onClick={() => navegar('/auditoria')}>Auditoria</button>}
    </nav>
    {painel ? <PainelApi usuario={usuario} navegar={navegar}/> :
    path === '/producoes' ? <ProducoesApi usuario={usuario}/> :
    path === '/financiamentos' ? <FinanciamentosApi admin={usuario.perfil === 'Administrador'}/> :
    relatorio ? <RelatoriosApi key={path} auditoria={path === '/auditoria'} perfil={usuario.perfil}/> :
    cadastro ? <CadastrosApi key={cadastro} modulo={cadastro} admin={usuario.perfil === 'Administrador'} /> :
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
        }} /> : detalhe ? !projeto ? <Estado consulta={consulta}/> : modo ? (
          (modo === 'situacao' ? coordena : podeEditar) ? <ProjetoForm key={path} modo={modo} perfil={usuario.perfil}
            projeto={projeto} cancelar={() => navegar(recurso)} salvar={async dados => {
              await requisicao(recurso + (modo === 'situacao' ? '/situacao' : ''), {method:'PATCH', dados})
              consulta.tentar()
              navegar(recurso)
            }} /> : <p role="alert">Seu perfil não pode alterar este projeto.</p>
        ) : <>
          {podeEditar && <button onClick={() => navegar(recurso + '/editar')}>Editar projeto</button>}
          {coordena && <button onClick={() => navegar(recurso + '/situacao')}>Alterar situação</button>}
          {podeEditar && <button onClick={async () => {
            if (!window.confirm('Excluir este projeto?')) return
            try { setErro(''); await requisicao(recurso, {method:'DELETE'}); navegar('/projetos') }
            catch (falha) { setErro(falha.message) }
          }}>Excluir projeto</button>}
          <Detalhe projeto={projeto}/>
          {usuario.perfil === 'Administrador' && <TrocaCoordenacao key={recurso} recurso={recurso} projeto={projeto} atualizar={consulta.tentar}/>}
          {coordena && <GestaoEquipe key={recurso} recurso={recurso} equipe={projeto.equipe} atualizar={consulta.tentar}/>}
        </> :
      <p role="alert">{novo ? 'Seu perfil não pode cadastrar projetos.' : 'Esta página não está disponível no modo integrado.'}</p>}
    {!lista && !novo && <button onClick={() => navegar('/projetos')}>Voltar aos projetos</button>}
    </main>}</div></>
}

function PainelApi({usuario,navegar}) {
  const consulta = useConsulta('/painel')
  const dados = consulta.json?.dados
  return <main className="conteudo"><h1>Painel</h1>
    {usuario.perfil === 'Coordenador' && <p>Projetos sob sua coordenação.</p>}
    <div className="abas">
      <button onClick={() => navegar('/projetos')}>Ver projetos</button>
      {['Administrador','Coordenador'].includes(usuario.perfil) && <button className="primario" onClick={() => navegar('/projetos/novo')}>Novo projeto</button>}
    </div>
    {!dados ? <Estado consulta={consulta}/> : <>
      <section className="cartao"><h2>Projetos por situação</h2>
        <dl className="dados">{Object.entries(situacoes).map(([codigo,rotulo]) => <div key={codigo}>
          <dt>{rotulo}</dt><dd>{dados.situacoes[codigo] ?? 0}</dd>
        </div>)}</dl>
      </section>
      <section className="cartao"><h2>Próximos términos</h2><p>Até 10 projetos em andamento com término previsto nos próximos 90 dias.</p>
        {!dados.proximos.length ? <p>Nenhum projeto nesse período.</p> : <ul>{dados.proximos.map(p => <li key={p.idProjeto}>
          <button className="link" onClick={() => navegar('/projetos/' + encodeURIComponent(p.codigo))}>{p.titulo}</button> · {dataLocal(p.dataTermino)}
        </li>)}</ul>}
      </section>
    </>}
  </main>
}

function ProducoesApi({usuario}) {
  const lista = useConsulta('/producoes')
  const mantenedor = usuario.perfil === 'Coordenador'
  const [item, editar] = useState(null)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const pessoas = useConsulta(item ? '/participantes' : null)
  const projetos = useConsulta(item ? '/projetos?idCoordenador=' + usuario.idParticipante + '&tamanho=100' : null)
  const [autores,setAutores] = useState([])
  function abrir(p) { setErro(''); setAutores(p?.autores?.map(a => a.participante) ?? []); editar(p) }
  async function gravar(method,id,dados) {
    setOcupado(true);setErro('')
    try {
      await requisicao('/producoes' + (id ? '/' + id : ''),{method,dados})
      abrir(null);lista.tentar()
    } catch (falha) { setErro(falha.message) }
    finally { setOcupado(false) }
  }
  return <main className="conteudo"><h1>Produções</h1>
    {erro && <p role="alert">{erro}</p>}
    {mantenedor && <button onClick={() => abrir({})} disabled={ocupado}>Nova produção</button>}
    {item && <section className="cartao">
      {(!pessoas.json || !projetos.json) ? <Estado consulta={!pessoas.json ? pessoas : projetos}/> :
        <form className="projeto-form" onSubmit={evento => {
          evento.preventDefault()
          const form = new FormData(evento.currentTarget)
          gravar(item.id ? 'PATCH' : 'POST',item.id,{...Object.fromEntries(form),projetos:form.getAll('projetos'),autores})
        }}>
          <fieldset disabled={ocupado} className="projeto-form__campos">
            <label className="projeto-form__campo">Título<input name="titulo" maxLength={250} defaultValue={item.titulo} required/></label>
            <label className="projeto-form__campo">Tipo<select name="tipo" defaultValue={item.tipo}>
              {['ARTIGO','CAPITULO_LIVRO','LIVRO','SOFTWARE','RELATORIO_TECNICO','OUTRO'].map(t => <option key={t} value={t}>{t.replaceAll('_',' ')}</option>)}
            </select></label>
            <label className="projeto-form__campo">Ano<input name="ano" type="number" min="1" max="65535" defaultValue={item.ano} required/></label>
            <label className="projeto-form__campo">Meio de divulgação<input name="meio" maxLength={200} defaultValue={item.meio} required/></label>
            <fieldset><legend>Projetos</legend>{projetos.json.dados.map(p => <label key={p.idProjeto}>
              <input name="projetos" type="checkbox" value={p.idProjeto} defaultChecked={item.projetos?.some(x => x.codigo === p.codigo)}/>{p.titulo}
            </label>)}</fieldset>
            <fieldset><legend>Autores na ordem de publicação</legend>
              <label>Adicionar autor <select value="" onChange={e => {if(e.target.value) setAutores([...autores,Number(e.target.value)])}}>
                <option value="">Selecione</option>{pessoas.json.dados.filter(p => !autores.includes(p.id)).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select></label>
              <ol>{autores.map((id,i) => <li key={id}>{pessoas.json.dados.find(p => p.id === id)?.nome}
                <button type="button" disabled={!i} onClick={() => {
                  const ordem = [...autores]; [ordem[i-1],ordem[i]] = [ordem[i],ordem[i-1]]; setAutores(ordem)
                }}>Subir</button>
                <button type="button" onClick={() => setAutores(autores.filter(a => a !== id))}>Remover</button>
              </li>)}</ol>
            </fieldset>
            <button type="button" onClick={() => abrir(null)}>Cancelar</button><button className="primario">Salvar produção</button>
          </fieldset>
        </form>}
    </section>}
    {!lista.json ? <Estado consulta={lista}/> : <section className="cartao">
      {!lista.json.dados.length && <p>Nenhuma produção encontrada.</p>}
      <ul>{lista.json.dados.map(p => <li key={p.id}><strong>{p.titulo}</strong> · {p.ano} · {p.meio}
        <p>Projetos: {p.projetos.map(v => v.codigo).join(', ')}</p>
        <p>Autores: {p.autores.map(a => a.nome).join(', ')}</p>
        {mantenedor && p.projetos.length>0 && p.projetos.every(v => v.coordenador===usuario.idParticipante) && <div className="abas">
          <button disabled={ocupado} onClick={() => abrir(p)}>Editar</button>
          <button disabled={ocupado} onClick={() => {if(window.confirm('Excluir esta produção?')) gravar('DELETE',p.id)}}>Excluir</button>
        </div>}
      </li>)}</ul>
    </section>}
  </main>
}

function FinanciamentosApi({ admin }) {
  const lista = useConsulta('/financiamentos')
  const agencias = useConsulta(admin ? '/agencias' : null)
  const [editar,setEditar] = useState(null)
  const [selecionado,selecionar] = useState(null)
  const [erro,setErro] = useState('')
  const [ocupado,setOcupado] = useState(false)
  const [versaoApoio,setVersaoApoio] = useState(0)
  const caminho = selecionado ? '/financiamentos/' + selecionado + '/apoios' : null
  const apoios = useConsulta(caminho)
  async function gravar(url, method, dados) {
    setOcupado(true); setErro('')
    try {
      await requisicao(url,{method,dados})
      setEditar(null)
      lista.tentar()
      if (selecionado) apoios.tentar()
      return true
    } catch (falha) { setErro(falha.message); return false }
    finally { setOcupado(false) }
  }
  return <main className="conteudo"><h1>Financiamentos</h1>
    {erro && <p role="alert">{erro}</p>}
    {admin && <button disabled={ocupado} onClick={() => setEditar({})}>Novo financiamento</button>}
    {editar && (agencias.json ? <form className="cartao projeto-form" key={editar.id ?? 'novo'} onSubmit={e => {
      e.preventDefault()
      gravar('/financiamentos' + (editar.id ? '/' + editar.id : ''),editar.id ? 'PATCH' : 'POST',Object.fromEntries(new FormData(e.currentTarget)))
    }}><fieldset disabled={ocupado} className="projeto-form__campos">
      <label className="projeto-form__campo">Agência<select name="idAgencia" defaultValue={editar.idAgencia ?? ''} required>
        <option value="">Selecione</option>{agencias.json.dados.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
      </select></label>
      <label className="projeto-form__campo">Fomento<select name="tipoFomento" defaultValue={editar.tipoFomento ?? 'BOLSA'}>
        {['BOLSA','AUXILIO','CONVENIO','OUTRO'].map(t => <option key={t}>{t}</option>)}
      </select></label>
      <CampoValor nome="valorTotal" rotulo="Valor total" valor={editar.valorTotal}/>
      <label className="projeto-form__campo">Início<input name="dataInicioVigencia" type="date" defaultValue={editar.dataInicioVigencia} required/></label>
      <label className="projeto-form__campo">Fim<input name="dataFimVigencia" type="date" defaultValue={editar.dataFimVigencia} required/></label>
      <button type="button" onClick={() => setEditar(null)}>Cancelar</button><button className="primario">Salvar financiamento</button>
    </fieldset></form> : <Estado consulta={agencias}/>)}
    {!lista.json ? <Estado consulta={lista}/> : <section className="cartao">
      {lista.json.dados.length === 0 && <p>Nenhum financiamento encontrado.</p>}
      <ul>{lista.json.dados.map(f => <li key={f.id}>
        <strong>{f.agencia}</strong> · {f.tipoFomento} · Total R$ {String(f.valorTotal).replace('.',',')} · Saldo R$ {String(f.saldo).replace('.',',')} · {dataLocal(f.dataInicioVigencia)} a {dataLocal(f.dataFimVigencia)}
        <div className="abas">
          <button onClick={() => selecionar(f.id)}>Ver apoios #{f.id}</button>
          {admin && <><button disabled={ocupado} onClick={() => setEditar(f)}>Editar</button>
            <button disabled={ocupado} onClick={() => {
              if (window.confirm('Excluir financiamento?')) gravar('/financiamentos/' + f.id,'DELETE').then(ok => {if (ok && selecionado === f.id) selecionar(null)})
            }}>Excluir</button></>}
        </div></li>)}</ul>
    </section>}
    {selecionado && <section className="cartao"><h2>Apoios do financiamento #{selecionado}</h2>
      {!apoios.json ? <Estado consulta={apoios}/> : <>
        {!apoios.json.dados.length && <p>Nenhum projeto vinculado.</p>}
        <ul>{apoios.json.dados.map(a => <li key={a.codigo}>{a.codigo} · {a.titulo} · R$ {String(a.valor).replace('.',',')}
          {admin && <button disabled={ocupado} onClick={() => {
            if (window.confirm('Remover este apoio?')) gravar(caminho + '/' + encodeURIComponent(a.codigo),'DELETE')
          }}>Remover apoio</button>}</li>)}</ul>
      </>}
      {admin && <form key={selecionado + '/' + versaoApoio} onSubmit={e => {
        e.preventDefault()
        const form = e.currentTarget
        gravar(caminho,'POST',Object.fromEntries(new FormData(form))).then(ok => {if (ok) setVersaoApoio(v => v + 1)})
      }}><fieldset disabled={ocupado} className="projeto-form__campos">
        <label className="projeto-form__campo">Código do projeto<input name="codigo" maxLength={20} required/></label>
        <CampoValor nome="valor" rotulo="Valor destinado"/>
        <button className="primario">Vincular projeto</button>
      </fieldset></form>}
    </section>}
  </main>
}

const nomesConsultas = {
  RF13:'Projetos por docente', RF14:'Participantes por projeto', RF15:'Produções por projeto',
  RF16:'Financiamentos por agência', RF17:'Projetos e coordenadores', RF18:'Produções por ano e tipo',
  RF19:'Total de financiamentos por agência', RF20:'Participantes em múltiplos projetos',
}

function RelatoriosApi({ auditoria, perfil }) {
  const [codigo, setCodigo] = useState('RF13')
  const [caminho, setCaminho] = useState(null)
  const consulta = useConsulta(auditoria ? '/auditoria' : caminho)
  const opcoes = Object.keys(nomesConsultas).filter(c =>
    perfil === 'Gestor' || ['RF13','RF14','RF15'].includes(c) || (c === 'RF16' && perfil === 'Administrador'))
  const dados = consulta.json?.dados
  return <main className="conteudo"><h1>{auditoria ? 'Auditoria' : 'Consultas'}</h1>
    {!auditoria && <form className="cartao projeto-form" onSubmit={evento => {
      evento.preventDefault()
      const filtros = new URLSearchParams([...new FormData(evento.currentTarget)].filter(([,v]) => v))
      const destino = '/consultas/' + codigo + '?' + filtros
      if (caminho === destino) consulta.tentar()
      else setCaminho(destino)
    }}>
      <label className="projeto-form__campo">Consulta<select value={codigo} onChange={evento => {setCodigo(evento.target.value);setCaminho(null)}}>
        {opcoes.map(c => <option key={c} value={c}>{nomesConsultas[c]}</option>)}
      </select></label>
      <div key={codigo}>
        {['RF13','RF16'].includes(codigo) && <label className="projeto-form__campo">{codigo === 'RF13' ? 'ID do docente' : 'ID da agência'}<input name="id" type="number" min="1" max="4294967295" required/></label>}
        {['RF14','RF15'].includes(codigo) && <label className="projeto-form__campo">Código do projeto<input name="codigo" maxLength={20} required/></label>}
        {codigo === 'RF18' && <>
          <label className="projeto-form__campo">Ano<input name="ano" type="number" min="1" max="65535" required/></label>
          <label className="projeto-form__campo">Tipo<select name="tipo"><option value="">Todos</option>
            {['ARTIGO','CAPITULO_LIVRO','LIVRO','SOFTWARE','RELATORIO_TECNICO','OUTRO'].map(t => <option key={t} value={t}>{t.replaceAll('_',' ')}</option>)}
          </select></label>
        </>}
        {codigo === 'RF20' && <label className="projeto-form__campo">Período<select name="recorte"><option value="ativo">Vínculos vigentes</option><option value="historico">Todo o histórico</option></select></label>}
      </div>
      <button className="primario">Executar consulta</button>
    </form>}
    {(auditoria || caminho) && <section className="cartao">
      {!dados ? <Estado consulta={consulta}/> : !dados.length ? <p role="status">Nenhum registro encontrado.</p>
        : <div className="tabela" tabIndex={0} role="region" aria-label="Resultados"><table>
          <thead><tr>{Object.keys(dados[0]).map(c => <th scope="col" key={c}>{c}</th>)}</tr></thead>
          <tbody>{dados.map((item,i) => <tr key={i}>{Object.entries(item).map(([c,v]) => <td key={c}>{v ?? 'Em aberto'}</td>)}</tr>)}</tbody>
        </table></div>}
    </section>}
  </main>
}

function CadastrosApi({ modulo, admin }) {
  const agencia = modulo === 'agencias'
  const caminho = '/' + modulo
  const consulta = useConsulta(caminho)
  const [registro, setRegistro] = useState(null)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  function abrir(item) { setErro(''); setRegistro(item) }
  async function gravar(method, id, dados) {
    setErro('')
    setOcupado(true)
    try {
      await requisicao(caminho + (id ? '/' + id : ''), { method, dados })
      abrir(null)
      consulta.tentar()
    } catch (falha) { setErro(falha.message) }
    finally { setOcupado(false) }
  }
  return <main className="conteudo"><h1>{agencia ? 'Agências' : 'Participantes'}</h1>
    {erro && <p role="alert">{erro}</p>}
    {registro ? <form className="cartao projeto-form" onSubmit={e => {
      e.preventDefault()
      gravar(registro.id ? 'PATCH' : 'POST', registro.id, Object.fromEntries(new FormData(e.currentTarget)))
    }}><fieldset disabled={ocupado} className="projeto-form__campos">
      <label className="projeto-form__campo">Nome<input name="nome" required maxLength={150} defaultValue={registro.nome}/></label>
      {agencia ? <label className="projeto-form__campo">Sigla<input name="sigla" required maxLength={15} defaultValue={registro.sigla}/></label> : <>
        <label className="projeto-form__campo">E-mail institucional<input name="emailInstitucional" type="email" required maxLength={120} defaultValue={registro.emailInstitucional}/></label>
        <label className="projeto-form__campo">CPF<CampoCpf inicial={registro.cpf}/></label>
        <label className="projeto-form__campo">Tipo<select name="tipo" required defaultValue={registro.tipo ?? ''}>
          <option value="">Selecione</option><option value="DOCENTE">Docente</option><option value="DISCENTE">Discente</option><option value="TECNICO">Técnico</option>
        </select></label>
      </>}
      <button type="button" onClick={() => abrir(null)}>Cancelar</button><button className="primario">Salvar</button>
    </fieldset></form> : <section className="cartao">
      {admin && <button onClick={() => abrir({})}>Novo cadastro</button>}
      {consulta.json ? consulta.json.dados.length ? <ul>{consulta.json.dados.map(item => <li key={item.id}>
        <strong>{item.nome}</strong> · {agencia ? item.sigla : item.emailInstitucional}
        {!agencia && <> · {item.tipo}{item.cpf && ' · ' + item.cpf}</>}
        {admin && <div className="abas">
          <button disabled={ocupado} onClick={() => abrir(item)}>Editar</button>
          {!agencia && <button disabled={ocupado} onClick={() => {
            if (window.confirm('Excluir o cadastro de ' + item.nome + '?')) gravar('DELETE', item.id)
          }}>Excluir</button>}
        </div>}
      </li>)}</ul> : <p>Nenhum cadastro encontrado.</p> : <Estado consulta={consulta}/>}
    </section>}
  </main>
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

function TrocaCoordenacao({ recurso, projeto, atualizar }) {
  const [aberto, abrir] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')
  const docentes = useConsulta(aberto ? '/docentes' : null)
  return <section className="cartao">
    {!aberto ? <button onClick={() => { setErro(''); abrir(true) }}>Trocar coordenação</button>
      : !docentes.json ? <><Estado consulta={docentes}/><button onClick={() => abrir(false)}>Cancelar</button></>
      : <form className="projeto-form" onSubmit={async evento => {
        evento.preventDefault()
        const idCoordenador = Number(new FormData(evento.currentTarget).get('idCoordenador'))
        setOcupado(true); setErro('')
        try {
          await requisicao(recurso + '/coordenador', {method:'PUT', dados:{idCoordenador}})
          abrir(false); atualizar()
        } catch (falha) { setErro(falha.message) }
        finally { setOcupado(false) }
      }}>
        {erro && <p role="alert">{erro}</p>}
        <fieldset disabled={ocupado}>
          <label>Novo coordenador <select name="idCoordenador" required defaultValue="">
            <option value="">Selecione</option>
            {docentes.json.dados.filter(d => d.idParticipante !== projeto.idCoordenador).map(d =>
              <option key={d.idParticipante} value={d.idParticipante}>{d.nome}</option>)}
          </select></label>
          <button type="button" onClick={() => abrir(false)}>Cancelar</button>
          <button className="primario">Confirmar troca</button>
        </fieldset>
      </form>}
  </section>
}

function GestaoEquipe({ recurso, equipe, atualizar }) {
  const [acao, setAcao] = useState(null)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const caminho = recurso + '/participacoes'
  const candidatos = useConsulta(acao === 'incluir' ? caminho + '/candidatos' : null)
  function escolher(valor) { setErro(''); setAcao(valor) }
  async function enviar(evento) {
    evento.preventDefault()
    const dados = Object.fromEntries(new FormData(evento.currentTarget))
    setOcupado(true)
    setErro('')
    try {
      const incluir = acao === 'incluir'
      const destino = incluir ? caminho : caminho + '/' + acao.idParticipante + '/' + acao.dataEntrada + '/encerramento'
      await requisicao(destino, { method: incluir ? 'POST' : 'PATCH', dados })
      escolher(null)
      atualizar()
    } catch (falha) { setErro(falha.message) }
    finally { setOcupado(false) }
  }
  return <section className="cartao"><h2>Gerenciar equipe</h2>
    {!acao ? <>
      <button onClick={() => escolher('incluir')}>Vincular participante</button>
      <ul>{equipe.filter(v => !v.dataSaida && v.funcao !== 'COORDENADOR').map(v =>
        <li key={v.idParticipante + '/' + v.dataEntrada}><button onClick={() => escolher(v)}>Encerrar vínculo de {v.nome} ({dataLocal(v.dataEntrada)})</button></li>)}</ul>
    </> : acao === 'incluir' && !candidatos.json ? <><Estado consulta={candidatos}/><button onClick={() => escolher(null)}>Cancelar</button></> :
      <form key={acao === 'incluir' ? acao : acao.idParticipante + '/' + acao.dataEntrada} className="projeto-form" onSubmit={enviar}>
        {erro && <p role="alert">{erro}</p>}
        <fieldset disabled={ocupado} className="projeto-form__campos">
          {acao === 'incluir' ? <>
            <label className="projeto-form__campo">Participante<select name="idParticipante" required defaultValue="">
              <option value="">Selecione</option>{candidatos.json.dados.map(p => <option key={p.idParticipante} value={p.idParticipante}>{p.nome}</option>)}
            </select></label>
            <label className="projeto-form__campo">Função<select name="funcao" required defaultValue="">
              <option value="">Selecione</option>{Object.entries(funcoesEquipe).map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
            </select></label>
            <label className="projeto-form__campo">Entrada<input type="date" name="dataEntrada" required /></label>
          </> : <p>Encerrar vínculo de {acao.nome}.</p>}
          <label className="projeto-form__campo">{acao === 'incluir' ? 'Saída (opcional)' : 'Saída'}
            <input type="date" name="dataSaida" min={acao.dataEntrada} required={acao !== 'incluir'} />
          </label>
          <button type="button" onClick={() => escolher(null)}>Cancelar</button>
          <button className="primario">Salvar vínculo</button>
        </fieldset>
      </form>}
  </section>
}
