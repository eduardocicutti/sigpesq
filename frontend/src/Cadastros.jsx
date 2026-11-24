import { CampoCpf } from './Campos.jsx'
import { useState } from 'react'
import { excluirParticipante, listarCadastros, salvarCadastro, tiposPessoa } from './services/cadastros.js'
import { listarProjetosDoParticipante } from './services/projetos.js'
import { listarProducoes } from './services/resultados.js'

export default function Cadastros({ modulo, perfil, rota, navegar, formatarData }) {
  const [termo, setTermo] = useState('')
  const [tipo, setTipo] = useState('')
  const [erro, setErro] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const agencia = modulo === 'agencias'
  const caminho = '/' + modulo
  const segmento = rota.slice(caminho.length).split('/').filter(Boolean)
  const modo = segmento[0] === 'novo' ? 'novo' : segmento[1] === 'editar' ? 'editar' : 'consulta'
  const id = segmento[0] && modo !== 'novo' ? Number(segmento[0]) : null
  const registros = listarCadastros(modulo, perfil)
  const item = registros.find((registro) => registro.id === id)
  const adm = perfil === 'Administrador'

  function enviar(evento) {
    evento.preventDefault()
    try {
      const codigo = salvarCadastro(modulo, perfil, id, Object.fromEntries(new FormData(evento.currentTarget)))
      navegar(agencia ? caminho : caminho + '/' + codigo)
    } catch (falha) {
      setErro(falha.message)
    }
  }

  function excluir() {
    try {
      excluirParticipante(perfil, id)
      navegar(caminho)
    } catch (falha) {
      setErro(falha.message)
      setConfirmando(false)
    }
  }

  if (id !== null && !item) return <section className="cartao"><p role="status">Cadastro não encontrado.</p><button onClick={() => navegar(caminho)}>Voltar</button></section>
  if (modo !== 'consulta' && !adm) return <section className="cartao"><p role="alert">Seu perfil não pode manter este cadastro.</p><button onClick={() => navegar(caminho)}>Voltar</button></section>
  if (modo !== 'consulta') return (
    <form className="cartao projeto-form" onSubmit={enviar}>
      {erro && <p role="alert" className="projeto-form__erro">{erro}</p>}
      <div className="projeto-form__campos">
        <label className="projeto-form__campo projeto-form__campo--largo">Nome<input name="nome" maxLength={150} defaultValue={item?.nome} required /></label>
        {agencia ? (
          <label className="projeto-form__campo">Sigla<input name="sigla" maxLength={15} defaultValue={item?.sigla} required /></label>
        ) : (
          <>
            <label className="projeto-form__campo projeto-form__campo--largo">E-mail institucional<input name="emailInstitucional" type="email" maxLength={120} defaultValue={item?.emailInstitucional} required /></label>
            <label className="projeto-form__campo">CPF<CampoCpf key={id ?? "novo"} inicial={item?.cpf} /></label>
            <label className="projeto-form__campo">Tipo
              <select name="tipo" defaultValue={item?.tipo ?? ''} required>
                <option value="">Selecione</option>
                {Object.entries(tiposPessoa).map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
              </select>
            </label>
          </>
        )}
      </div>
      <div className="projeto-form__acoes">
        <button type="button" onClick={() => navegar(!agencia && item ? caminho + '/' + item.id : caminho)}>Cancelar</button>
        <button className="primario">Salvar</button>
      </div>
    </form>
  )

  if (item && !agencia) {
    const projetos = listarProjetosDoParticipante(item.id)
    const producoes = listarProducoes({ idParticipante: item.id })
    return (
      <>
        <h2>{item.nome}</h2>
        <div className="abas">
          <button onClick={() => navegar(caminho)}>Voltar à lista</button>
          {adm && <button className="primario" onClick={() => navegar(caminho + '/' + item.id + '/editar')}>Editar</button>}
          {adm && !confirmando && <button onClick={() => setConfirmando(true)}>Excluir</button>}
        </div>
        {confirmando && <p>Excluir este participante? <button onClick={excluir}>Confirmar exclusão</button> <button onClick={() => setConfirmando(false)}>Cancelar</button></p>}
        {erro && <p role="alert" className="projeto-form__erro">{erro}</p>}
        <dl className="cartao dados">
          <div><dt>Tipo</dt><dd>{tiposPessoa[item.tipo]}</dd></div>
          <div><dt>E-mail institucional</dt><dd>{item.emailInstitucional}</dd></div>
          {adm && <div><dt>CPF</dt><dd>{item.cpf}</dd></div>}
        </dl>
        <section className="cartao">
          <h2>Participação em projetos</h2>
          {projetos.length ? (
            <ul>{projetos.map((projeto) => (
              <li key={projeto.codigo}>
                <button className="link" onClick={() => navegar('/projetos/' + encodeURIComponent(projeto.codigo))}>{projeto.titulo}</button>
                <ul>{projeto.vinculos.map((vinculo) => (
                  <li key={vinculo.dataEntrada}>{formatarData(vinculo.dataEntrada)} · {vinculo.dataSaida ? formatarData(vinculo.dataSaida) : 'Ativo'}</li>
                ))}</ul>
              </li>
            ))}</ul>
          ) : <p>Nenhuma participação registrada.</p>}
        </section>
        <section className="cartao">
          <h2>Produções vinculadas</h2>
          {producoes.length ? <ul>{producoes.map((producao) => (
            <li key={producao.id}><button className="link" onClick={() => navegar('/producoes/' + producao.id)}>{producao.titulo}</button></li>
          ))}</ul> : <p>Nenhuma produção vinculada.</p>}
        </section>
      </>
    )
  }

  const consulta = termo.trim().toLocaleLowerCase('pt-BR')
  const encontrados = registros.filter((registro) =>
    (!tipo || registro.tipo === tipo)
    && (registro.nome + ' ' + (registro.sigla ?? registro.emailInstitucional)).toLocaleLowerCase('pt-BR').includes(consulta),
  )
  return (
    <section className="cartao">
      {adm && <p><button className="primario" onClick={() => navegar(caminho + '/novo')}>{agencia ? 'Nova agência' : 'Novo participante'}</button></p>}
      <div className="filtro">
        <label htmlFor="buscar-cadastro">{agencia ? 'Nome ou sigla' : 'Nome ou e-mail'}</label>
        <input id="buscar-cadastro" type="search" value={termo} onChange={(evento) => setTermo(evento.target.value)} />
        {!agencia && <>
          <label htmlFor="tipo-cadastro">Tipo</label>
          <select id="tipo-cadastro" value={tipo} onChange={(evento) => setTipo(evento.target.value)}>
            <option value="">Todos</option>
            {Object.entries(tiposPessoa).map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
          </select>
        </>}
      </div>
      {encontrados.length ? (
        <div className="tabela" role="region" aria-label={agencia ? 'Tabela de agências' : 'Tabela de participantes'} tabIndex={0}>
          <table>
            <thead><tr><th scope="col">Nome</th><th scope="col">{agencia ? 'Sigla' : 'E-mail institucional'}</th>{!agencia && <th scope="col">Tipo</th>}{agencia && adm && <th scope="col">Ações</th>}</tr></thead>
            <tbody>{encontrados.map((registro) => (
              <tr key={registro.id}>
                <td>{agencia ? registro.nome : <button className="link" onClick={() => navegar(caminho + '/' + registro.id)}>{registro.nome}</button>}</td>
                <td>{agencia ? registro.sigla : registro.emailInstitucional}</td>
                {!agencia && <td>{tiposPessoa[registro.tipo]}</td>}
                {agencia && adm && <td><button onClick={() => navegar(caminho + '/' + registro.id + '/editar')} aria-label={`Editar ${registro.nome}`}>Editar</button></td>}
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <p role="status">Nenhum cadastro corresponde à busca.</p>}
    </section>
  )
}
