(()=>{
'use strict';
const HASH='78a92c4c12acd7b3926fe3add32fb5d47463f254ee2e1cf2811ce1e8fa5447f3';
const W={Common:50,Uncommon:27,Rare:14,Epic:6,Legendary:2.7,Mythic:.3},TIERS=Object.keys(W);
const COL={Common:'#b2bdcf',Uncommon:'#83d9a2',Rare:'#7abaff',Epic:'#df9aff',Legendary:'#ffda67',Mythic:'#ae7bff'};
const TINT={normal:'',silver:'#d9e3f0',gold:'#f8d16d',platinum:'#b9fff0'};
const FP={normal:.975,silver:.02,gold:.004,platinum:.001};
const SRC=[['e','E','Common','éèêë','ēėę'],['t','T','Common','',''],['a','A','Common','áàâä','āăą'],['o','O','Common','óòôö','ōőơ'],['i','I','Common','íìîï','īįĭ'],
['n','N','Uncommon','ñ','ńň'],['s','S','Uncommon','śš','şș'],['r','R','Uncommon','ŕ','řŗ'],['h','H','Uncommon','',''],['d','D','Uncommon','',''],
['l','L','Rare','',''],['u','U','Rare','úùûü','ūůű'],['c','C','Rare','çć','čĉ'],['m','M','Rare','',''],['f','F','Rare','',''],['y','Y','Rare','ýÿ','ŷ'],
['w','W','Epic','',''],['g','G','Epic','',''],['p','P','Epic','',''],['b','B','Epic','',''],['v','V','Epic','',''],
['k','K','Legendary','',''],['x','X','Legendary','',''],['q','Q','Legendary','',''],['j','J','Legendary','',''],['z','Z','Legendary','',''],
['æ','Æ','Mythic','',''],['þ','Þ','Mythic','',''],['ð','Ð','Mythic','',''],['ƿ','Ƿ','Mythic','',''],['œ','Œ','Mythic','',''],['α','Α','Mythic','',''],['δ','Δ','Mythic','','',1],['β','Β','Mythic','',''],['π','Π','Mythic','',''],['σ','Σ','Mythic','','',1],['ω','Ω','Mythic','','',1],['ψ','Ψ','Mythic','',''],['φ','Φ','Mythic','',''],['ξ','Ξ','Mythic','','']];
const LET=SRC.map(([base,upper,tier,basic,rare,iface])=>({base,upper,tier,basic:[...basic],rare:[...rare],iface:!!iface}));
const COUNT={};LET.forEach(l=>COUNT[l.tier]=(COUNT[l.tier]||0)+1);
let mode='idle',layers={},items=[],current=null,playing=false,rolling=false,seq=0,stageEl,glyphEl,labelEl,ifaceEl,listEl,msgEl,animEl,cutEl,luckEl,rollBtn,form={};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function el(tag,props,...kids){const e=document.createElement(tag);for(const [k,v] of Object.entries(props||{})){if(k==='style')e.style.cssText=v;else if(k in e)e[k]=v;else e.setAttribute(k,v)}e.append(...kids);return e}
function number(n){return n<100?n.toLocaleString(undefined,{maximumFractionDigits:2}):Math.round(n).toLocaleString()}
async function digest(text){if(!(window.crypto&&crypto.subtle))return '';const buffer=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('glyph|'+text));return [...new Uint8Array(buffer)].map(b=>b.toString(16).padStart(2,'0')).join('')}
function build(o){const lt=o.lt,pool=o.accent==='basic'?lt.basic:o.accent==='rare'?lt.rare:[lt.base],base=pool[o.index]||pool[0];
 const glyph=o.upper?(o.accent==='none'?lt.upper:base.toUpperCase()):base;
 const accentP=o.accent==='basic'?.01/lt.basic.length:o.accent==='rare'?.001/lt.rare.length:(lt.basic.length?.989:1);
 const ifaceP=lt.iface?(o.form==='interface'?.0001:.9999):1;
 const p=W[lt.tier]/100/COUNT[lt.tier]*(o.upper?.25:.75)*accentP*FP[o.finish]*ifaceP;
 return {id:'s'+(++seq),base:lt.base,glyph,tier:lt.tier,uppercase:!!o.upper,accent:o.accent,finish:o.finish,form:o.form,variant:[lt.base,glyph,o.upper?'U':'L',o.accent,o.finish,o.form].join('|'),probability:p,actual_probability:p,value:1/p/100,roll_luck:1}}
function randomItem(luck){const weights=TIERS.map(t=>W[t]*(t==='Common'||t==='Uncommon'?1:luck)),sum=weights.reduce((a,b)=>a+b,0);let r=Math.random()*sum,i=0;while(i<TIERS.length-1&&r>=weights[i]){r-=weights[i];i++}
 const tier=TIERS[i],pool=LET.filter(l=>l.tier===tier),lt=pool[Math.floor(Math.random()*pool.length)],upper=Math.random()<.25;let accent='none',index=0;
 if(lt.basic.length){const a=Math.random();if(a<.001){accent='rare';index=Math.floor(Math.random()*lt.rare.length)}else if(a<.011){accent='basic';index=Math.floor(Math.random()*lt.basic.length)}}
 const f=Math.random(),finish=f<.001?'platinum':f<.005?'gold':f<.025?'silver':'normal',form=lt.iface&&Math.random()<.0001?'interface':'normal';
 const item=build({lt,accent,index,upper,finish,form});item.roll_luck=luck;item.actual_probability=item.probability*(weights[i]/sum)/(W[tier]/100);return item}
function desc(x){return `${x.uppercase?'Uppercase':'Lowercase'} ${x.accent!=='none'?x.accent+' accent ':''}${x.finish!=='normal'?x.finish+' ':''}${x.tier}${x.form==='interface'?' Interface':''}`}
function qualifies(x){return 1/x.probability>1000&&!(['Common','Uncommon'].includes(x.tier)&&(x.finish!=='normal'||x.accent!=='none'))}
function say(text){if(msgEl)msgEl.textContent=text}
function show(x){current=x;const c=COL[x.tier];stageEl.classList.remove('flash','fxRare','shine');void stageEl.offsetWidth;stageEl.style.setProperty('--tier',c);stageEl.style.setProperty('--glow',c+'aa');stageEl.style.setProperty('--shine',TINT[x.finish]||'transparent');
 glyphEl.textContent=x.glyph;glyphEl.style.color=TINT[x.finish]||c;glyphEl.style.textShadow='0 0 40px '+c+'88';
 labelEl.replaceChildren(el('strong',{style:'color:'+c},desc(x)),el('div',{},'Base odds: 1 in '+number(1/x.probability)),el('div',{},'Value: '+(x.value).toLocaleString(undefined,{maximumFractionDigits:2})),...(x.roll_luck!==1?[el('div',{},`At ×${x.roll_luck} luck: 1 in ${number(1/x.actual_probability)}`)]:[]));
 ifaceEl.replaceChildren();if(x.form==='interface'&&typeof interfacePreview==='function')ifaceEl.append(interfacePreview(x));
 if(animEl.checked){if(x.tier==='Legendary'||x.tier==='Mythic')stageEl.classList.add('flash');else if(x.tier==='Rare'||x.tier==='Epic')stageEl.classList.add('fxRare');if(x.finish!=='normal')stageEl.classList.add('shine')}}
async function scene(x){const layer=document.getElementById('cutscene');if(playing||!layer||typeof cutscene!=='function'){if(!layer||typeof cutscene!=='function')say('Cutscenes are unavailable on this page.');return}
 playing=true;const parent=layer.parentNode,next=layer.nextSibling;try{stageEl.append(layer);await cutscene(x)}finally{if(next&&next.parentNode===parent)parent.insertBefore(layer,next);else if(parent)parent.append(layer);playing=false}}
function renderList(){listEl.replaceChildren();for(const x of items){const b=el('button',{type:'button',title:desc(x)+' · 1 in '+number(1/x.probability),style:'min-width:46px;font:26px Georgia,serif;padding:7px 10px;color:'+(TINT[x.finish]||COL[x.tier])},x.glyph);b.onclick=()=>show(x);listEl.append(b)}}
async function present(x,cut){items.unshift(x);items.length=Math.min(items.length,80);if(cut&&cutEl.checked&&qualifies(x))await scene(x);show(x);renderList()}
function readLuck(){const n=Number(luckEl.value);if(!(n>0)||!Number.isFinite(n)){say('Luck must be greater than 0.');return null}say('');return Math.min(n,1e300)}
async function sandboxRoll(){if(rolling||playing)return;const luck=readLuck();if(luck===null)return;rolling=true;rollBtn.disabled=true;try{
 if(animEl.checked){for(let i=0;i<10;i++){glyphEl.textContent=LET[Math.floor(Math.random()*LET.length)].base;glyphEl.style.color='#929bb2';await sleep(40+i*8)}}
 await present(randomItem(luck),true)}finally{rolling=false;if(rollBtn)rollBtn.disabled=false}}
function formItem(){const lt=LET.find(l=>l.base===form.letter.value),accent=form.accent.value;return build({lt,accent,index:Number(form.glyph.value)||0,upper:form.casing.value==='upper',finish:form.finish.value,form:form.form.value})}
function syncForm(){const lt=LET.find(l=>l.base===form.letter.value);for(const o of form.accent.options)o.disabled=(o.value==='basic'&&!lt.basic.length)||(o.value==='rare'&&!lt.rare.length);if(form.accent.selectedOptions[0]?.disabled)form.accent.value='none';
 const pool=form.accent.value==='basic'?lt.basic:form.accent.value==='rare'?lt.rare:[];form.glyph.replaceChildren(...pool.map((g,i)=>el('option',{value:String(i)},g)));form.glyph.disabled=!pool.length;form.form.disabled=!lt.iface;if(!lt.iface)form.form.value='normal'}
function field(label,control){return el('label',{style:'display:grid;gap:4px;font-size:12px;color:#aab2c4'},label,control)}
function select(options,value){const s=el('select');for(const [v,t] of options)s.append(el('option',{value:v},t));if(value)s.value=value;return s}
function pauseMainGame(){try{if(typeof autoTimer!=='undefined')clearTimeout(autoTimer)}catch{}const a=document.getElementById('auto');if(a)a.checked=false}
function enter(){mode='sandbox';pauseMainGame();
 stageEl=el('div',{className:'stage'});glyphEl=el('div',{style:'font:130px Georgia,serif;z-index:1;color:#b9a3ff'},'?');labelEl=el('div',{style:'z-index:1;text-align:center;color:#a4acc0;min-height:78px'},'');ifaceEl=el('div',{style:'z-index:1;max-width:340px'});stageEl.append(glyphEl,labelEl,ifaceEl);
 animEl=el('input',{type:'checkbox',checked:true});cutEl=el('input',{type:'checkbox',checked:true});luckEl=el('input',{type:'number',value:'1',min:'0',step:'any',style:'width:120px'});
 rollBtn=el('button',{type:'button',className:'primary'},'Roll');rollBtn.onclick=()=>sandboxRoll();
 form={letter:select(LET.map(l=>[l.base,`${l.base} / ${l.upper} · ${l.tier}`]),'e'),accent:select([['none','No accent'],['basic','Basic accent'],['rare','Rare accent']]),glyph:select([]),casing:select([['lower','Lowercase'],['upper','Uppercase']]),finish:select([['normal','Normal'],['silver','Silver'],['gold','Gold'],['platinum','Platinum']]),form:select([['normal','Normal'],['interface','Interface']])};
 form.letter.onchange=form.accent.onchange=syncForm;syncForm();
 const give=el('button',{type:'button',className:'primary'},'Give');give.onclick=()=>playing?undefined:present(formItem(),true);
 const preview=el('button',{type:'button'},'Play cutscene');preview.onclick=async()=>{if(playing)return;const x=formItem();show(x);await scene(x)};
 const effect=el('button',{type:'button'},'Show effect');effect.onclick=()=>show(formItem());
 const clear=el('button',{type:'button'},'Clear list');clear.onclick=()=>{items=[];renderList()};
 listEl=el('div',{style:'display:flex;gap:7px;flex-wrap:wrap;margin-top:10px;min-height:46px'});msgEl=el('div',{style:'color:#ff8c9d;min-height:18px;margin-top:8px;font-size:12px'});
 const left=el('div',{className:'zq-panel'},el('div',{style:'font-weight:800;color:#b9a3ff;letter-spacing:2px;font-size:11px'},'SANDBOX'),stageEl,el('div',{className:'zq-row'},field('Luck ×',luckEl),rollBtn,el('label',{className:'zq-inline'},animEl,'Animations'),el('label',{className:'zq-inline'},cutEl,'Cutscenes on roll')),msgEl);
 const right=el('div',{className:'zq-panel'},el('h3',{style:'margin:0 0 8px'},'Give a letter'),el('div',{className:'zq-fields'},field('Letter',form.letter),field('Accent',form.accent),field('Accent letter',form.glyph),field('Case',form.casing),field('Finish',form.finish),field('Form',form.form)),el('div',{className:'zq-row'},give,preview,effect),el('h3',{style:'margin:18px 0 0'},'Items'),listEl,el('div',{className:'zq-row'},clear));
 const layer=el('div',{className:'zq-layer'},el('div',{className:'zq-wrap'},el('div',{className:'zq-grid'},left,right)));layers.box=layer;document.body.append(layer);renderList()}
function closeLayer(name){if(layers[name]){layers[name].remove();delete layers[name]}}
function exit(){try{if(typeof skipScene==='function')skipScene()}catch{}closeLayer('confirm');closeLayer('prompt');closeLayer('box');mode='idle';items=[];current=null;rolling=false}
function openPrompt(){mode='prompt';const input=el('input',{type:'text',autocomplete:'off',spellcheck:false,autocapitalize:'off',style:'width:min(360px,80vw);text-align:center;font-size:16px'});input.setAttribute('autocorrect','off');
 input.onkeydown=async ev=>{if(ev.key==='Escape'){closeLayer('prompt');mode='idle';return}if(ev.key!=='Enter')return;ev.preventDefault();const typed=input.value;input.value='';if(mode==='prompt'&&await digest(typed)===HASH&&mode==='prompt'){closeLayer('prompt');enter()}};
 const layer=el('div',{className:'zq-layer zq-center',style:'background:#050609'},el('div',{style:'font:22px Georgia,serif;color:#cfd3e2'},'yesterday i went outside'),input);layers.prompt=layer;document.body.append(layer);input.focus()}
function openConfirm(){mode='confirm';const word=el('span',{},'leave');word.onclick=exit;
 const yes=el('button',{type:'button'},'Yes'),no=el('button',{type:'button'},'No');yes.onclick=no.onclick=()=>{closeLayer('confirm');mode='sandbox'};
 const layer=el('div',{className:'zq-layer zq-center',style:'z-index:100001;background:#050609d9'},el('div',{className:'zq-panel',style:'text-align:center'},el('div',{style:'font-size:17px;margin-bottom:14px'},'Are you sure you want to ',word,' debug mode?'),el('div',{className:'zq-row',style:'justify-content:center'},yes,no)));layers.confirm=layer;document.body.append(layer)}
const style=el('style',{},`.zq-layer{position:fixed;inset:0;z-index:100000;overflow:auto;background:#0c0e14;color:#edf0fa;font:14px system-ui,sans-serif}.zq-center{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px}.zq-wrap{max-width:1050px;margin:auto;padding:20px 14px}.zq-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(280px,.85fr);gap:16px}.zq-panel{background:#141823;border:1px solid #282d3c;border-radius:16px;padding:16px}.zq-row{display:flex;gap:9px;flex-wrap:wrap;align-items:end;margin-top:12px}.zq-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px}.zq-inline{display:flex;gap:6px;align-items:center;font-size:12px;color:#aab2c4}.zq-layer input:not([type=checkbox]),.zq-layer select{background:#10131c;border:1px solid #33394a;color:#edf0fa;border-radius:8px;padding:8px;min-width:0}.zq-layer button{background:#10131c;border:1px solid #3a4054;color:#edf0fa;border-radius:9px;padding:9px 12px;cursor:pointer}.zq-layer button.primary{background:#b9a3ff;color:#181326;border:0;font-weight:800}.zq-layer button:disabled{opacity:.5}@media(max-width:800px){.zq-grid{grid-template-columns:1fr}}`);
document.head.append(style);
window.addEventListener('keydown',ev=>{if(!(ev.ctrlKey&&!ev.altKey&&!ev.shiftKey&&!ev.metaKey&&(ev.code==='Digit0'||ev.code==='Numpad0')))return;ev.preventDefault();ev.stopPropagation();if(ev.repeat)return;
 if(mode==='idle')openPrompt();else if(mode==='prompt'){closeLayer('prompt');mode='idle'}else if(mode==='sandbox')openConfirm();else if(mode==='confirm'){closeLayer('confirm');mode='sandbox'}},true);
})();
