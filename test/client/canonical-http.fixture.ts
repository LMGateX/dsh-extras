import {randomUUID} from 'node:crypto';
import type {IncomingMessage,ServerResponse} from 'node:http';

/** Offline public HTTP authority: one CAS document per isolated browser context. */
export function canonicalPolicyHttpFixture() {
  const contexts=new Map<string,{document:any;writes:any[]}>();
  return async (req:IncomingMessage,res:ServerResponse):Promise<boolean> => {
    let id=req.headers.cookie?.match(/(?:^|; )extrasFixture=([^;]+)/)?.[1];
    if(!id||!contexts.has(id)){id=randomUUID();contexts.set(id,{document:{revision:3,defaults:{enabled:false,rules:[]},workspaceOverrides:{}},writes:[]});res.setHeader('Set-Cookie','extrasFixture='+id+'; Path=/; HttpOnly; SameSite=Strict');}
    const state=contexts.get(id)!;
    const url=new URL(req.url??'/','http://127.0.0.1');
    const reply=(value:unknown)=>{res.setHeader('content-type','application/json');res.end(JSON.stringify(value));};
    if(url.pathname==='/fixture/shared-document'){reply(state);return true;}
    if(url.pathname.endsWith('/shared-compaction')) {
      if(req.method==='PUT') {
        let body='';for await(const chunk of req)body+=chunk;
        const candidate=JSON.parse(body);state.writes.push(candidate);
        if(candidate.expectedRevision!==state.document.revision){res.statusCode=409;reply({current:state.document});return true;}
        state.document={revision:state.document.revision+1,defaults:candidate.defaults,workspaceOverrides:candidate.workspaceOverrides};
      }
      reply(state.document);return true;
    }
    if(url.pathname.endsWith('/retry-policy')){reply({writable:false,targets:[]});return true;}
    return false;
  };
}
