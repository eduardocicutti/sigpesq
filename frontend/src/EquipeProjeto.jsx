import { useState } from 'react'
import {
  docentes, encerrarVinculo, funcoesEquipe, obterEquipeProjeto, pessoasDemonstracao,
  podeAlterarSituacao, trocarCoordenacao, vincularParticipante,
} from './services/projetos.js'

export default function EquipeProjeto({ perfil, projeto, formatarData, atualizar }) {
  const [formulario, setFormulario] = useState('')
  const [terminando, setTerminando] = useState(null)
  const [erro, setErro] = useState('')
  const equipe = obterEquipeProjeto(projeto.codigo)
  const podeManter = podeAlterarSituacao(perfil, projeto)

  async function enviar(evento) {
    evento.preventDefault()
    const dados = Object.fromEntries(new FormData(evento.currentTarget))
    try {
      if (formulario === 'troca') await trocarCoordenacao(perfil, projeto.codigo, dados.idCoordenador)
      else if (formulario === 'vinculo') await vincularParticipante(perfil, projeto.codigo, dados)
      else await encerrarVinculo(perfil, projeto.codigo, terminando.idParticipante, terminando.dataEntrada, dados.dataSaida)
      abrir('')
      atualizar(formulario === 'troca' ? 'Coordenação atualizada.' : 'Equipe atualizada.')
    } catch (falha) {
      setErro(falha.message)
    }
  }

  function abrir(modo, vinculo = null) {
    setErro('')
    setFormulario(modo)
    setTerminando(vinculo)
  }

  return (
    <>
      <h2>Equipe e histórico</h2>
      <div className="abas">
        {podeManter && <button onClick={() => abrir('vinculo')}>Vincular participante</button>}
        {perfil === 'Administrador' && <button onClick={() => abrir('troca')}>Trocar coordenação</button>}
      </div>
      <div className="tabela" tabIndex={0} role="region" aria-label="Histórico da equipe">
        <table>
          <thead><tr><th scope="col">Participante</th><th scope="col">Função</th><th scope="col">Entrada</th><th scope="col">Saída</th>{podeManter && <th scope="col">Ações</th>}</tr></thead>
          <tbody>{equipe.map((item) => (
            <tr key={item.idParticipante + '/' + item.dataEntrada}>
              <td>{pessoasDemonstracao[item.idParticipante]}</td>
              <td>{item.funcao === 'COORDENADOR' ? 'Coordenador' : funcoesEquipe[item.funcao]}</td>
              <td>{formatarData(item.dataEntrada)}</td>
              <td>{item.dataSaida ? formatarData(item.dataSaida) : 'Ativo'}</td>
              {podeManter && <td>{!item.dataSaida && item.funcao !== 'COORDENADOR' && (
                <button onClick={() => abrir('encerrar', item)} aria-label={`Encerrar vínculo de ${pessoasDemonstracao[item.idParticipante]}`}>Encerrar</button>
              )}</td>}
            </tr>
          ))}</tbody>
        </table>
      </div>
      {formulario && (
        <form key={formulario + (terminando?.idParticipante ?? '') + (terminando?.dataEntrada ?? '')} className="cartao projeto-form" onSubmit={enviar}>
          {erro && <p role="alert" className="projeto-form__erro">{erro}</p>}
          <div className="projeto-form__campos">
            {formulario === 'troca' && (
              <label className="projeto-form__campo">Novo docente coordenador
                <select name="idCoordenador" required defaultValue="">
                  <option value="">Selecione</option>
                  {Object.entries(docentes).filter(([id]) => Number(id) !== projeto.idCoordenador).map(([id, nome]) => <option value={id} key={id}>{nome}</option>)}
                </select>
              </label>
            )}
            {formulario === 'vinculo' && (
              <>
                <label className="projeto-form__campo">Participante
                  <select name="idParticipante" required defaultValue="">
                    <option value="">Selecione</option>
                    {Object.entries(pessoasDemonstracao).map(([id, nome]) => <option value={id} key={id}>{nome}</option>)}
                  </select>
                </label>
                <label className="projeto-form__campo">Função
                  <select name="funcao" required defaultValue="">
                    <option value="">Selecione</option>
                    {Object.entries(funcoesEquipe).map(([id, nome]) => <option value={id} key={id}>{nome}</option>)}
                  </select>
                </label>
                <label className="projeto-form__campo">Entrada<input name="dataEntrada" type="date" required /></label>
              </>
            )}
            {formulario === 'encerrar' && <p className="projeto-form__campo--largo">Encerrar vínculo de {pessoasDemonstracao[terminando.idParticipante]}.</p>}
            {formulario !== 'troca' && (
              <label className="projeto-form__campo">
                {formulario === 'encerrar' ? 'Saída' : 'Saída (opcional)'}
                <input name="dataSaida" type="date" required={formulario === 'encerrar'} min={terminando?.dataEntrada} />
              </label>
            )}
          </div>
          <div className="projeto-form__acoes">
            <button type="button" onClick={() => abrir('')}>Cancelar</button>
            <button className="primario">Salvar</button>
          </div>
        </form>
      )}
    </>
  )
}
