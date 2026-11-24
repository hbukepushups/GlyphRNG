/* Glyph Online: UI only. All item grants and economic mutations are database RPCs. */
'use strict';
const $=id=>document.getElementById(id), colors={Common:'#b2bdcf',Uncommon:'#83d9a2',Rare:'#7abaff',Epic:'#df9aff',Legendary:'#ffda67',Mythic:'#ae7bff'}, tint={normal:'',silver:'#d9e3f0',gold:'#f8d16d',platinum:'#b9fff0'};
const tiers=Object.keys(colors),cfg=window.GLYPH_CONFIG||{};
let client,session,data,marketData,busy=false,autoTimer,nextRoll=0,recipe=null,craftSelection=[],toastTimer,skipScene=null,currentTab='home';
let prefs={};try{prefs=JSON.parse(localStorage.getItem('glyph-online-prefs')||'{}')||{}}catch{}
const fmt=n=>Number(n).toLocaleString(undefined,{maximumFractionDigits:2}), rarity=p=>'1 in '+fmt(1/Number(p));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function node(tag,text,cls){const e=document.createElement(tag);if(text!==undefined&&text!==null)e.textContent=text;if(cls)e.className=cls;return e}
function button(text,fn,cls='quiet'){const b=node('button',text,cls);b.type='button';b.onclick=()=>safe(fn);return b}
function toast(s){$('toast').textContent=s;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4500)}
async function safe(fn){try{return await fn()}catch(e){$('auto').checked=false;clearTimeout(autoTimer);toast(e.message||String(e));console.error(e)}}
async function api(action,args={}){const {data,error}=await client.rpc('glyph_api',{action,args});if(error)throw error;return data}
function checkedValues(id){return [...$(id).querySelectorAll('input:checked')].map(x=>x.value)}
function setPrefs(){try{localStorage.setItem('glyph-online-prefs',JSON.stringify({animation:$('animation').checked,cutscenes:$('cutscenes').checked,tiers:checkedValues('tierStops'),letters:checkedValues('letterStops')}))}catch{}}
function desc(x){return `${x.glyph} · ${x.uppercase?'Uppercase':'Lowercase'} ${x.accent!=='none'?x.accent+' accent · ':''}${x.finish!=='normal'?x.finish+' ':''}${x.tier}${x.form==='interface'?' · Interface':''}`}
function itemLine(x){return desc(x)+' · value '+fmt(x.value)+' · '+x.id.slice(0,8)}
function available(){return (data?.inventory||[]).filter(x=>!x.escrow)}
function avatar(path){const img=node('img',null,'avatar');img.alt='Profile';if(path)img.src=client.storage.from('avatars').getPublicUrl(path).data.publicUrl+'?v='+Date.now();return img}
function switchTab(tab){currentTab=tab;for(const e of document.querySelectorAll('.view'))e.classList.toggle('hidden',e.id!==tab);if(tab==='market')safe(loadMarket);if(tab==='leaderboard')safe(loadBoard)}
async function refresh(){data=await api('bootstrap');if(!data.profile){$('auth').classList.remove('hidden');$('setupBox').classList.remove('hidden');$('otpBox').classList.add('hidden');$('game').classList.add('hidden');$('nav').classList.add('hidden');$('email').disabled=true;$('password').required=false;$('authSubmit').classList.add('hidden');$('signup').classList.add('hidden');return}nextRoll=Date.parse(data.profile.next_roll);$('auth').classList.add('hidden');$('game').classList.remove('hidden');$('nav').classList.remove('hidden');render();switchTab(currentTab)}
function render(){const p=data.profile;$('userbox').replaceChildren();const u=node('div',null,'user');u.append(avatar(p.avatar_path),node('span',p.username),button('Sign out',async()=>{await client.auth.signOut();location.reload()}));$('userbox').append(u);$('total').textContent=fmt(p.total_rolls);$('value').textContent=fmt(data.inventory.reduce((a,x)=>a+Number(x.value),0));$('bonus').textContent=p.bonus_ready?'2× READY':`${p.total_rolls%10}/10`;
 $('buffs').replaceChildren();for(const b of data.buffs){const r=node('div',null,'listrow');r.append(node('span',`${b.recipe} · ${b.remaining} rolls`),node('small',`${b.luck}× luck · ${b.speed}× cooldown`));$('buffs').append(r)}if(!data.buffs.length)$('buffs').append(node('p','No active boosters. Visit Craft.','muted'));
 renderCollection();renderCatalog();renderRecipes();renderItemSelectors();renderStopFilters();}
function makeTile(x,count){const tile=node('button',null,'tile');tile.type='button';tile.title=desc(x)+' · '+rarity(x.probability)+' · value '+fmt(x.value);tile.style.borderColor=colors[x.tier]+'66';const l=node('div',x.glyph,'letter');l.style.color=tint[x.finish]||colors[x.tier];tile.append(l,node('small',x.form==='interface'?'Interface':x.finish==='normal'?x.tier:x.finish),node('small',fmt(x.value)));if(count)tile.append(node('span','×'+count,'count'));tile.onclick=()=>safe(()=>openStats(x.base,x));return tile}
function renderCollection(){const groups=new Map;for(const x of data.inventory){if(!groups.has(x.variant))groups.set(x.variant,{...x,count:0});groups.get(x.variant).count++}const list=[...groups.values()].sort((a,b)=>Number(b.value)-Number(a.value));$('collectionGrid').replaceChildren();for(const x of list){if($('collectionFilter').value!=='all'&&x.tier!==$('collectionFilter').value)continue;$('collectionGrid').append(makeTile(x,x.count))}if(!list.length)$('collectionGrid').append(node('p','No letters yet. Roll to begin.','empty'))}
function variantsFor(lt){const letters=[{glyph:lt.base,accent:'none'},...lt.basic_accents.map(glyph=>({glyph,accent:'basic'})),...lt.rare_accents.map(glyph=>({glyph,accent:'rare'}))];const result=[];for(const a of letters)for(const uppercase of [false,true])for(const finish of Object.keys(tint))for(const form of lt.interface_ok?['normal','interface']:['normal']){const glyph=uppercase?(a.accent==='none'?lt.upper_glyph:a.glyph.toUpperCase()):a.glyph;const variant=[lt.base,glyph,uppercase?'U':'L',a.accent,finish,form].join('|');result.push({base:lt.base,glyph,uppercase,accent:a.accent,finish,form,variant,tier:lt.tier})}return result}
function renderCatalog(){$('catalogGrid').replaceChildren();for(const lt of data.letters){if($('catalogFilter').value!=='all'&&lt.tier!==$('catalogFilter').value)continue;const known=data.discoveries.includes(lt.base),t=node('button',null,'tile');t.append(node('div',lt.base,'letter'),node('small',lt.tier),node('small',known?'Discovered':'Not rolled yet'));t.style.color=known?colors[lt.tier]:'#687185';t.onclick=()=>openCatalog(lt);$('catalogGrid').append(t)}}
function openCatalog(lt){$('detail').replaceChildren(node('h2',`${lt.base} / ${lt.upper_glyph} · ${lt.tier}`),node('p','Uppercase is visible. Other variants remain ? until you roll that exact form.'));const grid=node('div',null,'grid');for(const x of variantsFor(lt)){const plain=x.accent==='none'&&x.finish==='normal'&&x.form==='normal',known=data.variants.includes(x.variant),t=node('div',null,'tile');t.append(node('div',plain||known?x.glyph:'?','letter'),node('small',known?`${x.accent} · ${x.finish} · ${x.form}`:plain?'Base form':'Undiscovered variant'));if(known)t.style.color=tint[x.finish]||colors[x.tier];grid.append(t)}$('detail').append(grid,button('Your roll stats',()=>openStats(lt.base)));$('detailDialog').showModal()}
async function openStats(base,item){const s=await api('stats',{base});$('detail').replaceChildren(node('h2',base+' · Letter stats'));if(item){$('detail').append(node('p',desc(item)),node('p','Base rarity: '+rarity(item.probability)+' · Value '+fmt(item.value)),node('p','At-roll probability: '+rarity(item.actual_probability)+' · Luck '+item.roll_luck+'×'));if(item.form==='interface')$('detail').append(interfacePreview(item));}
 const stats=[['Times you rolled this base letter',s.roll_count],['Copies currently owned',s.owned_count],['Distinct rolled variants',s.variant_counts.length],['First rolled',s.first_roll?new Date(s.first_roll.created_at).toLocaleString():'Never'],['First-roll rarity',s.first_roll?rarity(s.first_roll.probability):'—'],['First-roll modifiers',s.first_roll?`${s.first_roll.uppercase?'Upper':'Lower'}case · ${s.first_roll.tier} · ${s.first_roll.finish} · ${s.first_roll.accent} · ${s.first_roll.form}`:'—'],['Best rolled rarity',s.best_roll?rarity(s.best_roll.probability):'—']];for(const [k,v] of stats){const row=node('div',null,'listrow');row.append(node('span',k),node('span',String(v)));$('detail').append(row)}if(!$('detailDialog').open)$('detailDialog').showModal();}
function interfacePreview(x){const d=node('div',null,'interface '+(x.base==='σ'?'sigma':x.base==='ω'?'omega':'delta'));d.append(node('div',x.glyph,'letter'),node('p',x.base==='δ'?'DELTA // CORE ONLINE · Blue primary / orange energy':x.base==='σ'?'SIGMA // EQUATION ENGINE · Purple primary / yellow conduits':'OMEGA // FACTORY HEART · Grey chassis / red particles'));return d}
function renderStopFilters(){if($('tierStops').children.length)return;for(const name of tiers){const lab=node('label',null,'row tiercheck'),c=node('input');c.type='checkbox';c.value=name;c.checked=(prefs.tiers||['Mythic']).includes(name);c.onchange=setPrefs;lab.append(c,node('span',name));$('tierStops').append(lab)}for(const lt of data.letters){const lab=node('label',null,'row tiercheck'),c=node('input');c.type='checkbox';c.value=lt.base;c.checked=(prefs.letters||[]).includes(lt.base);c.onchange=setPrefs;lab.append(c,node('span',lt.base));$('letterStops').append(lab)}}
function renderItemSelectors(){const old=$('postItem').value;$('postItem').replaceChildren(node('option','Select an item to list'));$('postItem').firstChild.value='';for(const x of available()){const op=node('option',itemLine(x));op.value=x.id;$('postItem').append(op)}if(available().some(x=>x.id===old))$('postItem').value=old;if(!$('wantBase').children.length)for(const lt of data.letters){const op=node('option',lt.base+' · '+lt.tier);op.value=lt.base;$('wantBase').append(op)}}
async function roll(){if(busy||Date.now()<nextRoll)return;busy=true;clearTimeout(autoTimer);$('roll').disabled=true;let res;try{res=await api('roll');nextRoll=Date.now()+Number(res.cooldown)*1000;const x=res.item;if($('animation').checked){$('result').textContent='Finding your letter…';for(let n=0;n<12;n++){$('glyph').textContent=data.letters[Math.floor(Math.random()*data.letters.length)].base;await wait(35+n*6)}}const high=1/Number(x.probability)>1000;const excluded=['Common','Uncommon'].includes(x.tier)&&(x.finish!=='normal'||x.accent!=='none');if(high&&!excluded&&$('cutscenes').checked)await cutscene(x);reveal(x,res.new_base);if(res.new_base||checkedValues('tierStops').includes(x.tier)||checkedValues('letterStops').includes(x.base)){$('auto').checked=false;toast(res.new_base?'New letter! Auto-roll paused.':'Auto-roll stop filter matched.')}await refresh();}finally{busy=false;updateCooldown();scheduleAuto()}}
function reveal(x,fresh){const st=$('stage');st.classList.remove('flash','fxRare','shine');void st.offsetWidth;st.style.setProperty('--tier',colors[x.tier]);st.style.setProperty('--glow',colors[x.tier]+'aa');st.style.setProperty('--shine',tint[x.finish]||'transparent');$('glyph').textContent=x.glyph;$('glyph').style.color=tint[x.finish]||colors[x.tier];$('newBadge').className='new';$('newBadge').textContent=fresh?'NEW LETTER':'';$('result').replaceChildren(node('strong',desc(x)),node('span',rarity(x.probability)+' · value '+fmt(x.value)));if($('animation').checked){if(['Legendary','Mythic'].includes(x.tier))st.classList.add('flash');else if(['Rare','Epic'].includes(x.tier))st.classList.add('fxRare');if(x.finish!=='normal')st.classList.add('shine')}$('latest').replaceChildren(makeTile(x),node('p',desc(x)),node('p','Rarity: '+rarity(x.probability)),node('p','Value: '+fmt(x.value)));if(x.form==='interface')$('latest').append(interfacePreview(x))}
function updateCooldown(){const r=Math.max(0,nextRoll-Date.now());$('roll').disabled=busy||r>0;$('roll').textContent=busy?'Rolling…':r?`Next roll in ${(r/1000).toFixed(1)}s`:'Roll a letter';$('cooldown').textContent=r?(r/1000).toFixed(1)+'s':'Ready'}
function scheduleAuto(){clearTimeout(autoTimer);if($('auto').checked&&!busy)autoTimer=setTimeout(()=>safe(roll),Math.max(100,nextRoll-Date.now()+60))}
// Each base has deterministic scene geometry and its own title/theme; mythics have custom scripts.
const lore={π:['THE CIRCLE KEEPER','A circumference traces infinity. Every orbit returns to one constant.'],σ:['THE SUM OF EVERYTHING','Terms accelerate. Sequences collide. A universe resolves into one sum.'],δ:['THE CHANGE ENGINE','A blue core wakes. Three gates turn. The difference becomes the signal.'],ω:['THE FINAL FOUNDRY','Conveyors halt beneath the last red star. The factory opens its final gate.'],α:['FIRST LIGHT','One point divides the dark. From the first spark, every sequence begins.'],β:['SECOND HORIZON','Two streams cross in perfect counterpoint. A new path opens.'],ψ:['TRIDENT OF THOUGHT','Three frequencies converge in an electric crown.'],φ:['GOLDEN CONTINUUM','A spiral folds through proportion, growing without end.'],ξ:['THE FOLDED SIGNAL','Three bands of static braid into a hidden transmission.'],æ:['THE ANCIENT LIGATURE','Two voices are pressed into a single luminous seal.'],þ:['THORN GATE','An ancient stone seal splits; a vertical blade of light rises.'],ð:['THE CROSSED ECHO','A spectral ring is crossed by a pulse from another age.'],ƿ:['WYNN SIGNAL','A forgotten branch returns to the living alphabet.'],œ:['THE TWIN SEAL','Two old orbits overlap, binding their light into one.']};
async function cutscene(x){const overlay=$('cutscene');overlay.classList.remove('hidden');const canvas=node('canvas');canvas.width=900;canvas.height=550;canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:-1;opacity:.85';overlay.prepend(canvas);const ctx=canvas.getContext('2d'),start=performance.now(),duration=6200,seed=[...x.base].reduce((a,c)=>a+c.codePointAt(0),0),isI=x.form==='interface',col=isI?(x.base==='δ'?'#4ba8ff':x.base==='σ'?'#b77bff':'#ff4545'):(tint[x.finish]||colors[x.tier]),secondary=x.base==='σ'?'#f9df6f':'#ff9d43';const [title,text]=lore[x.base]||[`${x.base.toUpperCase()} // RARE RESONANCE`,`Archive ${seed}: ${3+seed%7} gates align around the ${x.tier.toLowerCase()} seal. The ${x.base.toUpperCase()} signal emerges from the noise.`];overlay.style.setProperty('--scene',col);$('sceneArt').textContent='';$('sceneTitle').textContent='';$('sceneText').textContent='';let frame,done=false,resolveDone;const promise=new Promise(r=>resolveDone=r);function finish(){if(done)return;done=true;cancelAnimationFrame(frame);canvas.remove();overlay.classList.add('hidden');skipScene=null;resolveDone()}skipScene=finish;function draw(now){if(done)return;const elapsed=now-start,t=elapsed/1000;ctx.fillStyle='#030409';ctx.fillRect(0,0,900,550);ctx.save();ctx.translate(450,265);ctx.globalAlpha=Math.min(1,t/1.2);if(t<.65&&x.finish!=='normal'){ctx.fillStyle=col;ctx.globalAlpha=(1-t/.65)*.6;ctx.fillRect(-450,-265,900,550);ctx.globalAlpha=Math.min(1,t)}
 for(let i=0;i<60;i++){const angle=i*2.399+seed,tSpeed=.08+(i%7)*.015,r=70+(i*31%370);const px=Math.cos(angle+t*tSpeed)*r,py=Math.sin(angle+t*tSpeed)*r*.7;ctx.fillStyle=col;ctx.globalAlpha=.15+(i%5)*.12;ctx.fillRect(px,py,1+i%3,1+i%3)}ctx.globalAlpha=.85;ctx.strokeStyle=col;ctx.lineWidth=2;
 if(isI){ctx.rotate(t*.15);for(let j=0;j<3;j++){const r=90+j*45;ctx.strokeStyle=j%2?secondary:col;if(x.base==='ω'){ctx.strokeStyle='#9ba1a7';ctx.beginPath();for(let i=0;i<48;i++){const a=i*Math.PI/24,rr=r+(i%2?11:0);ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}ctx.closePath();ctx.stroke()}else{ctx.strokeRect(-r,-r,r*2,r*2);for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.fillStyle=secondary;ctx.fillRect(Math.cos(a)*r-4,Math.sin(a)*r-4,8,8)}}}ctx.rotate(-t*.15);if(x.base==='σ'&&Math.sin(t*9)>.7){ctx.fillStyle='#ff4b63';ctx.font='18px monospace';for(let i=0;i<5;i++)ctx.fillText(['Σ n² = n(n+1)(2n+1)/6','∫ e^x dx = e^x + C','lim(x→∞) Σ aₙ'][i%3],-180,-105+i*45)}}
 else if(x.base==='π'){for(let i=0;i<5;i++){ctx.beginPath();ctx.arc(0,0,45+i*25,0,Math.min(Math.PI*2,t*(1+i*.4)));ctx.stroke()}ctx.font='17px monospace';ctx.fillStyle=col;ctx.fillText('C = 2πr      A = πr²',-110,190)}
 else if(x.base==='σ'){ctx.fillStyle=col;ctx.font='20px monospace';for(let i=0;i<9;i++)ctx.fillText(['Σ aₙ = a₁ + a₂ + … + aₙ','∑ k = n(n + 1)/2','∑ x² − (∑ x)²/n'][i%3],-260+(i%3)*38,-180+((i*53+t*35)%350))}
 else{const sides=3+seed%7;for(let j=0;j<3;j++){ctx.save();ctx.rotate(t*(j%2?.15:-.15)+seed);ctx.beginPath();for(let i=0;i<=sides;i++){const a=i*Math.PI*2/sides,r=75+j*38;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r)}ctx.stroke();ctx.restore()}}
 ctx.restore();if(t>2.2){$('sceneArt').textContent=x.glyph;$('sceneTitle').textContent=isI?`${title} // INTERFACE`:title;$('sceneText').textContent=text}if(elapsed>=duration)finish();else frame=requestAnimationFrame(draw)}frame=requestAnimationFrame(draw);await promise}
function renderRecipes(){$('recipes').replaceChildren();for(const r of data.recipes){const row=node('div',null,'listrow'),info=node('div');info.append(node('h3',r.name),node('p',r.ingredients.map(i=>Object.entries(i).map(([k,v])=>k+': '+v).join(' + ')).join(' / ')),node('small',`${r.luck}× luck · ${r.speed}× cooldown · ${r.rolls} rolls`));row.append(info,button(recipe?.id===r.id?'Selected':'Select recipe',()=>{recipe=r;craftSelection=[];renderRecipes();renderCraftInventory()}));$('recipes').append(row)}renderCraftInventory()}
function renderCraftInventory(){$('craftInventory').replaceChildren();if(!recipe){$('craftInventory').append(node('p','Select a recipe first.','muted'));$('craftNow').disabled=true;return}const idx=craftSelection.length,needed=recipe.ingredients[idx];const info=node('p',needed?'Choose ingredient '+(idx+1)+': '+JSON.stringify(needed):'All ingredients selected. Review and craft.');info.style.gridColumn='1/-1';$('craftInventory').append(info);for(const x of available()){if(craftSelection.includes(x.id))continue;if(needed&&!Object.entries(needed).every(([k,v])=>x[k]===v))continue;if(!needed)break;const tile=makeTile(x);tile.onclick=()=>{craftSelection.push(x.id);renderCraftInventory()};$('craftInventory').append(tile)}if(craftSelection.length)$('craftInventory').append(button('Clear selection',()=>{craftSelection=[];renderCraftInventory()}));$('craftNow').disabled=craftSelection.length!==recipe.ingredients.length}
async function craft(){const chosen=craftSelection.map(id=>data.inventory.find(x=>x.id===id));if(!confirm(`Consume these exact items for ${recipe.name}?\n\n${chosen.map(itemLine).join('\n')}\n\nTotal consumed value: ${fmt(chosen.reduce((s,x)=>s+Number(x.value),0))}`))return;await api('craft',{recipe:recipe.id,items:[...craftSelection]});craftSelection=[];await refresh();toast('Booster crafted and activated.')}
async function loadMarket(){marketData=await api('market');$('marketPosts').replaceChildren();for(const p of marketData.posts){const row=node('div',null,'listrow'),info=node('div');info.append(node('b',p.username),node('p',p.kind==='have'?'Has: '+itemLine(p.item):`Wants: ${p.wanted_base} · ${p.wanted_finish} finish · ${p.wanted_form} form`));row.append(info);if(p.user_id===session.user.id)row.append(button('Cancel post',async()=>{if(confirm('Cancel this post and release all reserved items?')){await api('cancel_post',{post:p.id});await refresh()}}));else row.append(button('Make offer',()=>selectItems('Offer 1–8 items',async ids=>{const xs=ids.map(id=>data.inventory.find(x=>x.id===id));if(confirm('Reserve these exact items for your offer?\n'+xs.map(itemLine).join('\n'))){await api('offer',{post:p.id,items:ids});$('detailDialog').close();await refresh()}})));$('marketPosts').append(row)}if(!marketData.posts.length)$('marketPosts').append(node('p','No open posts yet.','empty'));
 $('offers').replaceChildren();for(const o of marketData.offers){const post=marketData.posts.find(p=>p.id===o.post_id);if(!post)continue;const row=node('div',null,'listrow'),info=node('div');info.append(node('b',o.username+' offered'),node('p',o.items.map(itemLine).join('\n')),node('small','Offer value: '+fmt(o.items.reduce((a,x)=>a+Number(x.value),0))));row.append(info);if(o.user_id===session.user.id)row.append(button('Withdraw',async()=>{if(confirm('Withdraw this offer?')){await api('cancel_offer',{offer:o.id});await refresh()}}));else{row.append(button('Reject',async()=>{if(confirm('Reject this offer?')){await api('reject',{offer:o.id});await refresh()}}));row.append(button('Accept',async()=>{if(post.kind==='want')selectItems('Choose payment (1–8 items)',ids=>acceptOffer(o,post,ids));else await acceptOffer(o,post,[])}))}$('offers').append(row)}}
function selectItems(title,onSubmit){$('detail').replaceChildren(node('h2',title),node('p','Reserved items are not available. Review each item ID and value.'));const selected=new Set,grid=node('div',null,'grid');for(const x of available()){const t=makeTile(x);t.onclick=()=>{if(selected.has(x.id)){selected.delete(x.id);t.style.outline=''}else if(selected.size<8){selected.add(x.id);t.style.outline='2px solid #b9a3ff'}};grid.append(t)}$('detail').append(grid,button('Review selected items',async()=>{if(!selected.size)throw Error('Select at least one item');await onSubmit([...selected])},'primary space'));if(!$('detailDialog').open)$('detailDialog').showModal()}
async function acceptOffer(o,p,ids){const giving=p.kind==='have'?[p.item]:ids.map(id=>data.inventory.find(x=>x.id===id));const args={offer:o.id};if(p.kind==='want')args.payment=ids;if(!confirm(`FINAL TRADE REVIEW\n\nYou give:\n${giving.map(itemLine).join('\n')}\nTotal: ${fmt(giving.reduce((a,x)=>a+Number(x.value),0))}\n\nYou receive:\n${o.items.map(itemLine).join('\n')}\nTotal: ${fmt(o.items.reduce((a,x)=>a+Number(x.value),0))}\n\nAccept this exact trade?`))return;await api('accept',args);$('detailDialog').close();await refresh();toast('Trade completed.')}
async function loadBoard(){const rows=await api('leaderboard');$('board').replaceChildren();rows.forEach((p,i)=>{const row=node('div',null,'listrow'),name=node('div',null,'row');name.append(node('b','#'+(i+1)),avatar(p.avatar_path),node('span',p.username));row.append(name,node('span',fmt(p.value)+' value'),node('small',fmt(p.total_rolls)+' rolls'));$('board').append(row)})}
async function uploadAvatar(){const f=$('avatarFile').files[0];if(!f)return;if(!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>10*1024*1024)throw Error('Use a PNG, JPEG, or WebP image under 10 MB');const bitmap=await createImageBitmap(f);const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d'),size=Math.min(bitmap.width,bitmap.height);ctx.drawImage(bitmap,(bitmap.width-size)/2,(bitmap.height-size)/2,size,size,0,0,256,256);bitmap.close();const blob=await new Promise(r=>canvas.toBlob(r,'image/webp',.85));if(!blob||blob.size>2*1024*1024)throw Error('Could not resize image');if(!confirm('Upload this image as your public profile picture?'))return;const path=session.user.id+'/avatar.webp';const {error}=await client.storage.from('avatars').upload(path,blob,{upsert:true,contentType:'image/webp'});if(error)throw error;await api('avatar',{path});await refresh();toast('Profile picture updated.')}
async function init(){if(!window.supabase||!cfg.supabaseUrl||cfg.supabaseUrl.includes('YOUR_PROJECT')){toast('Setup needed: edit config.js and run the database migration. See README.');$('authSubmit').disabled=true;$('signup').disabled=true;return}client=supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);const s=await client.auth.getSession();session=s.data.session;
 for(const id of ['animation','cutscenes']){$(id).checked=prefs[id]!==false;$(id).onchange=setPrefs}if(matchMedia('(prefers-reduced-motion: reduce)').matches){$('animation').checked=false;$('cutscenes').checked=false}$('stopNew').checked=true;$('stopNew').disabled=true;
 for(const id of ['collectionFilter','catalogFilter'])for(const tier of tiers){const op=node('option',tier);op.value=tier;$(id).append(op)}
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));$('collectionFilter').onchange=renderCollection;$('catalogFilter').onchange=renderCatalog;$('roll').onclick=()=>safe(roll);$('auto').onchange=scheduleAuto;$('skipScene').onclick=()=>skipScene?.();$('closeDialog').onclick=()=>$('detailDialog').close();$('craftNow').onclick=()=>safe(craft);$('avatarFile').onchange=()=>safe(uploadAvatar);$('refreshMarket').onclick=()=>safe(loadMarket);$('refreshBoard').onclick=()=>safe(loadBoard);
 $('postHave').onclick=()=>safe(async()=>{const id=$('postItem').value,x=data.inventory.find(x=>x.id===id);if(!x)throw Error('Choose an item');if(confirm('List and reserve this exact item?\n'+itemLine(x))){await api('post',{kind:'have',item:id});await refresh()}});
 $('postWant').onclick=()=>safe(async()=>{const args={kind:'want',base:$('wantBase').value,finish:$('wantFinish').value,form:$('wantForm').value};if(confirm(`Post a request for ${args.base}, finish ${args.finish}, form ${args.form}?`)){await api('post',args);await refresh()}});
 $('authForm').onsubmit=e=>{e.preventDefault();safe(async()=>{const {data:d,error}=await client.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error)throw error;session=d.session;await refresh()})};
 $('signup').onclick=()=>safe(async()=>{const email=$('email').value.trim();if(!$('email').reportValidity())return;const {error}=await client.auth.signInWithOtp({email,options:{shouldCreateUser:true}});if(error)throw error;$('otpBox').classList.remove('hidden');toast('Verification code sent. Check your email (and spam folder).')});
 $('verify').onclick=()=>safe(async()=>{const {data:d,error}=await client.auth.verifyOtp({email:$('email').value.trim(),token:$('otp').value.trim(),type:'email'});if(error)throw error;session=d.session;await refresh();toast('Email verified. Choose your password and username.')});
 $('setup').onclick=()=>safe(async()=>{const pass=$('password').value;if(pass.length<10||pass.length>72)throw Error('Choose a password 10–72 characters long');const {error}=await client.auth.updateUser({password:pass});if(error)throw error;await api('setup',{username:$('username').value});await refresh()});
 $('resetPassword').onclick=()=>safe(async()=>{if(!$('email').reportValidity())return;const {error}=await client.auth.signInWithOtp({email:$('email').value.trim(),options:{shouldCreateUser:false}});if(error)throw error;$('otpBox').classList.remove('hidden');toast('Code sent. Verify it, then set a new password.');$('verify').onclick=()=>safe(async()=>{const {data:d,error}=await client.auth.verifyOtp({email:$('email').value.trim(),token:$('otp').value.trim(),type:'email'});if(error)throw error;session=d.session;const pw=prompt('Email verified. Enter a new password (10–72 characters):');if(!pw||pw.length<10||pw.length>72)throw Error('Password change cancelled or invalid length');const r=await client.auth.updateUser({password:pw});if(r.error)throw r.error;await refresh();toast('Password updated.')})});
 setInterval(updateCooldown,100);if(session)await refresh();}
safe(init);
// GitHub sign-in add-on for Glyph Online v1.
(() => {
  let installing = false;

  const timer = setInterval(async () => {
    // Wait until the original game's login handlers are installed.
    if (
      installing ||
      typeof client === "undefined" ||
      !client ||
      !document.getElementById("setup")?.onclick
    ) {
      return;
    }

    installing = true;
    clearInterval(timer);

    try {
      const form = document.getElementById("authForm");

      // Replace email login controls with GitHub login.
      for (const id of ["email", "password"]) {
        const input = document.getElementById(id);
        input.required = false;
        input.closest("label").hidden = true;
      }

      for (const id of [
        "authSubmit",
        "signup",
        "otpBox",
        "resetPassword"
      ]) {
        document.getElementById(id).classList.add("hidden");
      }

      form.addEventListener("submit", event => {
        event.preventDefault();
      });

      const githubButton = document.createElement("button");
      githubButton.type = "button";
      githubButton.className = "primary wide";
      githubButton.textContent = "Continue with GitHub";
      form.prepend(githubButton);

      githubButton.onclick = () => safe(async () => {
        // Uses the Site URL you configured in Supabase.
        const { error } = await client.auth.signInWithOAuth({
          provider: "github"
        });

        if (error) throw error;
      });

      const setupText =
        document.querySelector("#setupBox p");

      if (setupText) {
        setupText.textContent =
          "Signed in with GitHub. Choose your game username.";
      }

      // GitHub users choose a username, not a game password.
      document.getElementById("setup").onclick = () =>
        safe(async () => {
          await api("setup", {
            username: document.getElementById("username").value
          });

          await refresh();
        });

      const result = await client.auth.getSession();
      if (result.error) throw result.error;

      session = result.data.session;

      if (session) {
        githubButton.hidden = true;
        await refresh();
      }
    } catch (error) {
      console.error(error);

      if (typeof toast === "function") {
        toast(error.message || "GitHub login setup failed.");
      }
    }
  }, 100);
})();
