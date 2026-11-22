import { useEffect, useRef, useState } from 'react'
import ProjetoForm from './ProjetoForm.jsx'
import EquipeProjeto from './EquipeProjeto.jsx'
import Cadastros from './Cadastros.jsx'
import Resultados from './Resultados.jsx'
import Consultas, { Auditoria } from './Consultas.jsx'
import { moeda } from './formatadores.js'
import { tiposFomento, tiposProducao } from './services/relacoes.js'
import { listarFinanciamentos, listarProducoes, podeConsultarFinanciamentos } from './services/resultados.js'
import {
  alterarSituacaoProjeto, carregarTodosProjetos, criarProjeto, docentes, editarProjeto, excluirProjeto, idDocenteDemonstracao,
  listarProjetos, listarProjetosDoParticipante, obterProjetoDemonstracao, obterResumoProjetos, podeAlterarSituacao, podeCriarProjeto, podeEditarProjeto, situacoes,
} from './services/projetos.js'
import './sigpesq.css'

const perfis = ['Administrador', 'Coordenador', 'Participante', 'Gestor']
const titulosFormulario = { novo: 'Novo projeto', editar: 'Editar projeto', situacao: 'Alterar situação' }
const filtrosIniciais = { busca: '', situacao: '', idCoordenador: '' }
const menu = { '/': 'Painel', '/projetos': 'Projetos', '/participantes': 'Participantes', '/agencias': 'Agências', '/financiamentos': 'Financiamentos', '/producoes': 'Produções', '/consultas': 'Consultas e relatórios', '/auditoria': 'Auditoria' }
const logins = { Administrador: 'admin', Coordenador: 'coordenador', Participante: 'participante', Gestor: 'gestor' }

function lerConsulta() {
  const parametros = new URLSearchParams(window.location.search)
  const filtros = Object.fromEntries(Object.keys(filtrosIniciais).map((campo) => [campo, parametros.get(campo) ?? '']))
  const pagina = Number(parametros.get('pagina'))
  return { filtros, pagina: Number.isSafeInteger(pagina) && pagina > 0 ? pagina : 1 }
}

export default function App() {
  const [perfil, setPerfil] = useState('')
  const [selecionado, setSelecionado] = useState(perfis[0])
  const [rota, setRota] = useState(() => window.location.pathname)
  const [filtros, setFiltros] = useState(() => lerConsulta().filtros)
  const [consulta, setConsulta] = useState(() => lerConsulta().filtros)
  const [login, setLogin] = useState('')
  const [senhaVisivel, setSenhaVisivel] = useState(false)
  const [erroLogin, setErroLogin] = useState('')
  const [aba, setAba] = useState('Equipe')
  const [numeroPagina, setNumeroPagina] = useState(() => lerConsulta().pagina)
  const [resultado, setResultado] = useState(null)
  const [resumo, setResumo] = useState({})
  const [projetosPainel, setProjetosPainel] = useState([])
  const [falhaProjetosPainel, setFalhaProjetosPainel] = useState(false)
  const [tentativa, setTentativa] = useState(0)
  const [mensagem, setMensagem] = useState('')
  const [falhaAcao, setFalhaAcao] = useState('')
  const titulo = useRef(null)
  const campoBusca = useRef(null)
  const detalhe = /^\/projetos\/([^/]+)(?:\/(editar|situacao))?\/?$/.exec(rota)
  const novo = rota === '/projetos/novo'
  const projeto = detalhe && !novo ? obterProjetoDemonstracao(decodificar(detalhe[1])) : null
  const painel = rota === '/' || rota === '/login'
  const lista = rota === '/projetos' || rota === '/projetos/'
  const cadastro = /^\/(participantes|agencias)(?:\/(novo|\d+)(?:\/editar)?)?\/?$/.exec(rota)
  const resultados = /^\/financiamentos(?:\/(?:novo|\d+(?:\/editar)?))?\/?$/.test(rota) ? 'financiamentos'
    : /^\/producoes(?:\/(?:nova|\d+(?:\/editar)?))?\/?$/.test(rota) ? 'producoes' : ''
  const consultaRelatorios = rota === '/consultas' || rota === '/consultas/'
  const auditoria = rota === '/auditoria' || rota === '/auditoria/'
  const formulario = novo ? 'novo' : detalhe?.[2] ?? ''
  const ausente = (!painel && !lista && !novo && !projeto && !cadastro && !resultados && !consultaRelatorios && !auditoria)
  const semAcesso = (novo && !podeCriarProjeto(perfil))
    || (formulario === 'editar' && projeto && !podeEditarProjeto(perfil, projeto))
    || (formulario === 'situacao' && projeto && !podeAlterarSituacao(perfil, projeto))
    || (auditoria && perfil !== 'Administrador')
    || (resultados === 'financiamentos' && !podeConsultarFinanciamentos(perfil))
  const local = painel ? '/' : cadastro ? '/' + cadastro[1] : resultados ? '/' + resultados
    : consultaRelatorios ? '/consultas' : auditoria ? '/auditoria' : '/projetos'
  const pagina = menu[local]
  const chave = JSON.stringify([perfil, consulta, numeroPagina, tentativa, painel])
  const atual = resultado?.chave === chave ? resultado : null
  const carregando = !atual
  const erro = atual?.erro
  const visiveis = atual?.lista?.dados ?? []
  const total = atual?.lista?.paginacao.total ?? 0

  useEffect(() => {
    titulo.current?.focus()
  }, [perfil, rota])

  useEffect(() => {
    function voltar() {
      setRota(window.location.pathname)
      setMensagem('')
      setFalhaAcao('')
      setAba('Equipe')
      const estado = lerConsulta()
      setFiltros(estado.filtros)
      setConsulta(estado.filtros)
      setNumeroPagina(estado.pagina)
    }
    window.addEventListener('popstate', voltar)
    return () => window.removeEventListener('popstate', voltar)
  }, [])

  useEffect(() => {
    if (!perfil) return
    let ativo = true
    listarProjetos(painel ? {} : { ...consulta, pagina: numeroPagina })
      .then((lista) => { if (ativo) setResultado({ chave, lista }) })
      .catch(() => { if (ativo) setResultado({ chave, erro: 'Não foi possível carregar os projetos.' }) })
    return () => { ativo = false }
  }, [chave, perfil, painel, consulta, numeroPagina])

  useEffect(() => {
    if (!perfil || pagina !== 'Painel') return
    let ativo = true
    obterResumoProjetos()
      .then(({ dados }) => { if (ativo) setResumo(dados) })
      .catch(() => { if (ativo) setResumo({}) })
    return () => { ativo = false }
  }, [perfil, pagina, tentativa])

  useEffect(() => {
    if (!perfil || (!painel && !consultaRelatorios)) return
    let ativo = true
    carregarTodosProjetos()
      .then((dados) => {
        if (!ativo) return
        setProjetosPainel(dados)
        setFalhaProjetosPainel(false)
      })
      .catch(() => { if (ativo) setFalhaProjetosPainel(true) })
    return () => { ativo = false }
  }, [perfil, painel, consultaRelatorios, tentativa])

  function buscar(valores, novaPagina = 1) {
    const aplicados = { ...valores, busca: valores.busca.trim() }
    const parametros = new URLSearchParams(Object.entries(aplicados).filter(([, valor]) => valor))
    if (novaPagina > 1) parametros.set('pagina', novaPagina)
    const endereco = parametros.size ? '/projetos?' + parametros : '/projetos'
    if (lista && endereco !== window.location.pathname + window.location.search) {
      window.history.pushState(null, '', endereco)
    }
    setNumeroPagina(novaPagina)
    setConsulta(aplicados)
  }

  function navegar(destino) {
    const caminho = destino.split('?')[0]
    if (destino !== window.location.pathname + window.location.search) window.history.pushState(null, '', destino)
    setRota(caminho)
    if (caminho === '/projetos') {
      const estado = lerConsulta()
      setFiltros(estado.filtros)
      setConsulta(estado.filtros)
      setNumeroPagina(estado.pagina)
    }
    setMensagem('')
    setFalhaAcao('')
    setAba('Equipe')
  }

  function abrirProjeto(item) {
    navegar(caminhoProjeto(item))
  }

  function entrar(evento) {
    evento.preventDefault()
    const credenciais = new FormData(evento.currentTarget)
    if (login.trim() !== logins[selecionado] || credenciais.get('senha') !== 'sigpesq-demo') {
      setErroLogin('Login ou senha inválidos.')
      return
    }
    setErroLogin('')
    setSenhaVisivel(false)
    setPerfil(selecionado)
    if (rota === '/login') navegar('/')
  }

  async function gravarProjeto(valores) {
    if (formulario === 'novo') {
      const { dados } = await criarProjeto(perfil, valores)
      setFiltros(filtrosIniciais)
      buscar(filtrosIniciais)
      abrirProjeto(dados)
      setMensagem('Projeto cadastrado.')
    } else if (formulario === 'editar') {
      const { dados } = await editarProjeto(perfil, projeto.codigo, valores)
      abrirProjeto(dados)
      setMensagem('Dados do projeto atualizados.')
    } else {
      const { dados } = await alterarSituacaoProjeto(perfil, projeto.codigo, valores.situacao)
      abrirProjeto(dados)
      setMensagem('Situação atualizada.')
    }
    setTentativa((valor) => valor + 1)
  }

  async function solicitarExclusao() {
    try {
      await excluirProjeto(perfil, projeto.codigo)
      navegar('/projetos')
      setMensagem('Projeto excluído.')
      setTentativa((valor) => valor + 1)
    } catch (falha) {
      setFalhaAcao(falha.message)
    }
  }

  if (!perfil) return (
    <main className="acesso">
      <form className="cartao entrada" onSubmit={entrar}>
        <h1 ref={titulo} tabIndex={-1}>Demonstração do SIGPesq</h1>
        <p>Escolha um perfil para consultar projetos fictícios.</p>
        <label htmlFor="perfil">Perfil</label>
        <select id="perfil" value={selecionado} onChange={(evento) => { setSelecionado(evento.target.value); setErroLogin('') }}>
          {perfis.map((item) => <option key={item}>{item}</option>)}
        </select>
        <p>Conta de demonstração: <strong>{logins[selecionado]}</strong> / <strong>sigpesq-demo</strong></p>
        <label htmlFor="login">Login</label>
        <input id="login" name="login" autoComplete="username" value={login} onChange={(evento) => setLogin(evento.target.value)} required />
        <label htmlFor="senha">Senha</label>
        <input id="senha" name="senha" type={senhaVisivel ? 'text' : 'password'} autoComplete="current-password" required />
        <button type="button" aria-pressed={senhaVisivel} onClick={() => setSenhaVisivel((valor) => !valor)}>{senhaVisivel ? 'Ocultar senha' : 'Mostrar senha'}</button>
        {erroLogin && <p role="alert">{erroLogin}</p>}
        <button className="primario">Entrar</button>
      </form>
    </main>
  )

  return (
    <>
      <header className="topo">
        <button className="marca" onClick={() => navegar('/')}>SIGPesq</button>
        <span className="identidade">{perfil === 'Coordenador' ? docentes[idDocenteDemonstracao] + ' · ' : ''}{perfil} · Demonstração</span>
        <button onClick={() => { navegar('/login'); setPerfil(''); setResultado(null); setResumo({}); setFiltros(filtrosIniciais); buscar(filtrosIniciais) }}>Sair</button>
      </header>
      <div className="estrutura">
        <nav aria-label="Navegação principal">
          {Object.entries(menu).filter(([destino]) => {
            if (destino === '/financiamentos') return podeConsultarFinanciamentos(perfil)
            return destino !== '/auditoria' || perfil === 'Administrador'
          }).map(([destino, item]) => (
            <button key={destino} aria-current={!ausente && local === destino ? 'page' : undefined} onClick={() => navegar(destino)}>{item}</button>
          ))}
        </nav>
        <main className="conteudo">
          <h1 ref={titulo} tabIndex={-1}>{ausente ? (detalhe ? 'Projeto não encontrado' : 'Página não encontrada') : semAcesso ? 'Acesso negado' : titulosFormulario[formulario] ?? projeto?.titulo ?? pagina}</h1>
          {mensagem && <p role="status">{mensagem}</p>}
          {falhaAcao && <p className="projeto-form__erro" role="alert">{falhaAcao}</p>}
          {ausente || semAcesso ? (
            <section className="cartao">
              <p>{ausente ? 'O endereço ou projeto solicitado não está disponível.' : 'Seu perfil não pode realizar esta operação.'}</p>
              <button onClick={() => navegar('/projetos')}>Ir para projetos</button>
            </section>
          ) : cadastro ? (
            <Cadastros key={rota} modulo={cadastro[1]} perfil={perfil} rota={rota} navegar={navegar} formatarData={formatarData} />
          ) : resultados ? (
            <Resultados key={rota} modulo={resultados} perfil={perfil} rota={rota} navegar={navegar} formatarData={formatarData} />
          ) : consultaRelatorios ? (
            falhaProjetosPainel ? <p role="alert">Não foi possível carregar os projetos. <button onClick={() => setTentativa((valor) => valor + 1)}>Tentar novamente</button></p>
              : <Consultas perfil={perfil} projetos={projetosPainel} formatarData={formatarData} />
          ) : auditoria ? (
            <Auditoria perfil={perfil} />
          ) : formulario ? (
            <ProjetoForm
              key={rota}
              modo={formulario}
              projeto={projeto}
              perfil={perfil}
              salvar={gravarProjeto}
              cancelar={() => navegar(projeto ? caminhoProjeto(projeto) : '/projetos')}
            />
          ) : projeto ? (
            <>
              <div className="abas">
                <button onClick={() => {
                  const parametros = new URLSearchParams(Object.entries(consulta).filter(([, valor]) => valor))
                  if (numeroPagina > 1) parametros.set('pagina', numeroPagina)
                  navegar(parametros.size ? '/projetos?' + parametros : '/projetos')
                }}>Voltar para projetos</button>
                {podeEditarProjeto(perfil, projeto) && (
                  <button className="primario" onClick={() => navegar(caminhoProjeto(projeto) + '/editar')}>Editar projeto</button>
                )}
                {podeAlterarSituacao(perfil, projeto) && (
                  <button onClick={() => navegar(caminhoProjeto(projeto) + '/situacao')}>Alterar situação</button>
                )}
                {podeEditarProjeto(perfil, projeto) && <button onClick={solicitarExclusao}>Verificar exclusão</button>}
              </div>
              <dl className="cartao dados">
                <div><dt>Código</dt><dd>{projeto.codigo}</dd></div>
                <div><dt>Coordenação</dt><dd>{projeto.coordenador || 'Não informada'}</dd></div>
                <div><dt>Situação</dt><dd>{rotularSituacao(projeto.situacao)}</dd></div>
                <div><dt>Início</dt><dd>{formatarData(projeto.dataInicio)}</dd></div>
                <div><dt>Término</dt><dd>{formatarData(projeto.dataTermino)}</dd></div>
                <div><dt>Descrição</dt><dd>{projeto.descricao}</dd></div>
              </dl>
              <section className="cartao">
                <div className="abas" role="group" aria-label="Seções do projeto">
                  {['Equipe', 'Produções', ...(['Administrador', 'Gestor'].includes(perfil) ? ['Financiamentos'] : [])].map((item) =>
                    <button key={item} aria-pressed={aba === item} onClick={() => setAba(item)}>{item}</button>,
                  )}
                </div>
                {aba === 'Equipe' && (
                  <EquipeProjeto
                    key={projeto.codigo}
                    perfil={perfil}
                    projeto={projeto}
                    formatarData={formatarData}
                    atualizar={(texto) => { setMensagem(texto); setTentativa((valor) => valor + 1) }}
                  />
                )}
                {aba === 'Produções' && (
                  <SecaoRelacionada titulo="Produções" itens={listarProducoes({ codigoProjeto: projeto.codigo }).map((item) => ({
                    id: item.id, titulo: item.titulo, resumo: tiposProducao[item.tipo] + ' · ' + item.anoPublicacao,
                  }))} abrir={(id) => navegar('/producoes/' + id)} />
                )}
                {aba === 'Financiamentos' && ['Administrador', 'Gestor'].includes(perfil) && (
                  <SecaoRelacionada titulo="Financiamentos" itens={listarFinanciamentos(perfil).flatMap((item) =>
                    item.projetos.filter((apoio) => apoio.codigoProjeto === projeto.codigo).map((apoio) => ({
                      id: item.id, titulo: item.agencia?.nome, resumo: tiposFomento[item.tipoFomento] + ' · ' + moeda.format(apoio.valorDestinado),
                    })),
                  )} abrir={(id) => navegar('/financiamentos/' + id)} />
                )}
              </section>
            </>
          ) : (
            <>
              {!painel && podeCriarProjeto(perfil) && (
                <p><button className="primario" onClick={() => navegar('/projetos/novo')}>Novo projeto</button></p>
              )}
              {painel && <div className="resumo">
                {['Em andamento', 'Concluído'].map((situacao) => <div key={situacao}><span>{situacao === 'Concluído' ? 'Concluídos' : situacao}</span><strong>{resumo[situacao] ?? '—'}</strong></div>)}
              </div>}
              {painel && (
                <PainelComplementar perfil={perfil} projetos={projetosPainel} navegar={navegar} abrirProjeto={abrirProjeto}
                  falha={falhaProjetosPainel} tentarNovamente={() => setTentativa((valor) => valor + 1)} />
              )}
              <section className="cartao">
                {painel ? <h2>Projetos de demonstração</h2> : (
                  <form className="filtro" onSubmit={(evento) => { evento.preventDefault(); buscar(filtros) }}>
                    <label htmlFor="busca">Código ou título</label>
                    <input ref={campoBusca} id="busca" type="search" value={filtros.busca} onChange={(evento) => setFiltros({ ...filtros, busca: evento.target.value })} />
                    <label htmlFor="filtro-situacao">Situação</label>
                    <select id="filtro-situacao" value={filtros.situacao} onChange={(evento) => setFiltros({ ...filtros, situacao: evento.target.value })}>
                      <option value="">Todas</option>
                      {Object.entries(situacoes).map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
                    </select>
                    <label htmlFor="filtro-coordenador">Coordenação</label>
                    <select id="filtro-coordenador" value={filtros.idCoordenador} onChange={(evento) => setFiltros({ ...filtros, idCoordenador: evento.target.value })}>
                      <option value="">Todos os docentes</option>
                      {Object.entries(docentes).map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
                    </select>
                    <button type="submit">Buscar</button>
                    {Object.values(consulta).some(Boolean) && <button type="button" onClick={() => { setFiltros(filtrosIniciais); buscar(filtrosIniciais); campoBusca.current?.focus() }}>Limpar filtros</button>}
                  </form>
                )}
                {carregando ? <p role="status">Carregando projetos…</p> : erro ? <div><p role="alert">{erro}</p><button onClick={() => setTentativa((valor) => valor + 1)}>Tentar novamente</button></div> : visiveis.length ? <div className="tabela" tabIndex={0} role="region" aria-label="Tabela de projetos"><table>
                  <thead><tr><th scope="col">Projeto</th><th scope="col">Coordenação</th><th scope="col">Início</th><th scope="col">Término</th><th scope="col">Situação</th></tr></thead>
                  <tbody>
                    {visiveis.map((item) => <tr key={item.codigo}>
                      <td><button className="link" onClick={() => abrirProjeto(item)}>{item.titulo}</button><small>{item.codigo}</small></td>
                      <td>{item.coordenador || 'Não informado'}</td><td>{formatarData(item.dataInicio)}</td><td>{formatarData(item.dataTermino)}</td><td>{rotularSituacao(item.situacao)}</td>
                    </tr>)}
                  </tbody>
                </table></div> : <p role="status">{!painel && Object.values(consulta).some(Boolean) ? 'Nenhum projeto corresponde aos filtros.' : 'Nenhum projeto disponível.'}</p>}
                {atual?.lista && total > atual.lista.paginacao.tamanho && !painel && (
                  <div className="paginacao" role="group" aria-label="Paginação de projetos">
                    <button disabled={numeroPagina === 1} onClick={() => { titulo.current?.focus(); buscar(consulta, numeroPagina - 1) }}>Anterior</button>
                    <span role="status">Página {numeroPagina} de {Math.ceil(total / atual.lista.paginacao.tamanho)}</span>
                    <button disabled={numeroPagina * atual.lista.paginacao.tamanho >= total} onClick={() => { titulo.current?.focus(); buscar(consulta, numeroPagina + 1) }}>Próxima</button>
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

function PainelComplementar({ perfil, projetos, navegar, abrirProjeto, falha, tentarNovamente }) {
  const [{ hoje, limite }] = useState(() => {
    const formatador = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' })
    const agora = new Date()
    return { hoje: formatador.format(agora), limite: formatador.format(new Date(agora.getTime() + 90 * 86400000)) }
  })
  const proximos = projetos.filter((projeto) =>
    projeto.situacao === 'EM_ANDAMENTO' && projeto.dataTermino >= hoje && projeto.dataTermino <= limite,
  ).sort((a, b) => a.dataTermino.localeCompare(b.dataTermino))
  const participante = perfil === 'Coordenador' ? idDocenteDemonstracao : perfil === 'Participante' ? 3 : null
  const meusProjetos = participante ? listarProjetosDoParticipante(participante) : []
  return <>
    <div className="abas">
      {podeCriarProjeto(perfil) && <button className="primario" onClick={() => navegar('/projetos/novo')}>Novo projeto</button>}
      <button onClick={() => navegar('/consultas')}>Consultar projetos e relatórios</button>
      {perfil === 'Administrador' && <button onClick={() => navegar('/financiamentos/novo')}>Novo financiamento</button>}
      {perfil === 'Coordenador' && <button onClick={() => navegar('/producoes/nova')}>Nova produção</button>}
    </div>
    {falha ? <p role="alert">Não foi possível carregar os prazos. <button onClick={tentarNovamente}>Tentar novamente</button></p> : (
      <section className="cartao">
        <h2>Projetos com término nos próximos 90 dias</h2>
        {proximos.length ? <ul>{proximos.map((projeto) => <li key={projeto.codigo}>
          <button className="link" onClick={() => abrirProjeto(projeto)}>{projeto.titulo}</button> · {formatarData(projeto.dataTermino)}
        </li>)}</ul> : <p>Nenhum projeto com término previsto nesse período.</p>}
      </section>
    )}
    {participante && <section className="cartao">
      <h2>Meus projetos</h2>
      {meusProjetos.length ? <ul>{meusProjetos.map((projeto) => <li key={projeto.codigo}>
        <button className="link" onClick={() => abrirProjeto(projeto)}>{projeto.titulo}</button>
      </li>)}</ul> : <p>Nenhum projeto vinculado à sua conta.</p>}
    </section>}
  </>
}

function SecaoRelacionada({ titulo, itens, abrir }) {
  return (
    <>
      <h2>{titulo}</h2>
      {itens.length > 0 ? <ul>{itens.map((item) => <li key={item.id}><button className="link" onClick={() => abrir(item.id)}>{item.titulo}</button> · {item.resumo}</li>)}</ul> : <p>Nenhum registro disponível para este projeto.</p>}
    </>
  )
}

function caminhoProjeto(projeto) {
  return '/projetos/' + encodeURIComponent(projeto.codigo)
}

function decodificar(valor) {
  try {
    return decodeURIComponent(valor)
  } catch {
    return ''
  }
}

function rotularSituacao(situacao) {
  return situacoes[situacao] ?? 'Não informada'
}

function formatarData(data) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return 'Não informado'
  return data.split('-').reverse().join('/')
}
