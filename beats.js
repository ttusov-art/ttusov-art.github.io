// Beat grid detection, with tempo sections. Pure functions, shared by the app and tests (copied from index.html).
function fftRadix2(re, im){
  const n=re.length;
  for(let i=1,j=0;i<n;i++){ let bit=n>>1; for(;j&bit;bit>>=1) j^=bit; j^=bit; if(i<j){ let t=re[i]; re[i]=re[j]; re[j]=t; t=im[i]; im[i]=im[j]; im[j]=t; } }
  for(let len=2;len<=n;len<<=1){
    const ang=-2*Math.PI/len, wr=Math.cos(ang), wi=Math.sin(ang);
    for(let i=0;i<n;i+=len){ let cr=1,ci=0;
      for(let k=0;k<len/2;k++){ const a=i+k,b=a+len/2, xr=re[b]*cr-im[b]*ci, xi=re[b]*ci+im[b]*cr;
        re[b]=re[a]-xr; im[b]=im[a]-xi; re[a]+=xr; im[a]+=xi; const t=cr*wr-ci*wi; ci=cr*wi+ci*wr; cr=t; } }
  }
}
async function onsetEnvelope(x, sr, onProg){
  const N=512, hop=128, frames=Math.max(0,Math.floor((x.length-N)/hop)), env=new Float32Array(frames), lowE=new Float32Array(frames);   // lowE: kick drum band (≈30–150 Hz)
  const win=new Float64Array(N); for(let i=0;i<N;i++) win[i]=0.5-0.5*Math.cos(2*Math.PI*i/N);
  const re=new Float64Array(N), im=new Float64Array(N), prev=new Float64Array(N/2), kMax=Math.min(N/2,Math.round(5000/sr*N)), kLo=Math.max(1,Math.round(30/sr*N)), kHi=Math.round(150/sr*N);
  for(let f=0;f<frames;f++){
    const s=f*hop; for(let i=0;i<N;i++){ re[i]=x[s+i]*win[i]; im[i]=0; }
    fftRadix2(re,im); let flux=0, lf=0;
    for(let k=1;k<kMax;k++){ const m=Math.log1p(100*Math.hypot(re[k],im[k])); const d=m-prev[k]; if(d>0){ flux+=d; if(k>=kLo&&k<=kHi) lf+=d; } prev[k]=m; }
    env[f]=flux; lowE[f]=lf;
    if(onProg&&f%3000===0){ onProg(f/frames); await new Promise(r=>setTimeout(r,0)); }
  }
  // remove slow trend (local mean over ~0.5 s) and keep the positive part
  const fps=sr/hop, w=Math.round(fps*0.25);
  const detrend=e=>{ const out=new Float32Array(frames), cs=new Float64Array(frames+1); for(let i=0;i<frames;i++) cs[i+1]=cs[i]+e[i];
    for(let i=0;i<frames;i++){ const a=Math.max(0,i-w), b=Math.min(frames,i+w+1); out[i]=Math.max(0,e[i]-(cs[b]-cs[a])/(b-a)); } return out; };
  return {env:detrend(env),low:detrend(lowE),fps};
}
function combScore(env,fps,P,o){
  let s=0,n=0; for(let t=o;;t+=P){ const x=t*fps; const i=Math.floor(x); if(i+1>=env.length) break; const f=x-i; s+=env[i]*(1-f)+env[i+1]*f; n++; }
  return n?s/n:0;
}
function refineGrid(env,fps,t0,t1,P0){ // best period near P0 and phase over t0…t1 (comb search); o is an absolute time
  const i0=Math.max(0,Math.round(t0*fps)), seg=env.subarray(i0,Math.min(env.length,Math.round(t1*fps))); let best={s:-1,P:P0,o:0};
  for(let r=-0.02;r<=0.02001;r+=0.0004){ const P=P0*(1+r); for(let o=0;o<P;o+=0.01){ const s=combScore(seg,fps,P,o); if(s>best.s) best={s,P,o}; } }
  for(let r=-0.0006;r<=0.00061;r+=0.00005){ const P=best.P*(1+r); for(let o=best.o-0.012;o<=best.o+0.012;o+=0.002){ const oo=((o%P)+P)%P, s=combScore(seg,fps,P,oo); if(s>best.s) best={s,P,o:oo}; } }
  return {P:best.P, o:i0/fps+best.o, s:best.s};
}
function acTempo(env,fps,a,b){ // autocorrelation tempo of env[a…b), weighted towards ~110 BPM
  const lmin=Math.floor(fps*60/200), lmax=Math.ceil(fps*60/55), ac=new Float64Array(lmax+2);
  for(let L=lmin;L<=lmax+1;L++){ let s=0; for(let i=a;i+L<b;i++) s+=env[i]*env[i+L]; ac[L]=s/Math.max(1,b-a-L); }
  let bestL=-1,bestV=-1;
  for(let L=lmin+1;L<=lmax;L++){ if(!(ac[L]>=ac[L-1]&&ac[L]>=ac[L+1])) continue; const bpm=60*fps/L, wgt=Math.exp(-0.5*Math.pow(Math.log2(bpm/110)/0.8,2)), v=ac[L]*wgt; if(v>bestV){ bestV=v; bestL=L; } }
  if(bestL<0) return 0; const A=ac[bestL-1],B=ac[bestL],C=ac[bestL+1],den=A-2*B+C;
  return 60*fps/(bestL+(den<0?0.5*(A-C)/den:0));
}
// tempo sections: 16 s windows every 4 s; runs of 40 s or more that agree on a tempo (or its 3:2 feel) become sections
function tempoKin(a,b){ const r=a/b; return [1,1.5,2/3].some(k=>Math.abs(r/k-1)<0.03); }
function findTempoSections(env,fps){
  const WS=16, W=Math.round(WS*fps), H=Math.round(4*fps), win=[];
  for(let a=0;a+W<=env.length;a+=H){ let bpm=acTempo(env,fps,a,a+W); if(bpm){ while(bpm<78) bpm*=2; while(bpm>=156) bpm/=2; } win.push({t:a/fps,bpm}); }
  if(win.length<20) return null;
  const runs=[]; let cur=null;
  for(const w of win){ if(cur&&w.bpm&&tempoKin(w.bpm,cur.ref)){ cur.w.push(w); continue; } cur={ref:w.bpm||1,w:[w]}; runs.push(cur); }
  const m=[];
  for(const r of runs){ if(r.w[r.w.length-1].t+WS-r.w[0].t<40) continue; const p=m[m.length-1]; if(p&&tempoKin(p.ref,r.ref)) p.w=p.w.concat(r.w); else m.push({ref:r.ref,w:r.w.slice()}); }
  if(m.length<2) return null;
  const secs=m.map(r=>{ let bv=0,bc=-1; for(const a of r.w){ const c=r.w.filter(b=>Math.abs(b.bpm/a.bpm-1)<0.02).length; if(c>bc){ bc=c; bv=a.bpm; } }
    const near=r.w.filter(b=>Math.abs(b.bpm/bv-1)<0.02).map(b=>b.bpm).sort((a,b)=>a-b), t0=r.w[0].t, t1=r.w[r.w.length-1].t+WS;
    return {...refineGrid(env,fps,t0,t1,60/near[near.length>>1]),a:t0,b:t1}; });
  // boundary: where the new grid starts fitting better than the old one (middle of an undecided stretch)
  const fit=(g,t,len)=>{ const a=Math.max(0,Math.round(t*fps)), seg=env.subarray(a,Math.min(env.length,Math.round((t+len)*fps))), o=((g.o-a/fps)%g.P+g.P)%g.P; return combScore(seg,fps,g.P,o)/(g.s||1); };
  const out=[{t:0,P:secs[0].P,o:secs[0].o}];
  for(let i=1;i<secs.length;i++){
    const A=secs[i-1], B=secs[i], lo=Math.max(A.a,A.b-24), hi=Math.min(B.b,B.a+24), xs=[];
    for(let t=lo;t+2<=hi;t+=2){ const d=fit(B,t,2)-fit(A,t,2); xs.push({t,v:Math.abs(d)<0.2?0:Math.sign(d)}); }
    const fs=[]; for(let j=0;j<=xs.length;j++){ let f=0; for(let q=0;q<xs.length;q++) f+=q<j?-xs[q].v:xs[q].v; fs.push(f); }
    const mx=Math.max(...fs), js=fs.map((f,j)=>f===mx?j:-1).filter(j=>j>=0), jm=js[(js.length-1)>>1], bt=jm<xs.length?xs[jm].t:hi;
    const t=B.o+Math.round((bt-B.o)/B.P)*B.P; if(t>out[out.length-1].t+10) out.push({t,P:B.P,o:t});
  }
  return out.length>1?out:null;
}
// 3:2 check: at a tempo ⅔ too slow each "beat" holds three eighth notes, so the hits between beats fall at the thirds;
// at the right tempo they fall halfway. Switch to 1.5× when the beat splits in three and 1.5× fits better (halfway hits, stronger beats).
function beatShape(env,fps,P0,t0,t1){
  const a=Math.max(0,Math.round(t0*fps)), seg=env.subarray(a,Math.min(env.length,Math.round(t1*fps))); let best={s:-1,P:P0,o:0};
  for(let r=-0.01;r<=0.01001;r+=0.001){ const P=P0*(1+r); for(let o=0;o<P;o+=0.005){ const v=combScore(seg,fps,P,o); if(v>best.s) best={s:v,P,o}; } }
  const P=best.P, at=q=>combScore(seg,fps,P,((best.o+q*P)%P+P)%P); let rest=0; for(let i=0;i<20;i++) rest+=at((i+0.5)/20); rest=rest/20||1e-9;
  return {P, o:a/fps+best.o, beat:best.s/rest, half:at(0.5)/rest, thirds:(at(1/3)+at(2/3))/2/rest};
}
function fixTriple(env,fps,P,o,t0,t1){
  if(60*1.5/P>200) return null;
  const A=beatShape(env,fps,P,t0,t1), B=beatShape(env,fps,P/1.5,t0,t1);
  if(!(A.thirds>2*A.half&&B.half>B.thirds&&B.beat>A.beat)) return null;
  const g=refineGrid(env,fps,t0,t1,B.P); return {P:g.P,o:g.o};
}
// beat or off-beat? the whole grid can sit half a beat off; if the kick drum clearly hits the half-beat lines, use those
function kickPhase(low,fps,P,o,t0,t1){
  const a=Math.max(0,Math.round(t0*fps)), seg=low.subarray(a,Math.min(low.length,Math.round(t1*fps))), ph=x=>((x-a/fps)%P+P)%P;
  const on=combScore(seg,fps,P,ph(o)), half=combScore(seg,fps,P,ph(o+P/2));
  return half>on*1.25?o+P/2:o;
}
async function detectBeatGrid(x, sr, onProg){
  const {env,low,fps}=await onsetEnvelope(x,sr,onProg);
  if(env.length<fps*8) return null;
  const confOf=(P,o)=>{ const on=combScore(env,fps,P,((o%P)+P)%P), off=combScore(env,fps,P,(((o+P/2)%P)+P)%P); return off>0?on/off:9; };
  const sec=findTempoSections(env,fps);
  if(sec){ sec.forEach((s,i)=>{ const t1=i+1<sec.length?sec[i+1].t:env.length/fps, t0=i?s.t:0, f=fixTriple(env,fps,s.P,s.o,t0,t1);
      if(f){ s.P=f.P; s.o=i?f.o+Math.round((s.t-f.o)/f.P)*f.P:f.o; }
      const o=kickPhase(low,fps,s.P,s.o,t0,t1); if(i){ s.t=o; s.o=o; } else s.o=o; });
    const s0=sec[0]; return {bpm:60/s0.P, offset:((s0.o%s0.P)+s0.P)%s0.P, conf:confOf(s0.P,s0.o), changes:sec.slice(1).map(s=>({t:s.t,bpm:60/s.P,bar:null}))}; }
  const g=refineGrid(env,fps,0,env.length/fps,60/acTempo(env,fps,0,env.length)), f=fixTriple(env,fps,g.P,g.o,0,env.length/fps); if(f){ g.P=f.P; g.o=f.o; }
  g.o=kickPhase(low,fps,g.P,g.o,0,env.length/fps);
  return {bpm:60/g.P, offset:((g.o%g.P)+g.P)%g.P, conf:confOf(g.P,g.o)};
}

if(typeof module!=='undefined') module.exports={detectBeatGrid,onsetEnvelope,combScore,findTempoSections,fftRadix2};
