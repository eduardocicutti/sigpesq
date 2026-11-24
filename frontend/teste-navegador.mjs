import { createServer } from 'vite'
import { spawn } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { setTimeout as delay } from 'node:timers/promises'

const server = await createServer({server:{host:'127.0.0.1',port:0}})
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
  for(const width of [360,768,1440]){
    await call('browsingContext.setViewport',{context,viewport:{width,height:900}})
    for(const [perfil,login] of Object.entries({Administrador:'admin',Coordenador:'coordenador',Participante:'participante',Gestor:'gestor'})){
      await call('browsingContext.navigate',{context,url,wait:'complete'})
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
