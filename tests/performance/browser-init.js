(() => {
  const origin=performance.timeOrigin;
  const events=[];
  window.__perfEvents=events;
  window.__perfPendingReads=0;
  window.__perfEmit=event=>{
    if(event.kind==='read-start')window.__perfPendingReads++;
    if(event.kind==='read-end'||event.kind==='read-error')window.__perfPendingReads--;
    events.push({...event,t:origin+performance.now(),url:location.pathname,origin});
  };
  window.__perfReact=(component,phase,actualDuration,baseDuration,startTime,commitTime)=>window.__perfEmit({kind:'react',component,phase,actualDuration,baseDuration,startTime:origin+startTime,commitTime:origin+commitTime});
  window.__perfTimer=(callback,delay,...args)=>{
    const id=Math.random().toString(36).slice(2);
    window.__perfEmit({kind:'timer-start',id,delay});
    return setTimeout(()=>{window.__perfEmit({kind:'timer-end',id,delay});callback(...args);},delay);
  };
  window.__perfEmit({kind:'document-start'});
  document.addEventListener('click',e=>window.__perfEmit({kind:'click',text:e.target.closest('button')?.innerText || e.target.textContent?.slice(0,100)}),true);
  for(const method of ['pushState','replaceState']) {
    const original=history[method];
    history[method]=function(...args){const result=original.apply(this,args);window.__perfEmit({kind:'url'});return result;};
  }
  for(const type of ['longtask','paint','largest-contentful-paint','layout-shift','event','resource','navigation']) {
    try {new PerformanceObserver(list=>{for(const e of list.getEntries()) window.__perfEmit({kind:'performance',entryType:type,entry:e.toJSON()});}).observe({type,buffered:true,...(type==='event'?{durationThreshold:16}:{})});}catch{}
  }
  let last='',lastSpinner;
  function observe() {
    const root=document.querySelector('#root');
    const spinner=!!root?.querySelector('[class*="containerLoad"]');
    if(spinner!==lastSpinner){window.__perfEmit({kind:'spinner',visible:spinner});lastSpinner=spinner;}
    const text=root?.innerText?.trim().slice(0,160) || '';
    if(text && text!==last){window.__perfEmit({kind:'content',text,spinner});last=text;}
  }
  document.addEventListener('DOMContentLoaded',()=>{
    new MutationObserver(observe).observe(document.querySelector('#root'),{childList:true,subtree:true,attributes:true,attributeFilter:['class']});observe();
  });
  setInterval(()=>{if(events.length && window.__perfSink) window.__perfSink(events.splice(0));},100);
  addEventListener('pagehide',()=>{if(events.length && window.__perfSink)window.__perfSink(events.splice(0));});
})();
