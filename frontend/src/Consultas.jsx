import { CampoAno } from './Campos.jsx'
import { useState } from 'react'
import { moeda } from './formatadores.js'
import { listarAuditoria } from './services/auditoria.js'
import { listarCadastros, tiposPessoa } from './services/cadastros.js'
import { carregarTodosProjetos, docentes, obterEquipeProjeto, listarProjetosDoParticipante, funcoesEquipe, situacoes } from './services/projetos.js'
import { tiposFomento, tiposProducao } from './services/relacoes.js'
import { listarFinanciamentos, listarProducoes, podeConsultarFinanciamentos, totalizarPorAgencia } from './services/resultados.js'

const consultas = {
  RF13: 'Projetos por coordenador',
  RF14: 'Participantes por projeto',
  RF15: 'Produções por projeto',
  RF16: 'Financiamentos por agência',
  RF17: 'Projetos e coordenadores',
  RF18: 'Produções por ano e tipo',
  RF19: 'Total de financiamento por agência',
  RF20: 'Participantes em múltiplos projetos',
}

export default function Consultas({ perfil, projetos, formatarData }) {
  const [consulta, setConsulta] = useState('')
  const [resultado, setResultado] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const permitidas = Object.entries(consultas).filter(([codigo]) =>
    ['RF13', 'RF14', 'RF15'].includes(codigo) || (codigo === 'RF16' ? podeConsultarFinanciamentos(perfil) : perfil === 'Gestor'),
  )
  const agencias = listarCadastros('agencias', perfil)
  const pessoas = listarCadastros('participantes', perfil)
  function selecionar(evento) {
    setConsulta(evento.target.value)
    setResultado(null)
    setErro('')
  }
  async function consultar(evento) {
    evento.preventDefault()
    const campos = Object.fromEntries(new FormData(evento.currentTarget))
    if (!permitidas.some(([codigo]) => codigo === consulta)) return
    setCarregando(true)
    setResultado(null)
    setErro('')
    try {
      setResultado(await executar(consulta, campos, perfil, pessoas, formatarData))
    } catch {
      setErro('Não foi possível executar a consulta. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }
  return <>
    <form key={consulta} className="projeto-form" onSubmit={consultar}>
      <div className="projeto-form__campos">
        <label className="projeto-form__campo projeto-form__campo--largo">Consulta
          <select value={consulta} onChange={selecionar} disabled={carregando} required>
            <option value="">Selecione</option>
            {permitidas.map(([codigo, nome]) => <option key={codigo} value={codigo}>{nome}</option>)}
          </select>
        </label>
        {consulta === 'RF13' && <Filtro nome="idCoordenador" rotulo="Coordenação" itens={Object.entries(docentes)} />}
        {['RF14', 'RF15'].includes(consulta) && <Filtro nome="codigoProjeto" rotulo="Projeto" itens={projetos.map((item) => [item.codigo, item.titulo])} />}
        {consulta === 'RF16' && <Filtro nome="idAgencia" rotulo="Agência" itens={agencias.map((item) => [item.id, item.sigla + ' (' + item.nome + ')'])} />}
        {consulta === 'RF18' && <>
          <label className="projeto-form__campo">Ano de publicação<CampoAno name="ano" /></label>
          <Filtro nome="tipo" rotulo="Tipo" itens={Object.entries(tiposProducao)} obrigatorio={false} />
        </>}
        {consulta === 'RF20' && <Filtro nome="recorte" rotulo="Período de participação" itens={[[ 'ativo', 'Vínculos vigentes' ], [ 'historico', 'Todo o histórico' ]]} defaultValue="ativo" />}
      </div>
      <div className="projeto-form__acoes"><button className="primario" disabled={!consulta || carregando}>{carregando ? 'Consultando…' : 'Consultar'}</button></div>
    </form>
    <section className="cartao">
      <h2>Resultado</h2>
      {erro ? <p role="alert">{erro}</p> : carregando ? <p role="status">Carregando resultados…</p> : resultado ? (
        resultado.linhas.length ? <TabelaPaginada nome={consultas[consulta]} {...resultado} /> : <p role="status">Nenhum registro corresponde aos filtros.</p>
      ) : <p>Selecione uma consulta e informe os filtros aplicáveis.</p>}
    </section>
  </>
}

export function Auditoria({ perfil }) {
  if (perfil !== 'Administrador') return <section className="cartao"><p role="alert">Acesso negado.</p></section>
  return <section className="cartao">
    <TabelaAuditoria eventos={listarAuditoria(perfil)} />
  </section>
}

function TabelaAuditoria({ eventos }) {
  const dataHora = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'America/Sao_Paulo' })
  if (!eventos.length) return <p role="status">Nenhuma operação registrada nesta demonstração.</p>
  return <TabelaPaginada nome="Operações registradas" colunas={['Data e hora', 'Usuário', 'Perfil', 'Operação', 'Tabela', 'Chave', 'Descrição']}
    linhas={eventos.map((item) => [
      dataHora.format(new Date(item.dataHora)), item.usuario, item.perfil, item.operacao, item.tabela, item.chave, item.descricao,
    ])} />
}

function TabelaPaginada({ nome, colunas, linhas }) {
  const [pagina, setPagina] = useState(1)
  const total = Math.ceil(linhas.length / 20)
  return <>
    <Tabela nome={nome} colunas={colunas} linhas={linhas.slice((pagina - 1) * 20, pagina * 20)} />
    {total > 1 && <div className="paginacao" role="group" aria-label={'Paginação de ' + nome}>
      <button disabled={pagina === 1} onClick={() => setPagina(pagina - 1)}>Anterior</button>
      <span role="status">Página {pagina} de {total}</span>
      <button disabled={pagina === total} onClick={() => setPagina(pagina + 1)}>Próxima</button>
    </div>}
  </>
}

function Filtro({ nome, rotulo, itens, obrigatorio = true, defaultValue = '' }) {
  return <label className="projeto-form__campo">{rotulo}<select name={nome} defaultValue={defaultValue} required={obrigatorio}>
    <option value="">{obrigatorio ? 'Selecione' : 'Todos'}</option>
    {itens.map(([valor, texto]) => <option value={valor} key={valor}>{texto}</option>)}
  </select></label>
}

function Tabela({ nome, colunas, linhas }) {
  return <div className="tabela" role="region" tabIndex={0} aria-label={nome}><table>
    <thead><tr>{colunas.map((coluna) => <th key={coluna} scope="col">{coluna}</th>)}</tr></thead>
    <tbody>{linhas.map((linha, numero) => <tr key={numero}>{linha.map((valor, coluna) => <td key={colunas[coluna]}>{valor}</td>)}</tr>)}</tbody>
  </table></div>
}

async function executar(consulta, campos, perfil, pessoas, formatarData) {
  switch (consulta) {
    case 'RF13': {
      const dados = await carregarTodosProjetos({ idCoordenador: campos.idCoordenador })
      return { colunas: ['Código', 'Título', 'Início', 'Término', 'Situação'], linhas: dados.map((p) => [
        p.codigo, p.titulo, formatarData(p.dataInicio), formatarData(p.dataTermino), situacoes[p.situacao],
      ]) }
    }
    case 'RF14': {
      const dados = obterEquipeProjeto(campos.codigoProjeto)
      return { colunas: ['Participante', 'Tipo', 'Função', 'Entrada', 'Saída'], linhas: dados.map((v) => {
        const pessoa = pessoas.find((p) => p.id === v.idParticipante)
        return [pessoa?.nome, tiposPessoa[pessoa?.tipo], funcoesEquipe[v.funcao] ?? 'Coordenador', formatarData(v.dataEntrada), v.dataSaida ? formatarData(v.dataSaida) : 'Em aberto']
      }) }
    }
    case 'RF15':
    case 'RF18': {
      const dados = listarProducoes(campos)
      return { colunas: ['Título', 'Tipo', 'Ano', 'Divulgação', 'Autores', 'Projetos'], linhas: dados.map((p) => [
        p.titulo, tiposProducao[p.tipo], p.anoPublicacao, p.meioDivulgacao, p.autores.map((a) => a.nome).join(', '), p.projetos.join(', '),
      ]) }
    }
    case 'RF16':
      return { colunas: ['Identificador', 'Fomento', 'Valor total', 'Vigência', 'Projetos'], linhas: listarFinanciamentos(perfil, campos.idAgencia).map((f) => [
        f.id, tiposFomento[f.tipoFomento], moeda.format(f.valorTotal), formatarData(f.dataInicioVigencia) + ' a ' + formatarData(f.dataFimVigencia),
        f.projetos.map((p) => p.codigoProjeto).join(', '),
      ]) }
    case 'RF17': {
      const dados = await carregarTodosProjetos()
      return { colunas: ['Código', 'Título', 'Coordenação'], linhas: dados.map((p) => [p.codigo, p.titulo, p.coordenador]) }
    }
    case 'RF19':
      return { colunas: ['Agência', 'Valor total'], linhas: totalizarPorAgencia(perfil).map((a) => [a.nome, moeda.format(a.total)]) }
    case 'RF20': {
      const hoje = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date())
      const linhas = pessoas.map((pessoa) => {
        const projetos = listarProjetosDoParticipante(pessoa.id).filter((projeto) => campos.recorte === 'historico' ||
          projeto.vinculos.some((v) => v.dataEntrada <= hoje && (!v.dataSaida || v.dataSaida >= hoje)))
        return [pessoa.nome, projetos.length]
      }).filter(([, quantidade]) => quantidade > 1)
      return { colunas: ['Participante', 'Quantidade de projetos distintos'], linhas }
    }
    default:
      throw new Error('Consulta indisponível.')
  }
}
