import { createServer } from 'vite'
import { spawn } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { setTimeout as delay } from 'node:timers/promises'

const integrado = process.env.VITE_MODO === 'api'
if (integrado && (!process.env.TESTE_API_LOGIN || !process.env.TESTE_API_SENHA)) {
  throw Error('Informe TESTE_API_LOGIN e TESTE_API_SENHA de uma base descartável. O teste cadastra um projeto.')
}
const proxy = process.env.TESTE_API_PORT ? {'/api':'http://127.0.0.1:' + Number(process.env.TESTE_API_PORT)} : undefined
const server = await createServer({mode:integrado ? 'development' : 'demo',server:{host:'127.0.0.1',port:integrado ? 5191 : 0,strictPort:true, ...(proxy ? {proxy} : {})}})
await server.listen()
const url = server.resolvedUrls.local[0]
const profile = await mkdtemp(join(tmpdir(),'sigpesq-firefox-'))
const firefox = spawn(process.env.FIREFOX || (process.platform === 'win32' ? 'C:/Program Files/Mozilla Firefox/firefox.exe' : 'firefox'),
  ['-headless','-no-remote','-profile',profile,'--remote-debugging-port','9324'],{stdio:'inherit'})
let ws
try {
  for(let i=0;i<60;i++){
    try {
      ws = new WebSocket('ws://127.0.0.1:9324/session')
      await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject})
      break
    } catch { await delay(200) }
  }
  assert.equal(ws.readyState,1,'Firefox indisponível')
  let id=0
  const pending=new Map()
  ws.onmessage=({data})=>{
    const m=JSON.parse(data), p=pending.get(m.id)
    if (!p) return
    pending.delete(m.id)
    if (m.type==='error') p.reject(Error(m.message))
    else p.resolve(m.result)
  }
  function call(method,params){return new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))})}
  await call('session.new',{capabilities:{}})
  const {context}=await call('browsingContext.create',{type:'tab'})
  async function evaluate(expression){
    const r=await call('script.evaluate',{expression,target:{context},awaitPromise:true})
    if(r.type==='exception')throw Error(r.exceptionDetails.text)
    return r.result.value
  }
  const aguardar = async expressao => {
      for (let i=0; i<100; i++) {
        if (await evaluate(expressao)) return
        await delay(100)
      }
      const alerta = await evaluate("document.querySelector('main [role=alert]')?.textContent ?? ''")
      throw Error('A interface não atingiu o estado esperado: ' + expressao + (alerta ? ' | ' + alerta : ''))
    }
  if (integrado) {
    await call('browsingContext.navigate',{context,url,wait:'complete'})
    await aguardar("Boolean(document.querySelector('#login'))")
    await evaluate(`document.querySelector('#login').value=${JSON.stringify(process.env.TESTE_API_LOGIN)};
      document.querySelector('#senha').value=${JSON.stringify(process.env.TESTE_API_SENHA)};
      document.querySelector('form').requestSubmit()`)
    await aguardar("[...document.querySelectorAll('h2')].some(h=>h.textContent==='Projetos por situação')")
    await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Ver projetos').click()")
    await aguardar("Boolean(document.querySelector('table tbody tr'))")
    await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Novo projeto').click()")
    await aguardar("Boolean(document.querySelector('[name=idCoordenador] option:nth-child(2)'))")
    const codigo='QA-'+Date.now()
    const coordenador = process.env.TESTE_COORD_ID ?? await evaluate("document.querySelector('[name=idCoordenador] option:nth-child(2)').value")
    await evaluate(`const f=document.querySelector('form');for(const [k,v] of Object.entries({codigo:${JSON.stringify(codigo)},titulo:'Projeto de integração',descricao:'Verificação funcional',dataInicio:'2026-01-01',dataTermino:'2026-12-31',idCoordenador:${JSON.stringify(coordenador)}})){const e=f.elements[k];Object.getOwnPropertyDescriptor(Object.getPrototypeOf(e),'value').set.call(e,v);e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))}f.requestSubmit()`)
    const equipe = "document.querySelector('main h2')?.textContent==='Projeto de integração' && Boolean(document.querySelector('main li'))"
    await aguardar(equipe)
    await call('browsingContext.navigate',{context,url:url+'projetos/'+codigo,wait:'complete'})
    await aguardar(equipe)
    await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Editar projeto').click()")
    await aguardar("document.querySelector('[name=titulo]')?.value==='Projeto de integração'")
    await evaluate(`const campo=document.querySelector('[name=titulo]');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(campo,'Projeto revisado no Firefox');
      campo.dispatchEvent(new Event('input',{bubbles:true}));
      campo.form.querySelector('[type=submit]').click()`)
    const editado = "document.querySelector('main h2')?.textContent==='Projeto revisado no Firefox' && Boolean(document.querySelector('main li'))"
    await aguardar(editado)
    await call('browsingContext.navigate',{context,url:url+'projetos/'+codigo,wait:'complete'})
    await aguardar(editado)
    console.log('Edição confirmada após recarga, com a equipe preservada.')
    const clicar = texto => evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent===${JSON.stringify(texto)}).click()`)
    const preencher = campos => evaluate(`for(const [nome,valor] of Object.entries(${JSON.stringify(campos)})){
      const campo=document.querySelector('[name='+nome+']');
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(campo),'value').set.call(campo,valor);
      campo.dispatchEvent(new Event('input',{bubbles:true}));campo.dispatchEvent(new Event('change',{bubbles:true}));
    }`)
    await clicar('Participantes')
    await aguardar("Boolean(document.querySelector('main li strong'))")
    await clicar('Novo cadastro')
    const cpf = String(Date.now()).slice(-11)
    const nome = 'Participante ' + codigo
    await preencher({nome,cpf,emailInstitucional:codigo.toLowerCase()+'@example.invalid',tipo:'DISCENTE'})
    await clicar('Salvar')
    await aguardar(`document.querySelector('main')?.textContent.includes(${JSON.stringify(nome)})`)
    await clicar('Agências')
    await aguardar("Boolean(document.querySelector('main li strong'))")
    await clicar('Produções')
    await aguardar("Boolean(document.querySelector('main li strong'))")
    await clicar('Auditoria')
    await aguardar("document.querySelector('main tbody')?.textContent.includes('UPDATE')")
    await clicar('Financiamentos')
    await aguardar("Boolean(document.querySelector('main li strong'))")
    await clicar('Novo financiamento')
    await aguardar("Boolean(document.querySelector('[name=valorTotal]'))")
    await evaluate("document.querySelector('[name=valorTotal]').focus()")
    const moeda = [...'abc23,45x6'].flatMap(value => [{type:'keyDown',value},{type:'keyUp',value}])
    await call('input.performActions',{context,actions:[{type:'key',id:'moeda',actions:moeda}]})
    assert.equal(await evaluate("document.querySelector('[name=valorTotal]').value"),'23,45')
    const agencia = await evaluate("document.querySelector('[name=idAgencia] option:nth-child(2)').value")
    await preencher({idAgencia:agencia,dataInicioVigencia:'2026-01-01',dataFimVigencia:'2026-12-31'})
    await clicar('Salvar financiamento')
    await aguardar("Boolean([...document.querySelectorAll('main li')].find(li=>li.textContent.includes('Total R$ 23,45') && li.textContent.includes('Saldo R$ 23,45')))")
    await evaluate("[...document.querySelectorAll('main li')].find(li=>li.textContent.includes('Total R$ 23,45') && li.textContent.includes('Saldo R$ 23,45')).querySelector('button').click()")
    await preencher({codigo,valor:'3,45'})
    await clicar('Vincular projeto')
    await aguardar(`document.querySelector('main')?.textContent.includes(${JSON.stringify(codigo + ' · Projeto revisado no Firefox · R$ 3,45')})`)
    await aguardar("document.querySelector('main')?.textContent.includes('Saldo R$ 20,00')")
    console.log('Cadastros, produções, auditoria e financiamentos carregados; dinheiro rejeitou letras no Firefox.')
    await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Sair').click()")
    await aguardar("Boolean(document.querySelector('#login'))")
    if (process.env.TESTE_COORD_LOGIN && process.env.TESTE_COORD_SENHA && process.env.TESTE_COORD_ID) {
      await evaluate(`document.querySelector('#login').value=${JSON.stringify(process.env.TESTE_COORD_LOGIN)};
        document.querySelector('#senha').value=${JSON.stringify(process.env.TESTE_COORD_SENHA)};
        document.querySelector('form').requestSubmit()`)
      await aguardar("document.querySelector('main h1')?.textContent==='Painel'")
      await call('browsingContext.navigate',{context,url:url+'projetos/'+codigo,wait:'complete'})
      await aguardar("[...document.querySelectorAll('button')].some(b=>b.textContent==='Alterar situação')")
      await clicar('Alterar situação')
      await preencher({situacao:'CONCLUIDO'})
      await clicar('Salvar')
      await aguardar("document.querySelector('main dd') && [...document.querySelectorAll('main dd')].some(d=>d.textContent==='Concluído')")
      await clicar('Vincular participante')
      await aguardar("Boolean(document.querySelector('[name=idParticipante] option:nth-child(2)'))")
      const participante = await evaluate(`[...document.querySelector('[name=idParticipante]').options].find(o=>o.textContent===${JSON.stringify(nome)}).value`)
      await preencher({idParticipante:participante,funcao:'BOLSISTA',dataEntrada:'2026-02-01'})
      await clicar('Salvar vínculo')
      const encerrar = 'Encerrar vínculo de ' + nome + ' (01/02/2026)'
      await aguardar(`[...document.querySelectorAll('button')].some(b=>b.textContent===${JSON.stringify(encerrar)})`)
      await clicar(encerrar)
      await preencher({dataSaida:'2026-03-01'})
      await clicar('Salvar vínculo')
      await aguardar(`document.querySelector('main')?.textContent.includes(${JSON.stringify(nome + ' · bolsista · 01/02/2026 a 01/03/2026')})`)
      await clicar('Produções')
      await clicar('Nova produção')
      await aguardar("Boolean(document.querySelector('[name=titulo]'))")
      await preencher({titulo:'Produção '+codigo,ano:'2026',meio:'Revista QA'})
      await evaluate(`[...document.querySelectorAll('[name=projetos]')].find(e=>e.parentElement.textContent.includes('Projeto revisado no Firefox')).click();
        const autor=[...document.querySelectorAll('select')].find(s=>s.options[0]?.textContent==='Selecione');
        autor.value=${JSON.stringify(participante)}; autor.dispatchEvent(new Event('change',{bubbles:true}));`)
      await clicar('Salvar produção')
      await aguardar(`[...document.querySelectorAll('main strong')].some(s=>s.textContent===${JSON.stringify('Produção '+codigo)})`)
      const producao = 'Produção '+codigo
      const acaoProducao = (titulo,acao) => evaluate(`[...document.querySelectorAll('main strong')].find(s=>s.textContent===${JSON.stringify(titulo)}).closest('li').querySelectorAll('button')[${acao}].click()`)
      await acaoProducao(producao,0)
      await aguardar("Boolean(document.querySelector('[name=meio]'))")
      await preencher({titulo:producao+' revisada'})
      await clicar('Salvar produção')
      await aguardar(`[...document.querySelectorAll('main strong')].some(s=>s.textContent===${JSON.stringify(producao+' revisada')})`)
      await evaluate('window.confirm=()=>true')
      await acaoProducao(producao+' revisada',1)
      await aguardar(`Boolean(document.querySelector('main ul')) && ![...document.querySelectorAll('main strong')].some(s=>s.textContent===${JSON.stringify(producao+' revisada')})`)
      await clicar('Sair')
      await aguardar("Boolean(document.querySelector('#login'))")
      await preencher({login:process.env.TESTE_API_LOGIN,senha:process.env.TESTE_API_SENHA})
      await clicar('Entrar')
      await aguardar("document.querySelector('main h1')?.textContent==='Painel'")
      await call('browsingContext.navigate',{context,url:url+'projetos/'+codigo,wait:'complete'})
      await aguardar("[...document.querySelectorAll('button')].some(b=>b.textContent==='Trocar coordenação')")
      await clicar('Trocar coordenação')
      await aguardar("Boolean(document.querySelector('[name=idCoordenador] option:nth-child(2)'))")
      const novoDocente = await evaluate("document.querySelector('[name=idCoordenador] option:nth-child(2)').textContent")
      await preencher({idCoordenador:await evaluate("document.querySelector('[name=idCoordenador] option:nth-child(2)').value")})
      await clicar('Confirmar troca')
      await aguardar(`[...document.querySelectorAll('main dd')].some(v=>v.textContent===${JSON.stringify(novoDocente)})`)
      await clicar('Sair')
      await aguardar("Boolean(document.querySelector('#login'))")
      console.log('Coordenador alterou situação, abriu e encerrou vínculo, cadastrou, editou e excluiu produção; administrador trocou a coordenação.')
    }
    if (process.env.TESTE_GESTOR_LOGIN && process.env.TESTE_GESTOR_SENHA) {
      await preencher({login:process.env.TESTE_GESTOR_LOGIN,senha:process.env.TESTE_GESTOR_SENHA})
      await clicar('Entrar')
      await aguardar("document.querySelector('main h1')?.textContent==='Painel'")
      await clicar('Consultas')
      await evaluate("const e=document.querySelector('main select'); e.value='RF19';e.dispatchEvent(new Event('change',{bubbles:true}))")
      await clicar('Executar consulta')
      await aguardar("document.querySelector('main thead')?.textContent.includes('Agência') && Boolean(document.querySelector('main tbody tr'))")
      await clicar('Financiamentos')
      await aguardar("Boolean(document.querySelector('main li strong'))")
      assert.equal(await evaluate("[...document.querySelectorAll('main button')].some(b=>['Novo financiamento','Editar','Excluir'].includes(b.textContent))"),false)
      await clicar('Sair')
      await aguardar("Boolean(document.querySelector('#login'))")
      console.log('Gestor executou RF19 e consultou financiamentos sem ações de manutenção.')
    }
    console.log('Login, listagem, cadastro, equipe, persistência após recarga e logout validados.',codigo)
  } else for(const width of [360,768,1440]){
    await call('browsingContext.setViewport',{context,viewport:{width,height:900}})
    for(const [perfil,login] of Object.entries({Administrador:'admin',Coordenador:'coordenador',Participante:'participante',Gestor:'gestor'})){
      await call('browsingContext.navigate',{context,url,wait:'complete'})
      await aguardar("document.activeElement === document.querySelector('h1') && !!document.querySelector('#senha')")
      await evaluate("document.querySelector('#senha').focus()")
      await call('input.performActions',{context,actions:[{type:'key',id:'teclado',actions:[{type:'keyDown',value:'\uE004'},{type:'keyUp',value:'\uE004'},{type:'keyDown',value:'\uE007'},{type:'keyUp',value:'\uE007'}]}]})
      assert.equal(await evaluate("document.querySelector('#senha').type"),'text')
      await evaluate(`document.querySelector('#perfil').value='${perfil}';document.querySelector('#perfil').dispatchEvent(new Event('change',{bubbles:true}))`)
      await evaluate(`for(const [id,value] of [['login','${login}'],['senha','sigpesq-demo']]){const el=document.getElementById(id);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}))}document.querySelector('form').requestSubmit()`)
      const count=await evaluate("document.querySelectorAll('nav button').length")
      assert.ok(count>3,perfil)
      for(let i=0;i<count;i++){
        await evaluate(`document.querySelectorAll('nav button')[${i}].click()`)
        assert.ok(await evaluate("Boolean(document.querySelector('h1')?.textContent)"))
        assert.ok(await evaluate("document.documentElement.scrollWidth<=innerWidth"),await evaluate('location.pathname')+' '+width)
      }
      console.log(perfil,width,count,'destinos')
      const route=async path=>evaluate(`history.pushState(null,'',${JSON.stringify(path)});dispatchEvent(new PopStateEvent('popstate'))`)
      if(perfil==='Administrador'){
        await route('/financiamentos/novo')
        await evaluate("document.querySelector('[name=valorTotal]').focus()")
        const actions = [...'abc23,45x6'].flatMap(value => [
          {type:'keyDown',value}, {type:'keyUp',value},
        ])
        await call('input.performActions',{context,actions:[{type:'key',id:'valor',actions}]})
        assert.equal(await evaluate("document.activeElement.value"),'23,45')
        await evaluate(`const campo=document.activeElement
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(campo,'asdfasrd23qw423')
          campo.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertFromPaste'}))`)
        assert.equal(await evaluate("document.activeElement.value"),'23,45')
      }
      if(perfil==='Administrador' || perfil==='Coordenador'){
        await route('/projetos/novo')
        assert.equal(await evaluate("document.querySelector('form').checkValidity()"),false)
        await evaluate(`const f=document.querySelector('form');for(const [k,v] of Object.entries({codigo:'QA-01',titulo:'Projeto de teste',descricao:'Descrição de teste',dataInicio:'2026-01-01',dataTermino:'2026-12-31',idCoordenador:'1'})){const e=f.elements[k];if(e){Object.getOwnPropertyDescriptor(Object.getPrototypeOf(e),'value').set.call(e,v);e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))}}f.requestSubmit()`)
        assert.equal(await evaluate("document.querySelector('h1').textContent"),'Projeto de teste')
      }else{
        await route('/auditoria')
        assert.equal(await evaluate("document.querySelector('h1').textContent"),'Acesso negado')
      }
    }
  }
} finally {ws?.close();firefox.kill();await server.close()}
