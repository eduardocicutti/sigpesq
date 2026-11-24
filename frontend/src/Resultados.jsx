import { useEffect, useState } from 'react'
import { moeda } from './formatadores.js'
import { listarCadastros } from './services/cadastros.js'
import { carregarTodosProjetos, idDocenteDemonstracao, obterProjetoDemonstracao } from './services/projetos.js'
import { tiposFomento, tiposProducao } from './services/relacoes.js'
import {
  associarFinanciamento, excluirFinanciamento, excluirProducao, listarFinanciamentos, listarProducoes,
  podeConsultarFinanciamentos, podeManterProducao, removerAssociacao, salvarFinanciamento, salvarProducao,
} from './services/resultados.js'

export default function Resultados({ modulo, perfil, rota, navegar, formatarData }) {
  const financiamento = modulo === 'financiamentos'
  const raiz = '/' + modulo
  const novo = financiamento ? 'novo' : 'nova'
  const [, , segmento, edicao] = rota.split('/')
  const id = segmento && segmento !== novo ? Number(segmento) : null
  const formulario = segmento === novo || edicao === 'editar'
  const [idAgencia, setIdAgencia] = useState('')
  const [ano, setAno] = useState('')
  const [tipo, setTipo] = useState('')
  const [projetos, setProjetos] = useState(null)
  const [erro, setErro] = useState('')
  const [erroProjetos, setErroProjetos] = useState(false)
  const [versao, setVersao] = useState(0)
  const [, atualizar] = useState(0)
  const [mensagem, setMensagem] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const acesso = !financiamento || podeConsultarFinanciamentos(perfil)
  const registros = !acesso ? [] : financiamento ? listarFinanciamentos(perfil) : listarProducoes()
  const item = registros.find((registro) => registro.id === id)
  const podeManter = financiamento ? perfil === 'Administrador' : podeManterProducao(perfil, item)
  const carregarProjetos = acesso && (!financiamento ? formulario && podeManter : Boolean(item) && !formulario && podeManter)
  const agencias = financiamento ? listarCadastros('agencias', perfil) : []

  useEffect(() => {
    if (!carregarProjetos) return
    let ativo = true
    async function carregar() {
      const filtros = financiamento ? {} : { idCoordenador: idDocenteDemonstracao }
      const dados = await carregarTodosProjetos(filtros)
      if (ativo) setProjetos(dados)
    }
    carregar().catch(() => { if (ativo) setErroProjetos(true) })
    return () => { ativo = false }
  }, [carregarProjetos, financiamento, versao])

  const voltar = () => navegar(raiz)
  function salvar(campos) {
    const salvarRegistro = financiamento ? salvarFinanciamento : salvarProducao
    const registro = salvarRegistro(perfil, id, campos)
    navegar(raiz + '/' + registro)
  }
  function executar(operacao, sucesso) {
    try {
      operacao()
      setErro('')
      setMensagem(sucesso)
      atualizar((valor) => valor + 1)
      return true
    } catch (falha) {
      setMensagem('')
      setErro(falha.message)
      return false
    }
  }

  if (!acesso || (formulario && !podeManter)) {
    return <section className="cartao"><p role="alert">Seu perfil não pode realizar esta operação.</p><button onClick={() => navegar('/')}>Voltar ao painel</button></section>
  }
  if (id !== null && !item) {
    return <section className="cartao"><p role="status">Registro não encontrado.</p><button onClick={voltar}>Voltar à lista</button></section>
  }
  if (formulario) {
    return <>
      <h2>{id ? 'Editar' : 'Cadastrar'} {financiamento ? 'financiamento' : 'produção'}</h2>
      {financiamento ? (
        <Formulario salvar={salvar} cancelar={() => navegar(item ? raiz + '/' + id : raiz)}>
          <SeletorAgencia agencias={agencias} valor={item?.idAgencia} obrigatorio />
          <Seletor rotulo="Tipo de fomento" nome="tipoFomento" opcoes={tiposFomento} valor={item?.tipoFomento} />
          <CampoValor nome="valorTotal" rotulo="Valor total (R$)" valor={item?.valorTotal} />
          <label className="projeto-form__campo">Início da vigência<input type="date" name="dataInicioVigencia" defaultValue={item?.dataInicioVigencia} required /></label>
          <label className="projeto-form__campo">Fim da vigência<input type="date" name="dataFimVigencia" defaultValue={item?.dataFimVigencia} required /></label>
        </Formulario>
      ) : erroProjetos ? (
        <section className="cartao"><p role="alert">Não foi possível carregar os projetos.</p><button onClick={() => { setErroProjetos(false); setVersao((v) => v + 1) }}>Tentar novamente</button></section>
      ) : projetos ? (
        <FormularioProducao item={item} projetos={projetos} salvar={salvar} cancelar={() => navegar(item ? raiz + '/' + id : raiz)} />
      ) : <p role="status">Carregando projetos…</p>}
    </>
  }
  if (item) {
    return <>
      <h2>{financiamento ? item.agencia?.nome : item.titulo}</h2>
      <div className="abas">
        <button onClick={voltar}>Voltar à lista</button>
        {podeManter && <button className="primario" onClick={() => navegar(raiz + '/' + id + '/editar')}>Editar</button>}
        {podeManter && <button onClick={() => setConfirmando(true)}>Excluir</button>}
      </div>
      {confirmando && <p>Confirma a exclusão? <button onClick={() => {
        const excluir = financiamento ? excluirFinanciamento : excluirProducao
        if (executar(() => excluir(perfil, id), 'Registro excluído.')) voltar()
        else setConfirmando(false)
      }}>Confirmar exclusão</button> <button onClick={() => setConfirmando(false)}>Cancelar</button></p>}
      {erro && <p role="alert">{erro}</p>}
      {mensagem && <p role="status">{mensagem}</p>}
      {financiamento ? (
        <>
          <dl className="cartao dados">
            <Item rotulo="Fomento" valor={tiposFomento[item.tipoFomento]} />
            <Item rotulo="Total" valor={moeda.format(item.valorTotal)} />
            <Item rotulo="Destinado" valor={moeda.format(item.valorDestinado)} />
            <Item rotulo="Saldo" valor={moeda.format(item.saldo)} />
            <Item rotulo="Vigência" valor={formatarData(item.dataInicioVigencia) + ' a ' + formatarData(item.dataFimVigencia)} />
          </dl>
          <section className="cartao">
            <h2>Projetos apoiados</h2>
            {item.projetos.length ? <Tabela nome="Projetos apoiados" colunas={['Projeto', 'Valor destinado', ...(podeManter ? ['Ações'] : [])]}
              linhas={item.projetos.map((apoio) => [
                apoio.codigoProjeto, <LinkProjeto key="projeto" codigo={apoio.codigoProjeto} navegar={navegar} />, moeda.format(apoio.valorDestinado),
                ...(podeManter ? [<button key="remover" onClick={() => executar(() => removerAssociacao(perfil, id, apoio.codigoProjeto), 'Associação removida.')}>Remover</button>] : []),
              ])} /> : <p>Nenhum projeto associado.</p>}
            {podeManter && projetos && <Formulario salvar={({ codigoProjeto, valorDestinado }) => {
              associarFinanciamento(perfil, id, codigoProjeto, valorDestinado)
              atualizar((valor) => valor + 1)
              setMensagem('Projeto associado ao financiamento.')
            }} rotuloSalvar="Associar projeto" resetar>
              <label className="projeto-form__campo">Projeto
                <select name="codigoProjeto" required defaultValue="">
                  <option value="">Selecione</option>
                  {projetos.filter((projeto) => !item.projetos.some((apoio) => apoio.codigoProjeto === projeto.codigo))
                    .map((projeto) => <option value={projeto.codigo} key={projeto.codigo}>{projeto.titulo}</option>)}
                </select>
              </label>
              <CampoValor nome="valorDestinado" rotulo="Valor destinado (R$)" />
            </Formulario>}
            {podeManter && !projetos && !erroProjetos && <p role="status">Carregando projetos…</p>}
            {erroProjetos && <p role="alert">Não foi possível carregar os projetos. <button onClick={() => { setErroProjetos(false); setVersao((v) => v + 1) }}>Tentar novamente</button></p>}
          </section>
        </>
      ) : (
        <>
          <dl className="cartao dados"><Item rotulo="Tipo" valor={tiposProducao[item.tipo]} /><Item rotulo="Ano" valor={item.anoPublicacao} /><Item rotulo="Meio de divulgação" valor={item.meioDivulgacao} /></dl>
          <section className="cartao"><h2>Autores</h2><ol>{item.autores.map((autor) => <li key={autor.idParticipante}>{autor.nome}</li>)}</ol>
            <h2>Projetos vinculados</h2><ul>{item.projetos.map((codigo) => <li key={codigo}><LinkProjeto codigo={codigo} navegar={navegar} /></li>)}</ul>
          </section>
        </>
      )}
    </>
  }

  const selecionados = financiamento ? listarFinanciamentos(perfil, idAgencia) : listarProducoes({ ano, tipo })
  return <section className="cartao">
    {podeManter && <p><button className="primario" onClick={() => navegar(raiz + '/' + novo)}>{financiamento ? 'Novo financiamento' : 'Nova produção'}</button></p>}
    <div className="filtro">
      {financiamento ? <SeletorAgencia agencias={agencias} valor={idAgencia} alterar={setIdAgencia} /> : <>
        <label>Ano de publicação <input type="number" min="1" max="65535" value={ano} onChange={(evento) => setAno(evento.target.value)} /></label>
        <label>Tipo <select value={tipo} onChange={(evento) => setTipo(evento.target.value)}><option value="">Todos</option><Opcoes itens={tiposProducao} /></select></label>
      </>}
      {(idAgencia || ano || tipo) && <button onClick={() => { setIdAgencia(''); setAno(''); setTipo('') }}>Limpar filtros</button>}
    </div>
    {selecionados.length ? <Tabela nome={financiamento ? 'Financiamentos' : 'Produções'} colunas={financiamento
      ? ['Agência', 'Fomento', 'Total', 'Destinado', 'Saldo', 'Vigência'] : ['Título', 'Tipo', 'Ano', 'Autores', 'Projetos']}
      linhas={selecionados.map((registro) => [
        registro.id,
        <button key="abrir" className="link" onClick={() => navegar(raiz + '/' + registro.id)}>{financiamento ? registro.agencia?.nome : registro.titulo}</button>,
        ...(financiamento ? [
          tiposFomento[registro.tipoFomento], moeda.format(registro.valorTotal), moeda.format(registro.valorDestinado), moeda.format(registro.saldo),
          formatarData(registro.dataInicioVigencia) + ' a ' + formatarData(registro.dataFimVigencia),
        ] : [
          tiposProducao[registro.tipo], registro.anoPublicacao, registro.autores.map((autor) => autor.nome).join(', '), registro.projetos.join(', '),
        ]),
      ])} /> : <p role="status">{idAgencia || ano || tipo ? 'Nenhum registro corresponde aos filtros.' : 'Nenhum registro disponível.'}</p>}
  </section>
}

function Formulario({ salvar, cancelar, children, rotuloSalvar = 'Salvar', resetar = false }) {
  const [erro, setErro] = useState('')
  function enviar(evento) {
    evento.preventDefault()
    const formulario = evento.currentTarget
    try {
      salvar(Object.fromEntries(new FormData(formulario)))
      setErro('')
      if (resetar) formulario.reset()
    } catch (falha) {
      setErro(falha.message)
    }
  }
  return <form className="projeto-form" onSubmit={enviar}>
    {erro && <p role="alert" className="projeto-form__erro">{erro}</p>}
    <div className="projeto-form__campos">{children}</div>
    <div className="projeto-form__acoes">
      {cancelar && <button type="button" onClick={cancelar}>Cancelar</button>}
      <button className="primario">{rotuloSalvar}</button>
    </div>
  </form>
}

function FormularioProducao({ item, projetos, salvar, cancelar }) {
  const [autores, setAutores] = useState(item?.autores.map((autor) => autor.idParticipante) ?? [])
  const [selecionados, setSelecionados] = useState(item?.projetos ?? [])
  const pessoas = listarCadastros('participantes', 'Coordenador')
  function mover(indice, delta) {
    setAutores((lista) => {
      const copia = [...lista]
      const outro = indice + delta
      const atual = copia[indice]
      copia[indice] = copia[outro]
      copia[outro] = atual
      return copia
    })
  }
  return <Formulario salvar={(campos) => salvar({ ...campos, autores, projetos: selecionados })} cancelar={cancelar}>
    <label className="projeto-form__campo projeto-form__campo--largo">Título<input name="titulo" maxLength={250} defaultValue={item?.titulo} required /></label>
    <Seletor rotulo="Tipo" nome="tipo" opcoes={tiposProducao} valor={item?.tipo} />
    <label className="projeto-form__campo">Ano de publicação<input type="number" name="anoPublicacao" min="1" max="65535" defaultValue={item?.anoPublicacao} required /></label>
    <label className="projeto-form__campo projeto-form__campo--largo">Meio de divulgação<input name="meioDivulgacao" maxLength={200} defaultValue={item?.meioDivulgacao} required /></label>
    <fieldset className="projeto-form__campo--largo"><legend>Projetos vinculados</legend>
      {projetos.length ? projetos.map((projeto) => <label className="opcao-projeto" key={projeto.codigo}>
        <input type="checkbox" checked={selecionados.includes(projeto.codigo)} onChange={(evento) => {
          const marcado = evento.target.checked
          setSelecionados((lista) => marcado ? [...lista, projeto.codigo] : lista.filter((codigo) => codigo !== projeto.codigo))
        }} /> {projeto.titulo}
      </label>) : <p>Nenhum projeto sob sua coordenação.</p>}
    </fieldset>
    <fieldset className="projeto-form__campo--largo"><legend>Autores em ordem de autoria</legend>
      <label>Adicionar autor <select value="" onChange={(evento) => {
        const id = Number(evento.target.value)
        if (id) setAutores((lista) => [...lista, id])
      }}><option value="">Selecione</option>{pessoas.filter((pessoa) => !autores.includes(pessoa.id))
        .map((pessoa) => <option key={pessoa.id} value={pessoa.id}>{pessoa.nome}</option>)}</select></label>
      {autores.length ? <ol>{autores.map((id, indice) => {
        const nome = pessoas.find((pessoa) => pessoa.id === id)?.nome
        return <li key={id}><span>{nome}</span><div className="abas">
          <button type="button" disabled={indice === 0} onClick={() => mover(indice, -1)} aria-label={'Subir ' + nome}>Subir</button>
          <button type="button" disabled={indice === autores.length - 1} onClick={() => mover(indice, 1)} aria-label={'Descer ' + nome}>Descer</button>
          <button type="button" onClick={() => setAutores((lista) => lista.filter((autor) => autor !== id))} aria-label={'Remover ' + nome}>Remover</button>
        </div></li>
      })}</ol> : <p>Nenhum autor selecionado.</p>}
    </fieldset>
  </Formulario>
}

function Item({ rotulo, valor }) {
  return <div><dt>{rotulo}</dt><dd>{valor}</dd></div>
}

function LinkProjeto({ codigo, navegar }) {
  return <button className="link" onClick={() => navegar('/projetos/' + encodeURIComponent(codigo))}>{obterProjetoDemonstracao(codigo)?.titulo ?? codigo}</button>
}

function Tabela({ nome, colunas, linhas }) {
  return <div className="tabela" tabIndex={0} role="region" aria-label={nome}><table>
    <thead><tr>{colunas.map((coluna) => <th scope="col" key={coluna}>{coluna}</th>)}</tr></thead>
    <tbody>{linhas.map(([chave, ...celulas]) => <tr key={chave}>{celulas.map((celula, i) => <td key={colunas[i]}>{celula}</td>)}</tr>)}</tbody>
  </table></div>
}

function SeletorAgencia({ agencias, valor, alterar, obrigatorio = false }) {
  return <label className="projeto-form__campo">Agência
    <select name="idAgencia" value={alterar ? valor : undefined} defaultValue={alterar ? undefined : valor ?? ''} onChange={alterar ? (evento) => alterar(evento.target.value) : undefined} required={obrigatorio}>
      <option value="">{obrigatorio ? 'Selecione' : 'Todas'}</option>
      {agencias.map((agencia) => <option key={agencia.id} value={agencia.id}>{agencia.sigla} — {agencia.nome}</option>)}
    </select>
  </label>
}

function Seletor({ nome, rotulo, opcoes, valor }) {
  return <label className="projeto-form__campo">{rotulo}
    <select name={nome} defaultValue={valor ?? ''} required><option value="">Selecione</option><Opcoes itens={opcoes} /></select>
  </label>
}

function Opcoes({ itens }) {
  return Object.entries(itens).map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)
}

function CampoValor({ nome, rotulo, valor }) {
  return <label className="projeto-form__campo">{rotulo}<input name={nome} inputMode="decimal" pattern="(?!0+([.,]0+)?$)[0-9]{1,13}([.,][0-9]{1,2})?" maxLength={16} title="Informe um valor positivo com até duas casas decimais, por exemplo 250,50." defaultValue={valor?.replace('.', ',')} required /></label>
}
