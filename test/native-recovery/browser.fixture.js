/* The shell and session transport below are acceptance-only. Slot registry, native
 * conversation assembly, chat owner component and packed Extras are real emitted code. */
(async()=>{
 const req=window.__acceptanceRequire,React=req('react'),h=React.createElement;
 const {Context}=req('@deepseek-ai/cordis');const ctx=new Context();
 const {createSnapshotStore}=req('@deepseek-ai/dsh-client-store');
 const {MutableSessionEventSource}=req('@deepseek-ai/dsh-api-session-controller');
 const {UiConversation}=req('@deepseek-ai/dsh-client-ui-conversation');
 const forms=new Map(),formStates=new Map();const transport=await(await fetch('/acceptance-state')).json();
 const configForms={whileServed(_names,callback){return callback();},get(name){if(!forms.has(name)){const s=createSnapshotStore({status:'ready',value:name==='locale'?{preference:'en'}:{modules:{retry:{enabled:true}},migration:{auto:false}}});formStates.set(name,s);forms.set(name,{...s,set:async()=>{},update:async()=>{},refresh:async()=>{}});}return forms.get(name);}};
 ctx.reflect.provide('configForms',configForms);
 const connectionState=createSnapshotStore({status:'connected'});
 ctx.reflect.provide('connection',{state:connectionState});
 ctx.reflect.provide('remote',{$on:()=>()=>{}});
 await ctx.plugin(req('@deepseek-ai/dsh-client-ui-renderer')).await();
 await ctx.plugin(req('@deepseek-ai/dsh-client-locale')).await();
 const bindings=new Map();
 const sessions={binding:id=>bindings.get(id),list:createSnapshotStore({byId:{},currentId:transport.sessionId}),retainInfo:()=>createSnapshotStore(undefined)};
 ctx.reflect.provide('sessions',sessions);
 new UiConversation(ctx,sessions);
 // Native ui-chat contributes its own session standard chat source here.
 const standards=[];ctx.reflect.provide('uiSession',{provide(value){standards.push(value);return()=>{};}});
 ctx.reflect.provide('uiWorkspace',{});ctx.reflect.provide('sidebarRight',{});ctx.reflect.provide('fileDrag',{actions:{}});
 const current=createSnapshotStore({key:undefined,hooks:{},keyedHooks:{},props:{}});
 const scopes=new Map();
 ctx.slots.installScope('session',{current,bindingSource:id=>scopes.get(id),renderArea:(_binding,props)=>props.children});
 const binding=id=>{
  if(bindings.has(id))return bindings.get(id);
  const state=createSnapshotStore({sessionId:id,running:false,openState:'open',removed:false});const eventSource=new MutableSessionEventSource();
  const projectionFaces=new Map();
  const session={...state,projections:{faceOf(key){if(!projectionFaces.has(key))projectionFaces.set(key,createSnapshotStore(undefined));return projectionFaces.get(key);}}};
  const value={sessionId:id,ctx,eventSource,session};bindings.set(id,value);return value;
 };
 const currentBinding=binding(transport.sessionId);
 currentBinding.eventSource.replace(transport.events.map(event=>({type:'event',event})),false);
 // The acceptance-state endpoint supplies the complete head log, unless an explicit
 // outline is supplied to exercise a paged window. This is a public projection face,
 // not the newest loaded event masquerading as latest-session proof.
 const applyState=state=>{
  currentBinding.session.projections.faceOf('turnOutline').set(state.turnOutline??state.events.filter(event=>event.type==='turn/start').map(event=>({turn:event.data.turn,seq:event.seq,prompt:'',response:''})));
  currentBinding.session.set({sessionId:transport.sessionId,running:state.running,openState:state.openState??'open',removed:state.removed??false});
  if(state.locale)formStates.get('locale')?.set({status:'ready',value:{preference:state.locale}});
  if(typeof state.retryEnabled==='boolean')formStates.get(window.__acceptanceDistribution)?.set({status:'ready',value:{modules:{retry:{enabled:state.retryEnabled}},migration:{auto:false}}});
 };
 applyState(transport);
 // This root is a minimal acceptance shell. It declares only native keyed node seat,
 // NOT turnTail. Actual ui-chat owns turn-tail registration and calls renderSlot.
 const tailSnapshot=createSnapshotStore([]);
 ctx.slots.register({name:'root',children:{'conversation.chat.node':{kind:'keyed',scope:'session'}}},({renderSlot})=>{
  const nodes=React.useSyncExternalStore(tailSnapshot.subscribe,tailSnapshot.getSnapshot,tailSnapshot.getSnapshot);
  return h('main',{'data-native-acceptance':true},nodes.map(node=>h('section',{key:node.key,'data-native-tail-turn':node.data.turn},renderSlot('conversation.chat.node',{node,openFile:()=>{},forkAt:()=>{}},{entryKey:'turn-tail',sessionId:transport.sessionId}))));
 });
 // Real plugin apply installs TurnTailNodeView and its own turnTail child declaration.
 // Non-rendered services remain deterministic acceptance transport faces.
 req('@deepseek-ai/dsh-client-ui-chat').apply(ctx);
 const conversation=ctx.uiConversation.binding(currentBinding);const chat=conversation.target('chat');conversation.activate('chat');
 const access=createSnapshotStore(true);
 const refreshScope=()=>{
  const hooks={};for(const contribution of standards)Object.assign(hooks,contribution.resolve(currentBinding).hooks??{});
  const value={key:transport.sessionId,ctx,hooks,keyedHooks:{access:()=>access},props:{sessionId:transport.sessionId}};
  if(!scopes.has(transport.sessionId))scopes.set(transport.sessionId,createSnapshotStore(value));else scopes.get(transport.sessionId).set(value);
  current.set(value);ctx.slots.bindStoreScope(value);
 };
 refreshScope();
 const show=()=>{const snapshot=chat.getSnapshot();if(!snapshot)return;const nodes=[];for(const turn of snapshot.timeline.turns.values()){for(const key of snapshot.locations.getTurn(turn.turn)){const node=snapshot.nodes.get(key);if(node?.kind==='turn-tail')nodes.push(node);}}tailSnapshot.set(nodes);};
 chat.subscribe(show);show();
 const extras=req(window.__acceptanceDistribution);await ctx.plugin(extras).await();
 // Config is supplied as a native accepted namespace snapshot, never a recovery CP.
 for(const form of forms.values()){form.set?.(form.getSnapshot());}
 const stop=ctx.uiRenderer.mount(document.getElementById('root'));
 window.__nativeAcceptance={ctx,show,async refresh(){const state=await(await fetch('/acceptance-state')).json();currentBinding.eventSource.replace(state.events.map(event=>({type:'event',event})),false);applyState(state);show();return state;},async dispose(){stop();await ctx.fiber.dispose();}};
 document.documentElement.dataset.nativeAcceptance='ready';
})().catch(error=>{document.documentElement.dataset.nativeAcceptance='failed';console.error(error);window.__nativeAcceptanceError=String(error.stack??error);});
