import { useRef, useState } from 'react'
import { docentes, idDocenteDemonstracao, situacoes } from './services/projetos.js'
import './projetos-form.css'

export default function ProjetoForm({ modo, perfil, projeto, salvar, cancelar }) {
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [inicio, setInicio] = useState(projeto?.dataInicio ?? '')
  const operacaoAtiva = useRef(false)
  const novo = modo === 'novo'
  const apenasSituacao = modo === 'situacao'

  async function enviar(evento) {
    evento.preventDefault()
    if (operacaoAtiva.current) return
    const dados = Object.fromEntries(new FormData(evento.currentTarget))
    operacaoAtiva.current = true
    setSalvando(true)
    setErro('')
    try {
      await salvar(dados)
    } catch (falha) {
      setErro(falha.message || 'Não foi possível salvar o projeto.')
    } finally {
      operacaoAtiva.current = false
      setSalvando(false)
    }
  }

  return (
    <form className="cartao projeto-form" onSubmit={enviar} aria-busy={salvando}>
      {erro && <p className="projeto-form__erro" role="alert">{erro}</p>}
      <div className="projeto-form__campos">
        {!apenasSituacao && (
          <>
            <label className="projeto-form__campo">
              Código
              <input name="codigo" className="numero" required maxLength={20} defaultValue={projeto?.codigo} readOnly={!novo} />
            </label>
            <label className="projeto-form__campo projeto-form__campo--largo">
              Título
              <input name="titulo" required maxLength={200} defaultValue={projeto?.titulo} />
            </label>
            <label className="projeto-form__campo projeto-form__campo--largo">
              Descrição
              <textarea name="descricao" required rows={4} defaultValue={projeto?.descricao} />
            </label>
            <label className="projeto-form__campo">
              Início
              <input type="date" min="1000-01-01" max="9999-12-31" name="dataInicio" required value={inicio} onChange={(evento) => setInicio(evento.target.value)} />
            </label>
            <label className="projeto-form__campo">
              Término
              <input type="date" max="9999-12-31" name="dataTermino" required min={inicio || '1000-01-01'} defaultValue={projeto?.dataTermino} />
            </label>
            <label className="projeto-form__campo">
              Coordenação
              {novo && perfil === 'Administrador' ? (
                <select name="idCoordenador" required defaultValue="">
                  <option value="" disabled>Selecione um docente</option>
                  {Object.entries(docentes).map(([id, nome]) => <option value={id} key={id}>{nome}</option>)}
                </select>
              ) : (
                <input value={projeto?.coordenador ?? docentes[idDocenteDemonstracao]} readOnly />
              )}
            </label>
          </>
        )}
        {(novo || apenasSituacao) && (
          <label className="projeto-form__campo">
            Situação
            <select name="situacao" defaultValue={projeto?.situacao ?? 'EM_ANDAMENTO'} required>
              {Object.entries(situacoes).map(([valor, rotulo]) => <option value={valor} key={valor}>{rotulo}</option>)}
            </select>
          </label>
        )}
      </div>
      <div className="projeto-form__acoes">
        <button type="button" onClick={cancelar} disabled={salvando}>Cancelar</button>
        <button className="primario" type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
      </div>
    </form>
  )
}
