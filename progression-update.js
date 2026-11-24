/* Glyph progression add-on. Load AFTER app.js using a deferred script tag.
   Compatible with Glyph Online app.js v2 and the compact Lapin page's inline UI patch. */
(()=>{
 function install(){
  if(typeof api!=='function'||typeof render!=='function'||typeof reveal!=='function'){
   console.error('Load progression-update.js after the existing app.js.');return;
  }
  let chosenRecipe=null,chosenItems=[],working=false;
  function oddsText(item){const p=Number(item?.probability);if(!(p>0&&p<=1))return '';const n=1/p;return 'Base odds: 1 in '+n.toLocaleString(undefined,{maximumFractionDigits:n<100?2:0});}
  const originalReveal=reveal;
  reveal=function(item,fresh){originalReveal(item,fresh);const text=oddsText(item);if(text){const line=node('div',text,'small result-odds');line.style.marginTop='8px';$('result').append(line)}};
  const originalTile=makeTile;
  makeTile=function(item,count){const tile=originalTile(item,count);const text=oddsText(item);if(text)tile.title=(tile.title?tile.title+' · ':'')+text;return tile};
  const originalStats=openStats;
  openStats=async function(base,item){await originalStats(base,item);const text=oddsText(item);if(text){$('detail').querySelector('.revealed-odds')?.remove();$('detail').append(node('p',text,'revealed-odds'))}};
  // Use consumables terminology for existing roll-limited recipes.
  craft=async function(){if(!recipe)return;const items=craftSelection.map(id=>data.inventory.find(x=>x.id===id));if(items.some(x=>!x))throw Error('Inventory changed. Select ingredients again.');
   const message=`Craft ${recipe.name}?\n\nConsumes:\n${items.map(itemLine).join('\n')}\n\nEffect: ${recipe.luck}× luck, ${recipe.speed}× cooldown for ${recipe.rolls} rolls.\nConsumed value: ${fmt(items.reduce((s,x)=>s+Number(x.value),0))}`;
   if(!confirm(message))return;await api('craft',{recipe:recipe.id,items:[...craftSelection]});craftSelection=[];await refresh();toast('Consumable crafted and activated.');
  };
  $('craftNow')?.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();safe(()=>craft())},{capture:true});
  function ingredientName(ing){return Object.entries(ing).map(([k,v])=>k+': '+v).join(' + ')}
  function effectText(r){return `${r.luck}× luck · ${Math.round((1-Number(r.speed))*100)}% shorter cooldown`}
  function ownedUpgrade(id){return (data.upgrades||[]).find(x=>x.upgrade_id===id)}
  function matches(x,ing){return Object.entries(ing).every(([key,value])=>x[key]===value)}
  function mount(){const craftPage=$('craft');if(!craftPage)return null;let panel=$('permanentUpgradePanel');if(!panel){panel=node('section',null,'space');panel.id='permanentUpgradePanel';const before=$('recipes');if(before)before.before(panel);else craftPage.append(panel)}return panel}
  function normalizeLabels(){document.querySelectorAll('#craft h1, #craft h2, #craft h3, #buffs p, #visibleBuffs p').forEach(e=>{if(/boosters?/i.test(e.textContent))e.textContent=e.textContent.replace(/boosters?/gi,'consumables')});
   const title=document.querySelector('#craft h1');if(title)title.textContent='Crafting';
   const paragraph=document.querySelector('#craft .card > p');if(paragraph)paragraph.textContent='Craft roll-limited consumables or permanent upgrades. Ingredients are consumed when you confirm.';
   const recipesBox=$('recipes');if(recipesBox&&!$('consumableHeading')){const h=node('h2','Consumables','space');h.id='consumableHeading';recipesBox.before(h)}
  }
  function renderUpgrades(){if(!data?.profile)return;normalizeLabels();const panel=mount();if(!panel)return;panel.replaceChildren(node('h2','Permanent upgrades'),node('p','Craft each upgrade once. It stays on your account and can be switched on or off. Enabled upgrades stack with consumables; the existing luck and speed caps still apply.'));
   if(!Array.isArray(data.upgrade_recipes)){panel.append(node('p','Permanent upgrades need the 002_permanent_upgrades.sql database update. Your existing game is unchanged.','small'));return}
   const list=node('div',null,'stack');
   for(const r of data.upgrade_recipes){const owned=ownedUpgrade(r.id),row=node('div',null,'listrow'),info=node('div');info.append(node('h3',r.name),node('p',effectText(r)),node('small',owned?'Owned permanently':r.ingredients.map(ingredientName).join(' / ')));row.append(info);
    if(owned){const toggle=button(owned.enabled?'Enabled — switch off':'Disabled — switch on',async()=>{if(working)return;const next=!owned.enabled;if(!confirm(`${next?'Enable':'Disable'} ${r.name}? You keep ownership either way.`))return;working=true;try{await api('upgrade_toggle',{upgrade:r.id,enabled:next});await refresh();toast(r.name+(next?' enabled.':' disabled.'))}finally{working=false;renderUpgrades()}});toggle.disabled=working;row.append(toggle)}
    else{const choose=button(chosenRecipe===r.id?'Selected':'Choose ingredients',()=>{chosenRecipe=r.id;chosenItems=[];renderUpgrades()});choose.disabled=working;row.append(choose)}
    list.append(row);
   }
   panel.append(list);
   const selected=data.upgrade_recipes.find(r=>r.id===chosenRecipe&&!ownedUpgrade(r.id));if(!selected)return;
   const picker=node('div',null,'card space');picker.append(node('h3','Craft '+selected.name));
   selected.ingredients.forEach((ing,index)=>{const label=node('label',`Ingredient ${index+1}: ${ingredientName(ing)}`),select=node('select'),empty=node('option','Select a matching item');empty.value='';select.append(empty);
    const already=new Set(chosenItems.filter((id,i)=>i!==index&&id));
    for(const x of available()){if(already.has(x.id)||!matches(x,ing))continue;const option=node('option',itemLine(x));option.value=x.id;select.append(option)}
    select.value=chosenItems[index]||'';select.disabled=working;select.onchange=()=>{chosenItems[index]=select.value;renderUpgrades()};label.append(select);picker.append(label);
   });
   const submit=button('Craft permanent upgrade',async()=>{if(working)return;const ids=selected.ingredients.map((_,i)=>chosenItems[i]),items=ids.map(id=>data.inventory.find(x=>x.id===id));
    if(items.some(x=>!x)||new Set(ids).size!==ids.length)throw Error('Choose one distinct matching item per ingredient.');
    if(!confirm(`PERMANENT UPGRADE: ${selected.name}\n\nConsumes:\n${items.map(itemLine).join('\n')}\n\nTotal consumed value: ${fmt(items.reduce((s,x)=>s+Number(x.value),0))}\n\n${effectText(selected)}. No roll limit. You can toggle it later. Craft now?`))return;
    working=true;try{await api('upgrade_craft',{upgrade:selected.id,items:ids});chosenRecipe=null;chosenItems=[];await refresh();toast('Permanent upgrade crafted and enabled.')}finally{working=false;renderUpgrades()}
   },'primary space');
   submit.disabled=working||selected.ingredients.some((_,i)=>!chosenItems[i]);picker.append(submit);panel.append(picker);
  }
  const oldRender=render;
  render=function(){oldRender();renderUpgrades()};
  if(typeof data!=='undefined'&&data?.profile)renderUpgrades();
 }
 if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
