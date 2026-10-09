import json
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
results=[]
with sync_playwright() as p:
    launch_options={'headless': True, 'args':['--no-sandbox','--disable-dev-shm-usage']}
    system_chromium=shutil.which('chromium') or shutil.which('chromium-browser') or shutil.which('google-chrome')
    if system_chromium:
        launch_options['executable_path']=system_chromium
    browser=p.chromium.launch(**launch_options)
    page=browser.new_page(viewport={'width':390,'height':844}, device_scale_factor=1, is_mobile=True, has_touch=True)
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.on('console',lambda m: errors.append('console error: '+m.text) if m.type=='error' else None)
    page.set_content('<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>'+Path(ROOT/'styles.css').read_text()+'</style></head><body><header class="topbar"><div class="brand">БУНКЕР</div><div id="connectionBadge" class="badge">не подключено</div></header><main id="app" class="wrap"></main><div id="toast" class="toast" aria-live="polite"></div><script>'+Path(ROOT/'app.js').read_text()+'</script></body></html>', wait_until='domcontentloaded', timeout=20000)
    page.wait_for_timeout(350)
    results.append({'test':'landing page rendered','pass':page.locator('#app').inner_text().find('БУНКЕР')>=0})
    results.append({'test':'client scripts available','pass':page.evaluate("typeof createGame === 'function' && typeof sendToHost === 'function' && typeof renderBunkerPanel === 'function'")})
    # install a representative 6-player lobby and run normal start-game path
    outcome=page.evaluate('''() => {
      const names=['Игрок 1','Игрок 2','Игрок 3','Игрок 4','Игрок 5','Игрок 6'];
      state.isHost=true; state.clientId='test-host'; state.myPlayerId=null; state.mode='lobby';
      state.game=createGame({playerCount:6}, names, 0);
      state.game.players.forEach((p,i)=>{p.occupied=true;p.connected=true;p.ready=true;p.clientId='test-'+i;p.slot=i+1;});
      state.myPlayerId=state.game.players[0].id;
      state.game.roomTitle=makeRoomTitle(state.game.catastrophe,state.game.bunker);
      render();
      const lobby={players:document.querySelectorAll('.lobby-player').length, realCount:state.game.players.length};
      const oldReady=state.game.players[5].ready; state.game.players[5].ready=false; uiStartGame();
      const fiveRejected=state.game.status==='lobby'; state.game.players[5].ready=oldReady;
      uiStartGame();
      const situation=document.querySelector('.situation-summary'); const game={phase:state.game.currentPhase, round:state.game.round, count:state.game.players.length, revealButtons:document.querySelectorAll('.reveal-btn').length, journalVisible:document.body.innerText.includes('Журнал партии'), bunkerPanel:!!document.querySelector('.bunker-state-panel'), situationText:situation?.innerText||'', oldMetrics:!!document.querySelector('.bunker-resource-grid,.bunker-infrastructure,.bunker-meter'),hostDrawerExists:!!document.querySelector('.host-tools-drawer'),hostDrawerCollapsed:!!document.querySelector('.host-tools-drawer')&&!document.querySelector('.host-tools-drawer').open,hostDrawerFixed:!!document.querySelector('.host-tools-drawer')&&getComputedStyle(document.querySelector('.host-tools-drawer')).position==='fixed'};
      return {lobby,game,fiveRejected};
    }''')
    results.append({'test':'lobby has no fake slots and only 6 real players','pass':outcome['lobby']['players']==6 and outcome['lobby']['realCount']==6,'detail':outcome['lobby']})
    results.append({'test':'five players are blocked; six synchronized players may start','pass':outcome['fiveRejected'] and outcome['game']['phase']=='turns' and outcome['game']['round']==1 and outcome['game']['count']==6,'detail':{'fiveRejected':outcome['fiveRejected'],'game':outcome['game']}})
    results.append({'test':'six connected/ready players can start the game','pass':outcome['game']['phase']=='turns' and outcome['game']['round']==1 and outcome['game']['count']==6,'detail':outcome['game']})
    results.append({'test':'rendered mobile reveal buttons and bunker panel','pass':outcome['game']['revealButtons']>=1 and outcome['game']['bunkerPanel']})
    results.append({'test':'catastrophe image is followed by a prose summary of pressures, resources and systems','pass':'Что означает эта катастрофа' in outcome['game']['situationText'] and 'Запасы.' in outcome['game']['situationText'] and 'Инфраструктура.' in outcome['game']['situationText'] and not outcome['game']['oldMetrics'],'detail':{'summaryVisible':bool(outcome['game']['situationText']),'legacyMetricsPresent':outcome['game']['oldMetrics']}})
    results.append({'test':'active journal removed from UI','pass':not outcome['game']['journalVisible']})
    results.append({'test':'host controls start collapsed in a compact fixed drawer','pass':outcome['game']['hostDrawerExists'] and outcome['game']['hostDrawerCollapsed'] and outcome['game']['hostDrawerFixed'],'detail':{'exists':outcome['game']['hostDrawerExists'],'collapsed':outcome['game']['hostDrawerCollapsed'],'fixed':outcome['game']['hostDrawerFixed']}})
    # Exercise choosing cards and the separate normal finish-turn control.
    page.locator('.reveal-btn').first.click()
    reveal_click=page.evaluate('''() => ({mode:state.mode, opened:state.game.players[0].revealed.length, buttonCount:document.querySelectorAll('.reveal-btn').length, hasWaitingLabel:document.body.innerText.includes('Открываем…'), finishDisabled:document.querySelector('.finish-turn-btn')?.disabled, revealedThisRound:state.game.players[0].revealsThisRound})''')
    results.append({'test':'visible Reveal button opens one chosen card and does not force-finish the turn','pass':reveal_click['mode']=='game' and reveal_click['opened']>=2 and reveal_click['buttonCount']>=1 and reveal_click['finishDisabled'] and reveal_click['revealedThisRound']==2,'detail':reveal_click})
    page.locator('.reveal-btn').first.click()
    finish_ready=page.evaluate('''() => { const b=document.querySelector('.finish-turn-btn'); const css=b?getComputedStyle(b):null; return {exists:!!b,disabled:b?.disabled,ready:b?.classList.contains('is-ready'),background:css?.backgroundColor,color:css?.color,turnReveals:state.game.players[0].revealsThisRound,quota:revealQuota(6,1),randomSkipPresent:!!document.querySelector('.host-tools-drawer')?.textContent.includes('Пропустить ход · открыть 2 случайные')}; }''')
    results.append({'test':'finish-turn button activates in glowing yellow with black text after quota; random skip remains separate','pass':finish_ready['exists'] and not finish_ready['disabled'] and finish_ready['ready'] and finish_ready['background']=='rgb(255, 223, 77)' and finish_ready['color']=='rgb(23, 23, 23)' and finish_ready['turnReveals']>=finish_ready['quota'] and finish_ready['randomSkipPresent'],'detail':finish_ready})
    page.get_by_role('button',name='Закончить ход',exact=True).click()
    finish_result=page.evaluate('''() => ({turnIndex:state.game.currentTurnIndex,disabled:document.querySelector('.finish-turn-btn')?.disabled,ready:document.querySelector('.finish-turn-btn')?.classList.contains('is-ready')})''')
    results.append({'test':'normal finish-turn advances to next player and button becomes disabled when it is not your turn','pass':finish_result['turnIndex']==1 and finish_result['disabled'] and not finish_result['ready'],'detail':finish_result})
    # The full supported player-count/capacity matrix; 1/4/5 must not start.
    matrix=page.evaluate('''() => {
      const out=[];
      for (const n of [1,4,5,6,7,8,15]) {
        state.isHost=true; state.mode='lobby';
        const names=Array.from({length:n},(_,i)=>`Игрок ${i+1}`);
        state.game=createGame({playerCount:n},names,0);
        state.game.players.forEach((p,i)=>{p.occupied=true;p.connected=true;p.ready=true;p.clientId=`matrix-${n}-${i}`;p.slot=i+1;});
        state.myPlayerId=state.game.players[0].id;
        uiStartGame();
        out.push({n,started:state.game.currentPhase==='turns' && state.game.status==='playing',count:state.game.players.length,capacity:state.game.capacity});
      }
      const duplicate=createGame({playerCount:6},Array(6).fill('Алекс'),0);
      const distinctIds=new Set(duplicate.players.map(p=>p.id)).size;
      return {out,distinctIds};
    }''')
    expected={1:(False,None),4:(False,None),5:(False,None),6:(True,3),7:(True,3),8:(True,4),15:(True,7)}
    matrix_ok=all(x['started']==expected[x['n']][0] and (expected[x['n']][1] is None or x['capacity']==expected[x['n']][1]) and (not x['started'] or x['count']==x['n']) for x in matrix['out']) and matrix['distinctIds']==6
    results.append({'test':'player start/capacity matrix 1,4,5 blocked; 6,7,8,15 allowed with correct capacity','pass':matrix_ok,'detail':matrix})
    # A sixteenth join must be rejected without creating a phantom slot.
    cap=page.evaluate('''() => {
      const g=state.game; g.status='lobby'; g.currentPhase='lobby'; g.players=Array.from({length:15},(_,i)=>({...makePlayers([`Игрок ${i+1}`],i===0?0:null,1)[0],slot:i+1,clientId:`full-${i}`,connected:true,ready:true}));
      const before=g.players.length; const sent=[]; const conn={peer:'peer-16',metadata:{},send:m=>sent.push(m),close:()=>{}};
      handleHostJoinLobby(conn,{action:'joinLobby',clientId:'client-16',name:'Игрок 16'});
      return {before,after:g.players.length,rejected:sent.some(m=>m.type==='error' && m.message.includes('максимум 15'))};
    }''')
    results.append({'test':'sixteenth participant rejected and lobby remains capped at 15','pass':cap['before']==15 and cap['after']==15 and cap['rejected'],'detail':cap})
    # Reconnect an existing clientId and confirm the same player object/cards are retained.
    reconnect=page.evaluate('''() => {
      const p=state.game.players[2]; const id=p.id; const card=p.cards.profession.value; const clientId='persistent-client-xyz';
      p.clientId=clientId; p.peerId='old-peer'; p.connected=false; p.ready=false; p.revealed=['profession','health']; p.vote='preserved-vote';
      state.game.status='playing'; state.game.currentPhase='turns'; state.game.round=3; const oldPhase=state.game.currentPhase; const oldRound=state.game.round;
      const sent=[]; const conn={peer:'new-peer',open:true,metadata:{},send:m=>sent.push(m),close:()=>{}};
      handleHostJoinLobby(conn,{action:'joinLobby',clientId,name:p.name});
      const restored=state.game.players.find(x=>x.id===id);
      return {samePlayer:state.game.players.filter(x=>x.clientId===clientId).length===1 && restored.id===id,cardPreserved:restored.cards.profession.value===card,peerUpdated:restored.peerId==='new-peer',revealsPreserved:restored.revealed.join(',')==='profession,health',votePreserved:restored.vote==='preserved-vote',phasePreserved:state.game.currentPhase===oldPhase,roundPreserved:state.game.round===oldRound,assigned:sent.some(m=>m.type==='assigned')};
    }''')
    results.append({'test':'reconnect during the game restores same player, cards, reveal state, vote and round','pass':all(reconnect.values()),'detail':reconnect})
    # reveal sequence and dynamic bunker with actual current source functions
    world=page.evaluate('''() => {
      discoverWorldStage(0); const first={cat:state.game.catastropheReveals.length,bunker:state.game.bunkerState.events.length,discoveries:state.game.bunkerState.discoveries.length};
      const counts=[...state.game.bunkerState.appliedEffects];
      revealFinalWorldKnowledge(); const final={cat:state.game.catastropheReveals.length,bunker:state.game.bunkerState.events.length,plan:state.game.bunkerEventPlan.length,uniqueStages:new Set(state.game.worldStagesDiscovered).size};
      const report=calculateFinalReport();
      render();
      return {first,final,reportScore:report.score,hasFinalBunker:typeof renderFinalBunker==='function'};
    }''')
    results.append({'test':'progressive catastrophe reveals and up to 5 bunker events','pass':world['first']['cat']==1 and world['first']['bunker']==1 and world['final']['cat']==4 and world['final']['bunker']==5 and world['final']['uniqueStages']==5,'detail':world})
    chronicle=page.evaluate('''() => ({initialHasHistory:!!state.game.catastrophe.history, revealedHasHistory:!!state.game.catastropheReveals[0]?.history, finalHelper:typeof renderFinalWorldChronicle==='function', historyHiddenFromRawClientCat:!Object.prototype.hasOwnProperty.call(sanitizeForPeer(state.game,state.myPlayerId).catastrophe,'history')})''')
    results.append({'test':'catastrophe chapters are revealed progressively and summarized in final screen','pass':chronicle['initialHasHistory'] and chronicle['revealedHasHistory'] and chronicle['finalHelper'] and chronicle['historyHiddenFromRawClientCat'],'detail':chronicle})
    # Structured bunker effects apply once; problems are evaluated at the end by survivor professions.
    event_test=page.evaluate('''() => {
      state.isHost=true; state.mode='game';
      const names=Array.from({length:6},(_,i)=>`Тест ${i+1}`);
      const g=createGame({playerCount:6},names,0); state.game=g; state.myPlayerId=g.players[0].id;
      g.status='playing'; g.currentPhase='turns'; g.round=1; g.capacity=3;
      g.players.forEach((p,i)=>{p.occupied=true;p.connected=true;p.ready=true;p.eliminated=i>2;p.bunkered=false;p.clientId=`event-${i}`;});
      g.players[0].cards.profession.value='Кладовщик продовольственного склада';
      g.bunkerState=createBunkerState(g.bunker,6); g.bunkerState.resources.food=10;
      const source=BUNKER_EVENTS.find(e=>e.id==='food-moth');
      g.bunkerEventPlan=[{...clonePlain(source),stage:0,discovered:false,applied:false,resolved:false}];
      const first=revealBunkerEvent(0), foodAfterFirst=g.bunkerState.resources.food;
      const second=revealBunkerEvent(0), foodAfterSecond=g.bunkerState.resources.food;
      const outcomes=resolveBunkerProblemsAtFinal(g);
      const resolvedCount=g.bunkerState.resolvedProblems.length;
      const outcomesAgain=resolveBunkerProblemsAtFinal(g);
      return {first,second,foodAfterFirst,foodAfterSecond,resolved:outcomes[0]?.resolved,resolvedCount,resolvedAgain:outcomesAgain.length,active:g.bunkerState.activeProblems.length};
    }''')
    results.append({'test':'bunker event effect applies once; relevant profession resolves problem only in final and idempotently','pass':event_test['first'] and not event_test['second'] and event_test['foodAfterFirst']==9 and event_test['foodAfterSecond']==9 and event_test['resolved'] and event_test['resolvedCount']==1 and event_test['resolvedAgain']==0 and event_test['active']==0,'detail':event_test})
    # A non-problem capacity discovery applies immediately; conditional room capacity is decided by final expertise.
    capacity_events=page.evaluate('''() => {
      const setup=()=>{const g=createGame({playerCount:15},Array.from({length:15},(_,i)=>`Игрок ${i+1}`),0);state.isHost=true;state.mode='game';state.game=g;state.myPlayerId=g.players[0].id;g.status='playing';g.currentPhase='turns';g.round=2;g.capacity=7;g.bunkerState=createBunkerState(g.bunker,15);g.bunkerState.capacity.base=7;g.bunkerState.capacity.current=7;g.bunkerState.resources.materials=2;g.players.forEach((p,i)=>{p.occupied=true;p.connected=true;p.ready=true;p.eliminated=false;p.bunkered=false;p.clientId=`capacity-${i}`;});return g;};
      let g=setup(); const hidden=clonePlain(BUNKER_EVENTS.find(e=>e.id==='hidden-bunk')); g.bunkerEventPlan=[{...hidden,stage:0,discovered:false,applied:false,resolved:false}];
      const immediateFirst=revealBunkerEvent(0), immediateCap1=g.capacity, immediateSecond=revealBunkerEvent(0), immediateCap2=g.capacity;
      g=setup(); const upgrade=clonePlain(BUNKER_EVENTS.find(e=>e.id==='insulated-room')); g.bunkerEventPlan=[{...upgrade,stage:0,discovered:false,applied:false,resolved:false}];
      revealBunkerEvent(0); const beforeFinal=g.capacity, hasProblem=g.bunkerState.activeProblems.some(x=>x.id==='insulated-room');
      g.players[0].cards.profession.value='Строитель';
      const outcomes=resolveBunkerProblemsAtFinal(g), afterFinal=g.capacity; const repeat=resolveBunkerProblemsAtFinal(g);
      return {immediateFirst,immediateSecond,immediateCap1,immediateCap2,beforeFinal,hasProblem,resolved:outcomes[0]?.resolved,afterFinal,repeat:repeat.length,afterRepeat:g.capacity,materials:g.bunkerState.resources.materials};
    }''')
    results.append({'test':'capacity events are applied at discovery or final specialist evaluation exactly once','pass':capacity_events['immediateFirst'] and not capacity_events['immediateSecond'] and capacity_events['immediateCap1']==8 and capacity_events['immediateCap2']==8 and capacity_events['beforeFinal']==7 and capacity_events['hasProblem'] and capacity_events['resolved'] and capacity_events['afterFinal']==8 and capacity_events['repeat']==0 and capacity_events['afterRepeat']==8,'detail':capacity_events})
    # A stale network state must not overwrite the currently applied snapshot.
    stale=page.evaluate('''() => {
      const original=state.game; const player=original.players[0]; state.myPlayerId=player.id; state.lastStateSeq=50;
      handleClientMessage({type:'state',game:{stateSeq:49,status:'playing',currentPhase:'turns',players:[{id:player.id}]}},state.joinAttemptId);
      return {sameObject:state.game===original,lastStateSeq:state.lastStateSeq};
    }''')
    results.append({'test':'stale snapshot is ignored instead of overwriting latest state','pass':stale['sameObject'] and stale['lastStateSeq']==50,'detail':stale})
    # A revealed world fact changes scoring exactly once and result calculation is stable.
    score_test=page.evaluate('''() => {
      const g=state.game; state.isHost=true; g.currentPhase='turns';
      g.catastropheReveals=[]; g.worldStagesDiscovered=[]; g.appliedCatastropheEffects=[];
      g.catastropheModifiers={foodNeed:0,waterNeed:0,heatNeed:0,techNeed:0,medicalNeed:0,environmentPenalty:0,systemsPenalty:0};
      const beforeReport=calculateFinalReport(); const first=revealCatastropheFact(0); const afterFirstReport=calculateFinalReport(); const once=g.appliedCatastropheEffects.length;
      const second=revealCatastropheFact(0); const afterSecondReport=calculateFinalReport();
      const repeatA=calculateFinalReport().score, repeatB=calculateFinalReport().score;
      const metricChanges=Object.keys(beforeReport.metrics).filter(k=>Math.abs(beforeReport.metrics[k]-afterFirstReport.metrics[k])>1e-7);
      return {first,second,once,applied:g.appliedCatastropheEffects.length,modifiers:g.catastropheModifiers,before:beforeReport.score,afterFirst:afterFirstReport.score,afterSecond:afterSecondReport.score,metricChanges,repeatA,repeatB};
    }''')
    results.append({'test':'catastrophe facts and their modifiers are applied once; final score is deterministic','pass':score_test['first'] and not score_test['second'] and score_test['once']==1 and score_test['applied']==1 and len(score_test['metricChanges'])>=1 and score_test['repeatA']==score_test['repeatB'],'detail':score_test})
    # Timer ticking is a DOM-only patch; it must not re-render/broadcast every 250 ms.
    timer=page.evaluate('''() => {
      state.isHost=true; state.game.currentPhase='discussion'; state.game.timerRunning=true; state.game.timerDeadline=Date.now()+65000; state.game.timeLeft=66;
      render(); const before=state.game.stateSeq; const textBefore=document.querySelector('.timer')?.textContent || '';
      state.game.timerDeadline=Date.now()+59000; refreshTimerDisplay();
      return {before,after:state.game.stateSeq,textBefore,textAfter:document.querySelector('.timer')?.textContent || ''};
    }''')
    results.append({'test':'timer updates visible countdown without incrementing state sequence each tick','pass':timer['before']==timer['after'] and timer['textAfter']=='00:59','detail':timer})
    # Security regression: payload voter ID is ignored; connection identity controls actor.
    security=page.evaluate('''() => {
      state.game.currentPhase='vote'; state.game.votingLocked=false; state.game.votes={};
      const attacker=state.game.players[1], target=state.game.players[2];
      attacker.peerId='peer-attacker'; attacker.connected=true; attacker.occupied=true;
      target.connected=true; target.occupied=true;
      state.game.players[3].connected=true; state.game.players[3].occupied=true;
      const conn={peer:'peer-attacker',metadata:{playerId:attacker.id},open:true,send:()=>{}};
      handleHostMessage(conn,{action:'vote',voterId:target.id,targetId:state.game.players[3].id});
      return {keys:Object.keys(state.game.votes),expected:attacker.id,targetId:state.game.votes[attacker.id]};
    }''')
    results.append({'test':'vote identity is derived from connection, not payload voterId','pass':len(security['keys'])==1 and security['keys'][0]==security['expected'] and security['targetId'] is not None,'detail':security})
    # privacy sanitization: hidden opponent values and secrets are absent from client snapshot
    privacy=page.evaluate('''() => {
      const g=state.game; const me=g.players[0]; const other=g.players[1];
      other.revealed=[]; const hiddenType='health';
      const copy=sanitizeForPeer(g,me.id);
      return {ownValue:copy.players[0].cards.health.value!==null,otherHidden:copy.players[1].cards[hiddenType].value===null,hasPlan:Object.prototype.hasOwnProperty.call(copy,'bunkerEventPlan'),hasFacts:Object.prototype.hasOwnProperty.call(copy.catastrophe,'facts'),hasPeerId:Object.prototype.hasOwnProperty.call(copy.players[1],'peerId')};
    }''')
    results.append({'test':'network snapshot strips hidden cards, private plans and peer IDs','pass':privacy['ownValue'] and privacy['otherHidden'] and not privacy['hasPlan'] and not privacy['hasFacts'] and not privacy['hasPeerId'],'detail':privacy})
    # responsive viewport horizontal overflow quick check
    sizes=[]
    for width in [320,360,390,430,768,1024,1280]:
        page.set_viewport_size({'width':width,'height':844})
        page.wait_for_timeout(60)
        dims=page.evaluate('''() => ({inner:window.innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth})''')
        sizes.append({'width':width,**dims,'pass':dims['scroll']<=dims['inner']+1})
    results.append({'test':'responsive widths do not cause horizontal page overflow','pass':all(x['pass'] for x in sizes),'detail':sizes})
    # Voting edge cases: pass is available once; pass skips this round and forces two removals next round; no speeches/defense.
    edges=page.evaluate('''() => {
      const setup=()=>{const g=createGame({playerCount:6},Array.from({length:6},(_,i)=>`Edge ${i+1}`),0);state.isHost=true;state.mode='game';state.game=g;state.myPlayerId=g.players[0].id;g.status='playing';g.currentPhase='discussion';g.round=1;g.voteRound=1;g.currentRoundEliminationTarget=1;g.votingLocked=false;g.skipUsed=false;g.doubleVoteNext=false;g.voteLocks={};g.skipChoices={};g.votes={};g.capacity=3;g.players.forEach((p,i)=>{p.occupied=true;p.connected=true;p.ready=true;p.eliminated=false;p.bunkered=false;p.bot=false;p.hostPlayer=i===0;p.clientId=`edge-${i}`;});return g;};
      let g=setup();let ids=g.players.map(p=>p.id);g.skipChoices=Object.fromEntries(ids.slice(0,3).map(id=>[id,true]));ids.forEach((id,i)=>{g.voteLocks[id]=true;if(i>=3)g.votes[id]=ids[i%2===0?4:5];});finishVote();const threeSkip={round:g.round,skipUsed:g.skipUsed,target:g.currentRoundEliminationTarget,phase:g.currentPhase,eliminated:g.players.filter(p=>p.eliminated).length};
      g=setup();ids=g.players.map(p=>p.id);g.skipChoices=Object.fromEntries(ids.slice(0,4).map(id=>[id,true]));ids.forEach(id=>g.voteLocks[id]=true);finishVote();const fourSkip={round:g.round,skipUsed:g.skipUsed,target:g.currentRoundEliminationTarget,phase:g.currentPhase,eliminated:g.players.filter(p=>p.eliminated).length,skipDisabled:!canSkipCurrentVote(g)};
      g=setup();ids=g.players.map(p=>p.id);ids.forEach((id,i)=>{g.voteLocks[id]=true;g.votes[id]=i%2===0?ids[4]:ids[5];});finishVote();const direct={phase:g.currentPhase,eliminated:g.players.filter(p=>p.eliminated).length,defenseQueue:g.defenseQueue.length,farewellQueue:g.farewellQueue.length};
      return {threeSkip,fourSkip,direct};
    }''')
    edge_ok=(edges['threeSkip']['skipUsed'] is False and edges['threeSkip']['eliminated']==1 and edges['fourSkip']['skipUsed'] is True and edges['fourSkip']['round']==2 and edges['fourSkip']['target']==2 and edges['fourSkip']['phase']=='turns' and edges['fourSkip']['eliminated']==0 and edges['fourSkip']['skipDisabled'] and edges['direct']['eliminated']==1 and edges['direct']['phase']=='turns' and edges['direct']['defenseQueue']==0 and edges['direct']['farewellQueue']==0)
    results.append({'test':'one pass option, double elimination after pass, and direct elimination without defense/farewell','pass':edge_ok,'detail':edges})
    # Exercise the real rendered host controls for bot skip, minute timer and kick.
    page.evaluate('''() => {
      const names=Array.from({length:6},(_,i)=>`Bot UI ${i+1}`);
      const g=createGame({playerCount:6},names,0);
      state.isHost=true;state.mode='game';state.game=g;state.myPlayerId=g.players[0].id;
      g.status='playing';g.currentPhase='turns';g.round=1;g.voteRound=0;g.votingLocked=false;g.skipUsed=false;g.doubleVoteNext=false;
      g.players.forEach((p,i)=>{p.occupied=true;p.connected=true;p.ready=true;p.eliminated=false;p.bunkered=false;p.bot=i>0;p.hostPlayer=i===0;p.clientId=`bot-ui-${i}`;});
      beginDiscussion();
    }''')
    page.locator('.host-tools-drawer > summary').click()
    checkbox_count=page.locator('.host-bot-skip input[type="checkbox"]').count()
    page.locator('.host-bot-skip input[type="checkbox"]').first.check()
    first_skip=page.evaluate('''() => ({count:Object.keys(state.game.skipChoices).length,first:state.game.skipChoices[state.game.players.find(p=>p.bot).id],button:typeof window.uiBotSkipChoice==='function',drawerOpen:!!document.querySelector('.host-tools-drawer[open]')})''')
    page.get_by_role('button',name='Случайный выбор пропуска для ботов').click()
    random_skip=page.evaluate('''() => ({count:Object.keys(state.game.skipChoices).length,allBotsHaveChoice:state.game.players.filter(p=>p.bot&&!p.eliminated).every(p=>typeof state.game.skipChoices[p.id]==='boolean')})''')
    minute_timer=page.evaluate('''() => ({running:state.game.timerRunning,seconds:Math.round((state.game.timerDeadline-Date.now())/1000)})''')
    page.evaluate('stopTimer()')
    target_id=page.evaluate("() => state.game.players.find(p=>p.bot&&!p.eliminated).id")
    page.locator('.host-kick-tools summary').click()
    page.locator('.host-kick-row button').first.click()
    kicked=page.evaluate("id => ({eliminated:state.game.players.find(p=>p.id===id).eliminated,uiAction:typeof window.uiKickPlayer==='function'})",target_id)
    controls_ok=checkbox_count==5 and first_skip['count']==1 and first_skip['first'] and first_skip['button'] and first_skip['drawerOpen'] and random_skip['count']==5 and random_skip['allBotsHaveChoice'] and minute_timer['running'] and 175 <= minute_timer['seconds'] <= 180 and kicked['eliminated'] and kicked['uiAction']
    results.append({'test':'rendered host controls work: bot skip checkbox/random choice, three-minute timer, and kick','pass':controls_ok,'detail':{'checkboxes':checkbox_count,'firstSkip':first_skip,'randomSkip':random_skip,'minuteTimer':minute_timer,'kick':kicked}})
    # Timer presets are checked as configured; waiting for a full timer is not part of this offline test.
    timer_presets=page.evaluate('''() => {
      state.isHost=true;
      state.game=createGame({playerCount:6},Array.from({length:6},(_,i)=>`Timer ${i+1}`),0);
      state.game.players.forEach((p,i)=>{p.occupied=true;p.connected=true;p.ready=true;p.eliminated=false;p.clientId=`timer-${i}`;});
      beginDiscussion(); const discussion=state.game.timeLeft;
      beginSpeeches(); const legacySpeechEntry=state.game.timeLeft;
      beginVote(); const legacyVoteEntry=state.game.timeLeft;
      const phase=state.game.currentPhase;
      startTimer(120); const deadlineSeconds=Math.round((state.game.timerDeadline-Date.now())/1000); stopTimer();
      return {discussion,legacySpeechEntry,legacyVoteEntry,phase,deadlineSeconds,functions:['beginDiscussion','beginSpeeches','beginVote','startTimer','lockVote'].every(name=>typeof window[name]==='function')};
    }''')
    # Check local references only, without depending on external network availability.
    local_refs=[]
    import re
    html=(ROOT/'index.html').read_text(encoding='utf-8')
    for ref in re.findall(r'(?:src|href)=[\"\']([^\"\']+)', html):
      if ref.startswith(('https://','http://','#','data:')): continue
      clean=ref.split('?',1)[0].split('#',1)[0]
      if clean and not (ROOT/clean).is_file(): local_refs.append(ref)
    results.append({'test':'HTML local CSS/JS references exist and all discussion entry points use the unified three-minute phase','pass':not local_refs and timer_presets['functions'] and timer_presets['discussion']==180 and timer_presets['legacySpeechEntry']==180 and timer_presets['legacyVoteEntry']==180 and timer_presets['phase']=='discussion' and 119 <= timer_presets['deadlineSeconds'] <= 120,'detail':{'missingLocalRefs':local_refs,'timerPresets':timer_presets}})
    # Final screen returns the host and still-connected guests to the same room with a monotonic snapshot sequence.
    lobby_reset=page.evaluate('''() => {
      const names=['Reset Host','Reset Guest','Disconnected','Old Bot 1','Old Bot 2','Old Bot 3'];
      const g=createGame({playerCount:6},names,0);
      state.isHost=true;state.mode='game';state.roomCode='RESETROOM';state.myPlayerId=g.players[0].id;state.game=g;
      g.status='finished';g.currentPhase='final';g.stateSeq=80;g.players.forEach((p,i)=>{p.connected=false;p.ready=false;p.eliminated=true;p.bunkered=false;p.revealed=['profession'];p.bot=false;p.peerId=null;p.clientId=`reset-${i}`;});
      g.players[0].hostPlayer=true;g.players[0].connected=true;g.players[0].ready=true;
      const guest=g.players[1];guest.peerId='reset-peer-guest';
      const sent=[];state.connections=new Map([['reset-peer-guest',{peer:'reset-peer-guest',open:true,metadata:{playerId:guest.id},send:m=>sent.push(m)}]]);
      g.finalReport=calculateFinalReport();render();
      const button=document.querySelector('.final-actions button');
      const buttonVisible=!!button && button.textContent.includes('Вернуться в лобби');
      button?.click();
      return {buttonVisible,status:state.game.status,phase:state.game.currentPhase,retainedNames:state.game.players.map(p=>p.name),retainedIds:state.game.players.map(p=>p.id),originalIds:[names[0],names[1]].map(name=>g.players.find(p=>p.name===name).id),stateSeq:state.game.stateSeq,oldStateSeq:80,roomCode:state.roomCode,guestPeer:state.game.players.find(p=>p.name===names[1])?.peerId,snapshotSent:sent.some(m=>m.type==='state' && m.game.status==='lobby')};
    }''')
    results.append({'test':'final screen button returns to lobby and preserves the live guest connection','pass':lobby_reset['buttonVisible'] and lobby_reset['status']=='lobby' and lobby_reset['phase']=='lobby' and lobby_reset['retainedNames']==['Reset Host','Reset Guest'] and lobby_reset['retainedIds']==lobby_reset['originalIds'] and lobby_reset['stateSeq']>lobby_reset['oldStateSeq'] and lobby_reset['roomCode']=='RESETROOM' and lobby_reset['guestPeer']=='reset-peer-guest' and lobby_reset['snapshotSent'],'detail':lobby_reset})
    # A transient transport retry while a participant is in-game must not replace
    # the game DOM with the full-screen joining UI or clear the current identity.
    silent_reconnect=page.evaluate('''() => {
      const originalPeer=window.Peer;
      class StubPeer {
        constructor(){this.id='client-silent-reconnect';this.handlers={};this.destroyed=false;this.disconnected=false;}
        on(name,fn){(this.handlers[name] ||= []).push(fn);return this;}
        destroy(){this.destroyed=true;}
      }
      state.isHost=false;state.mode='game';state.joinBusy=false;state.game=createGame({playerCount:6},['Хост','А','Б','В','Г','Д'],0);
      state.game.status='playing';state.game.currentPhase='turns';state.game.players.forEach((p,i)=>{p.occupied=true;p.connected=true;p.ready=true;p.clientId=`silent-${i}`;p.slot=i+1;});
      state.roomCode='SILENT12';state.myName='Игрок';state.myPlayerId=state.game.players[1].id;state.lastStateSeq=42;state.peer=null;state.pendingHost=null;
      render();const before=document.querySelector('#app').innerHTML;const playerId=state.myPlayerId;
      window.Peer=StubPeer;joinRoom('SILENT12','Игрок',{silent:true});
      const result={mode:state.mode,playerRetained:state.myPlayerId===playerId,sequenceRetained:state.lastStateSeq===42,domRetained:document.querySelector('#app').innerHTML===before,joiningScreenVisible:!!document.querySelector('.connecting-room')};
      clearJoinTimeout();try{state.peer?.destroy();}catch{}state.peer=null;state.joinBusy=false;window.Peer=originalPeer;
      // Active-game recovery must keep retrying beyond the initial 24-attempt
      // budget, but use the capped backoff and do not redraw the screen.
      state.autoRejoinCount=24;const retryContinues=scheduleAutoRejoin();clearTimeout(state.autoRejoinTimer);state.autoRejoinTimer=null;
      result.retryContinues=retryContinues;
      return result;
    }''')
    results.append({'test':'automatic background reconnect does not switch to joining screen or clear game identity','pass':silent_reconnect['mode']=='game' and silent_reconnect['playerRetained'] and silent_reconnect['sequenceRetained'] and silent_reconnect['domRetained'] and not silent_reconnect['joiningScreenVisible'] and silent_reconnect['retryContinues'],'detail':silent_reconnect})
    results.append({'test':'no browser runtime errors during smoke tests','pass':len(errors)==0,'detail':errors[:10]})
    browser.close()
report={'results':results,'passed':sum(bool(r['pass']) for r in results),'total':len(results)}
(ROOT/'tests'/'TEST_RESULTS.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
if report['passed'] != report['total']:
    raise SystemExit(1)
