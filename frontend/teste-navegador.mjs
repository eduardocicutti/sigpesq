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
const server = await createServer({server:{host:'127.0.0.1',port:integrado ? 5191 : 0,strictPort:true}})
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
      throw Error('A interface não atingiu o estado esperado: ' + expressao)
    }
  if (integrado) {
    await call('browsingContext.navigate',{context,url,wait:'complete'})
    await aguardar("Boolean(document.querySelector('#login'))")
    await evaluate(`document.querySelector('#login').value=${JSON.stringify(process.env.TESTE_API_LOGIN)};
      document.querySelector('#senha').value=${JSON.stringify(process.env.TESTE_API_SENHA)};
      document.querySelector('form').requestSubmit()`)
    await aguardar("Boolean(document.querySelector('table tbody tr'))")
    await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Novo projeto').click()")
    await aguardar("Boolean(document.querySelector('[name=idCoordenador] option:nth-child(2)'))")
    const codigo='QA-'+Date.now()
    await evaluate(`const f=document.querySelector('form');for(const [k,v] of Object.entries({codigo:${JSON.stringify(codigo)},titulo:'Projeto de integração',descricao:'Verificação funcional',dataInicio:'2026-01-01',dataTermino:'2026-12-31',idCoordenador:f.elements.idCoordenador.options[1].value})){const e=f.elements[k];Object.getOwnPropertyDescriptor(Object.getPrototypeOf(e),'value').set.call(e,v);e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))}f.requestSubmit()`)
    const equipe = "document.querySelector('main h2')?.textContent==='Projeto de integração' && Boolean(document.querySelector('main li'))"
    await aguardar(equipe)
    await call('browsingContext.navigate',{context,url:url+'projetos/'+codigo,wait:'complete'})
    await aguardar(equipe)
    await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Sair').click()")
    await aguardar("Boolean(document.querySelector('#login'))")
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
