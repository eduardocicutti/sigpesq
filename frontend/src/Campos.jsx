import { useState } from 'react'

export function CampoValor({ nome, rotulo, valor }) {
  const [texto, setTexto] = useState(valor?.replace('.', ',') ?? '')
  return <label className="projeto-form__campo">{rotulo}
    <input name={nome} inputMode="decimal" value={texto} required
      pattern="(?!0+([.,]0+)?$)[0-9]{1,13}([.,][0-9]{1,2})?"
      title="Informe um valor positivo com até duas casas decimais, por exemplo 250,50."
      onChange={({ target }) => {
        if (/^(?:[0-9]{1,13}(?:[.,][0-9]{0,2})?)?$/.test(target.value)) setTexto(target.value)
      }} />
  </label>
}

export function CampoCpf({ inicial = '' }) {
  const [texto, setTexto] = useState(inicial)
  return <input name="cpf" inputMode="numeric" value={texto} required
    pattern="[0-9]{11}|[0-9]{3}[.][0-9]{3}[.][0-9]{3}-[0-9]{2}"
    title="Informe os 11 dígitos, com ou sem pontuação."
    onChange={({ target }) => {
      if (/^(?:\d{0,11}|\d{3}\.\d{0,3}|\d{3}\.\d{3}\.\d{0,3}|\d{3}\.\d{3}\.\d{3}-\d{0,2})$/.test(target.value)) setTexto(target.value)
    }} />
}

export function CampoAno({ inicial = '', value, alterar, ...props }) {
  const [interno, setInterno] = useState(String(inicial))
  return <input {...props} inputMode="numeric" value={value ?? interno} pattern="0*[1-9][0-9]*"
    title="Informe um ano entre 1 e 65535."
    onChange={({ target }) => {
      if (/^\d{0,5}$/.test(target.value) && Number(target.value) <= 65535) (alterar ?? setInterno)(target.value)
    }} />
}
