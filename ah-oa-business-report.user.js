// ==UserScript==
// @name         安徽OA · 亳州经营报表 XLSX
// @namespace    local.ahoa.bozhou.report
// @version      1.4.0-beta.3
// @homepageURL  https://github.com/wellblink/ah-oa-business-report
// @updateURL    https://cdn.jsdelivr.net/gh/wellblink/ah-oa-business-report@main/ah-oa-business-report.meta.js
// @downloadURL  https://cdn.jsdelivr.net/gh/wellblink/ah-oa-business-report@main/ah-oa-business-report.user.js
// @match        http://portal.mss.anhuitelecom.com:12104/idealprotalview/*
// @match        https://nlkf-eda.anhuitelecom.com:11050/dtPortal/*
// @match        http://tsfx-eda.anhuitelecom.com:12110/dashboard/*
// @grant        unsafeWindow
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        GM_cookie
// @connect      tsfx-eda.anhuitelecom.com
// @sandbox      raw
// @run-at       document-idle
// @noframes
// ==/UserScript==

(function () {
  'use strict';
  const W = typeof unsafeWindow === 'undefined' ? window : unsafeWindow;
  const KEY = 'ahoa.export.job.api.v1';
  const REPORTS = {
    promo:{name:'大促发展日报（五级）',id:'vbap878e0411e1dc07938c4aa5a0',system:'每日重点经营关注',cols:73,headers:3,latn:'本地网',dates:['开始时间','结束时间'],filters:['客户群','分团队','发展渠道','四级单元类型','是否星客']},
    million4:{name:'百天百万路攻坚（四级）',id:'vbapfe346f0637978fa3da47fd50',system:'企业数据仓库',cols:25,headers:2,latn:'地市',range:'日期',filters:['三级单元名称','四级单元名称','渠道','条线'],summary:'bottom',dimensions:5},
    value3:{name:'价值积分（三级）',id:'vbapda46e735e0b7d78add62ee5f',system:'每日重点经营关注',cols:52,headers:3,latn:'本地网',dates:['开始日期','结束日期'],filters:['客户群','渠道','是否存量'],summary:'top',dimensions:3},
    value4:{name:'价值积分（四级）',id:'vbap2f5cb8d9c5be7d9bc4a377fd',system:'每日重点经营关注',cols:54,headers:3,latn:'本地网',dates:['开始日期','结束日期'],filters:['客户群','渠道','是否存量','四级类型'],summary:'top',dimensions:5}
  };
  const reportOf = job => REPORTS[job?.reportKey || 'promo'];
  const PAGE_SIZE = 500;
  const TTL = 30 * 60 * 1000;
  const D = W.document;
  if (D.getElementById('ahoa-export-root')) return;
  const host = D.createElement('div');
  host.id = 'ahoa-export-root';
  D.documentElement.append(host);
  const root = host.attachShadow({mode: 'open'});
  const icon=(name,size=20)=>`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${{
    download:'<path d="M12 3v11m-4-4 4 4 4-4"/><path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/>',
    chevron:'<path d="m8 10 4 4 4-4"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="4"/><path d="M7 3v4m10-4v4M3 11h18m-11 4h.01M12 15h.01M16 15h.01"/>',
    left:'<path d="m14 6-6 6 6 6"/>',right:'<path d="m10 6 6 6-6 6"/>'
  }[name]}</svg>`;
  root.innerHTML = `<style>
    :host{all:initial;font:14px/1.5 -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;color:#1d1d1f;color-scheme:light}
    *,*::before,*::after{box-sizing:border-box}button,input,select{font:inherit}button{border:0;cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent}button:disabled{cursor:default;opacity:.46}button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #007aff45;outline-offset:3px}svg{display:block;flex:none}button{transition:background .16s,box-shadow .16s,opacity .16s}button:not(:disabled):active{filter:brightness(.95)}[hidden]{display:none!important}
    #entry{position:fixed;right:24px;bottom:24px;z-index:2147483646;display:flex;align-items:center;gap:10px;padding:13px 19px;border:1px solid #ffffffcc;border-radius:999px;background:#fffffff2;color:#1d1d1f;font-weight:600;font-size:14px;letter-spacing:.01em;box-shadow:0 2px 6px #14213d0a,0 8px 28px #14213d21;cursor:grab;touch-action:none;white-space:nowrap}#entry svg{color:#007aff}#entry:hover{background:white;box-shadow:0 3px 10px #14213d0f,0 10px 30px #14213d29}#entry.dragging{cursor:grabbing;box-shadow:0 10px 30px #14213d33}
    #shade{display:none;position:fixed;inset:0;z-index:2147483647;background:#1320394d;align-items:center;justify-content:center;padding:20px;overflow:auto}
    #box{position:relative;width:408px;max-width:100%;max-height:calc(100dvh - 40px);overflow:auto;padding:28px;border:1px solid #ffffffcc;border-radius:26px;background:#fff;box-shadow:0 24px 90px #0e1e3a33,0 2px 8px #0e1e3a0a}
    .heading{padding-right:24px;display:flex;align-items:center;gap:13px;margin-bottom:26px}.mark{display:grid;place-items:center;width:44px;height:44px;border-radius:13px;background:#eaf3ff;color:#007aff;flex:none}h2{font-size:23px;font-weight:650;letter-spacing:-.7px;line-height:1.3;margin:0}p{font-size:13px;color:#86868b;margin:5px 0 0}
    .field+.field{margin-top:18px}label{display:block;font-size:12px;font-weight:600;letter-spacing:.02em;color:#6e6e73;margin:0 0 7px 2px}.control{height:50px;position:relative;border:1px solid #e8e8ed;border-radius:12px;background:#f5f5f7;transition:border-color .16s,box-shadow .16s}.control:focus-within{border-color:#007aff88;box-shadow:0 0 0 3px #007aff0c}
    input,select{display:block;width:100%;height:100%;margin:0;padding:0 48px 0 14px;border:0;border-radius:11px;color:#1d1d1f;background:transparent;font-size:15px;line-height:normal;appearance:none;-webkit-appearance:none}input{font-variant-numeric:tabular-nums;letter-spacing:.2px}input:focus,select:focus{outline:0}input::placeholder{color:#aaaab0}.field-icon{position:absolute;right:0;top:0;width:46px;height:48px;display:flex;align-items:center;justify-content:center;color:#86868b;background:transparent;border-radius:11px;pointer-events:none}.field-icon.picker{pointer-events:auto}.picker:hover{color:#007aff;background:#007aff08}select{cursor:pointer}select:disabled,input:disabled{opacity:.5}.control:has(:disabled) .picker{opacity:.4}
    .actions{display:flex;flex-direction:column;gap:12px;margin-top:26px}.actions button{display:flex;align-items:center;justify-content:center;min-height:46px;padding:11px 14px;border-radius:12px;font-size:14px;font-weight:600;line-height:1.45}.primary{background:#007aff;color:#fff;box-shadow:0 2px 5px #007aff1c}.primary:hover:not(:disabled){background:#006eed}.secondary{color:#424247;background:#f0f0f3}.secondary:hover:not(:disabled){background:#e7e7ec}.danger{color:#d73535;background:#fff0f0}.danger:hover:not(:disabled){background:#ffe4e4}
    #status{display:flex;align-items:center;justify-content:center;gap:8px;font-size:13px;color:#6e6e73;overflow-wrap:anywhere;text-align:center;line-height:1.55;padding:11px 12px;margin-top:18px;border-radius:12px;background:#f5f5f7}#status:empty{display:none}#status.success{color:#21834a;background:#edf8f1}#status.error{color:#c53232;background:#fff0f0}
    #close{position:absolute;right:18px;top:18px;width:30px;height:30px;padding:0;display:grid;place-items:center;border-radius:50%;color:#86868b;background:#f0f0f3}#close:hover{color:#424247;background:#e7e7ec}
    #jobbar{display:none;position:fixed;right:24px;bottom:84px;z-index:2147483646;max-width:min(320px,calc(100vw - 32px));border:1px solid #e8e8ed;border-radius:16px;background:#fffffff5;color:#53535b;box-shadow:0 5px 24px #14213d1a;padding:13px 17px;font-size:13px;line-height:1.55;overflow-wrap:anywhere;pointer-events:none}
    #calendar{position:fixed;z-index:2;width:300px;max-width:calc(100vw - 24px);max-height:calc(100dvh - 24px);overflow:auto;padding:17px;border:1px solid #e5e5eac9;border-radius:21px;background:#fff;box-shadow:0 14px 48px #14213d29,0 2px 7px #14213d0d}.cal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:13px}.cal-head strong{font-size:15px;font-weight:650;letter-spacing:-.2px}.cal-nav{display:flex;gap:4px}.cal-nav button{width:30px;height:30px;display:grid;place-items:center;background:#f5f5f7;color:#68686e;border-radius:9px}.cal-nav button:hover{background:#eaf3ff;color:#007aff}.weekdays,#calDays{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px}.weekdays{margin-bottom:6px}.weekdays span{text-align:center;color:#a0a0a7;font-size:11px;line-height:26px}#calDays button{height:32px;min-width:0;border-radius:9px;background:transparent;color:#303035;font-size:13px;font-variant-numeric:tabular-nums}#calDays button:hover{background:#f0f5ff;color:#007aff}#calDays button.outside{color:#c1c1c6}#calDays button.today{box-shadow:inset 0 0 0 1px #007aff55;color:#007aff}#calDays button.selected{background:#007aff;color:#fff;box-shadow:0 2px 5px #007aff26}.cal-footer{margin-top:13px;border-top:1px solid #f0f0f3;padding-top:11px;display:flex;justify-content:space-between;gap:12px}.cal-footer button{background:transparent;color:#007aff;padding:5px 8px;border-radius:7px;font-size:12px;font-weight:500}.cal-footer button:hover{background:#f0f5ff}
    @media(max-width:440px){#shade{padding:14px}#box{padding:24px 20px;border-radius:23px;max-height:calc(100dvh - 28px)}h2{font-size:21px}.heading{gap:11px}.actions{gap:10px}#entry{right:16px;bottom:18px}}
    @media(prefers-reduced-motion:reduce){*{transition:none!important}}
  </style><button id="entry" title="拖动调整位置，点击导出" aria-label="经营报表导出">${icon('download',18)}<span>经营报表导出</span></button><div id="jobbar" role="status" aria-live="polite"></div><div id="shade"><section id="box" role="dialog" aria-modal="true" aria-labelledby="title">
    <button id="close" aria-label="关闭" title="关闭">${icon('close',16)}</button><div class="heading"><div class="mark">${icon('download',23)}</div><div><h2 id="title">经营报表导出</h2><p>选择报表与日期</p></div></div>
    <div class="field"><label for="reportType">报表类型</label><div class="control"><select id="reportType">${Object.entries(REPORTS).map(([key,r])=>`<option value="${key}">${r.name}</option>`).join('')}</select><span class="field-icon">${icon('chevron',18)}</span></div></div>
    <div class="field"><label for="start">开始日期</label><div class="control"><input id="start" type="text" inputmode="numeric" autocomplete="off" placeholder="YYYY-MM-DD" maxlength="10" required><button class="field-icon picker" id="pickStart" aria-label="选择开始日期" aria-haspopup="dialog" aria-expanded="false">${icon('calendar',18)}</button></div></div>
    <div class="field"><label for="end">结束日期</label><div class="control"><input id="end" type="text" inputmode="numeric" autocomplete="off" placeholder="YYYY-MM-DD" maxlength="10" required><button class="field-icon picker" id="pickEnd" aria-label="选择结束日期" aria-haspopup="dialog" aria-expanded="false">${icon('calendar',18)}</button></div></div>
    <div id="status" role="status" aria-live="polite"></div>
    <div class="actions"><button id="startExport" class="primary">开始导出</button><button id="again" class="primary" style="display:none">重新保存</button><button id="cancelTask" class="danger" style="display:none">停止导出</button></div>
  <div id="calendar" role="dialog" aria-label="选择日期" hidden><div class="cal-head"><strong id="calMonth"></strong><div class="cal-nav"><button id="calPrev" aria-label="上个月">${icon('left',15)}</button><button id="calNext" aria-label="下个月">${icon('right',15)}</button></div></div><div class="weekdays" aria-hidden="true">${['一','二','三','四','五','六','日'].map(s=>`<span>${s}</span>`).join('')}</div><div id="calDays" role="group" aria-label="日期"></div><div class="cal-footer"><button id="calToday">今天</button><button id="calDone">完成</button></div></div></section></div>`;
  const $ = s => root.querySelector(s);
  $('#reportType').value=GM_getValue('ahoa.export.report','promo');
  if(!REPORTS[$('#reportType').value]) $('#reportType').value='promo';
  let busy = false, cancelled = false, lastFile = null, currentJob = null;
  const readJob = () => GM_getValue(KEY, null);
  const isLive = j => j && Date.now() - j.created < TTL && !['done','error','cancelled'].includes(j.stage);
  const saveJob = j => { GM_setValue(KEY, j); currentJob = j; return j; };
  const updateJob = (j, patch) => saveJob({...j, ...patch, updated:Date.now()});
  const isoDate=d=>`${String(d.getFullYear()).padStart(4,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  let calendarTarget=null, calendarMonth=null, calendarFocus=null;
  function closeCalendar(focus=false){
    const target=calendarTarget;calendarTarget=null;$('#calendar').hidden=true;
    $('#pickStart').setAttribute('aria-expanded','false');$('#pickEnd').setAttribute('aria-expanded','false');
    if(focus&&target) $('#'+target).focus({preventScroll:true});
  }
  function placeCalendar(){
    if(!calendarTarget)return;
    const rect=$('#'+calendarTarget).getBoundingClientRect(),cal=$('#calendar'),gap=8,pad=12;
    const width=cal.offsetWidth,height=cal.offsetHeight;
    const below=rect.bottom+gap,above=rect.top-gap-height;
    cal.style.left=`${Math.max(pad,Math.min(rect.right-width,W.innerWidth-width-pad))}px`;
    cal.style.top=`${Math.max(pad,Math.min(below+height<=W.innerHeight-pad?below:above,W.innerHeight-height-pad))}px`;
  }
  function renderCalendar(focus=false){
    const year=calendarMonth.getFullYear(),month=calendarMonth.getMonth(),first=new Date(year,month,1),today=isoDate(new Date());
    $('#calMonth').textContent=`${year}年 ${month+1}月`;
    const begin=1-(first.getDay()+6)%7,selected=$('#'+calendarTarget).value;
    $('#calDays').innerHTML=Array.from({length:42},(_,i)=>{
      const day=new Date(year,month,begin+i),date=isoDate(day);
      const classes=[day.getMonth()!==month?'outside':'',date===today?'today':'',date===selected?'selected':''].filter(Boolean).join(' ');
      return `<button data-date="${date}" class="${classes}" aria-label="${date}" aria-pressed="${date===selected}" tabindex="${date===calendarFocus?0:-1}">${day.getDate()}</button>`;
    }).join('');
    placeCalendar();
    if(focus) $('#calDays').querySelector(`[data-date="${calendarFocus}"]`)?.focus({preventScroll:true});
  }
  function openCalendar(target){
    if(busy)return;
    if(calendarTarget===target){closeCalendar();return;}
    closeCalendar();calendarTarget=target;
    const date=validDate($('#'+target).value)?new Date($('#'+target).value+'T12:00:00'):new Date();
    calendarMonth=new Date(date.getFullYear(),date.getMonth(),1);calendarFocus=isoDate(date);
    $('#calendar').hidden=false;$('#'+(target==='start'?'pickStart':'pickEnd')).setAttribute('aria-expanded','true');
    renderCalendar(true);
  }
  function chooseDate(date){
    if(!calendarTarget)return;
    if($('#'+calendarTarget).value!==date)resetResult();
    $('#'+calendarTarget).value=date;closeCalendar(true);
  }
  function shiftMonth(delta){calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+delta,1);calendarFocus=isoDate(calendarMonth);renderCalendar();}
  $('#pickStart').onclick=()=>openCalendar('start');$('#pickEnd').onclick=()=>openCalendar('end');
  $('#start').onclick=()=>openCalendar('start');$('#end').onclick=()=>openCalendar('end');
  $('#calPrev').onclick=()=>shiftMonth(-1);$('#calNext').onclick=()=>shiftMonth(1);
  $('#calToday').onclick=()=>chooseDate(isoDate(new Date()));$('#calDone').onclick=()=>closeCalendar(true);
  $('#calDays').onclick=e=>{const day=e.target.closest('button[data-date]');if(day)chooseDate(day.dataset.date);};
  $('#calDays').onkeydown=e=>{
    const key=e.key,delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[key];
    if(delta===undefined && !['PageUp','PageDown','Home','End'].includes(key))return;
    e.preventDefault();const date=new Date(calendarFocus+'T12:00:00');
    if(delta!==undefined)date.setDate(date.getDate()+delta);
    else if(key==='Home'||key==='End')date.setDate(date.getDate()-(date.getDay()+6)%7+(key==='End'?6:0));
    else {date.setDate(1);date.setMonth(date.getMonth()+(key==='PageUp'?-1:1));}
    calendarMonth=new Date(date.getFullYear(),date.getMonth(),1);calendarFocus=isoDate(date);renderCalendar(true);
  };
  root.onpointerdown=e=>{
    if(calendarTarget && !e.composedPath().includes($('#calendar')) && !e.composedPath().includes($('#'+calendarTarget).parentElement))closeCalendar();
  };
  root.onkeydown=e=>{
    if(e.key==='Escape'){
      e.preventDefault();e.stopPropagation();if(calendarTarget)closeCalendar(true);else hide();
    } else if(e.key==='Tab' && $('#shade').style.display==='flex'){
      const items=[...root.querySelectorAll('#box button,#box input,#box select,#calendar button')].filter(e=>!e.disabled&&e.tabIndex!==-1&&e.getClientRects().length);
      const first=items[0],last=items[items.length-1];
      if(e.shiftKey&&root.activeElement===first){e.preventDefault();last?.focus();}
      else if(!e.shiftKey&&root.activeElement===last){e.preventDefault();first?.focus();}
    }
  };
  $('#shade').onclick=e=>{if(e.target===$('#shade'))hide();};
  function hide(){closeCalendar();$('#shade').style.display='none';$('#entry').focus({preventScroll:true});if(currentJob?.message)$('#jobbar').style.display='block';}

  // Pointer capture keeps dragging local to this one button; no idle polling.
  const entry=$('#entry'),savedPosition=GM_getValue('ahoa.export.buttonPosition',null);
  let position=savedPosition&&Number.isFinite(savedPosition.x)&&Number.isFinite(savedPosition.y)?savedPosition:null;
  let drag=null,dragFrame=0,suppressClick=false;
  const clamp=(v,min,max)=>Math.max(min,Math.min(v,Math.max(min,max)));
  function placeEntry(){
    if(!position)return;
    const x=clamp(position.x*(W.innerWidth-entry.offsetWidth),12,W.innerWidth-entry.offsetWidth-12);
    const y=clamp(position.y*(W.innerHeight-entry.offsetHeight),12,W.innerHeight-entry.offsetHeight-12);
    Object.assign(entry.style,{left:x+'px',top:y+'px',right:'auto',bottom:'auto'});
  }
  function paintDrag(){dragFrame=0;if(!drag)return;Object.assign(entry.style,{left:drag.x+'px',top:drag.y+'px',right:'auto',bottom:'auto'});}
  entry.onpointerdown=e=>{
    if(e.button!==0)return;
    const rect=entry.getBoundingClientRect();drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,left:rect.left,top:rect.top,x:rect.left,y:rect.top,moved:false};
    entry.setPointerCapture(e.pointerId);
  };
  entry.onpointermove=e=>{
    if(!drag||e.pointerId!==drag.id)return;
    const dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;
    if(!drag.moved&&Math.hypot(dx,dy)<5)return;
    drag.moved=true;entry.classList.add('dragging');
    drag.x=clamp(drag.left+dx,12,W.innerWidth-entry.offsetWidth-12);drag.y=clamp(drag.top+dy,12,W.innerHeight-entry.offsetHeight-12);
    if(!dragFrame)dragFrame=W.requestAnimationFrame(paintDrag);
  };
  function finishDrag(e){
    if(!drag||e.pointerId!==drag.id)return;
    if(dragFrame){W.cancelAnimationFrame(dragFrame);dragFrame=0;}if(drag.moved)paintDrag();
    if(drag.moved){position={x:drag.x/Math.max(1,W.innerWidth-entry.offsetWidth),y:drag.y/Math.max(1,W.innerHeight-entry.offsetHeight)};GM_setValue('ahoa.export.buttonPosition',position);suppressClick=e.type!=='pointercancel';setTimeout(()=>{suppressClick=false;},0);}
    drag=null;entry.classList.remove('dragging');
    if(entry.hasPointerCapture(e.pointerId))entry.releasePointerCapture(e.pointerId);
  }
  entry.onpointerup=finishDrag;entry.onpointercancel=finishDrag;
  entry.onclick=()=>{if(!suppressClick)show();};
  W.addEventListener('resize',()=>{placeEntry();closeCalendar();},{passive:true});
  placeEntry();
  const text = e => (e?.textContent || '').replace(/[\ue000-\uf8ff]/g,'').replace(/（/g,'(').replace(/）/g,')').replace(/\s+/g,'').trim();
  const visible = e => e && e.getClientRects().length && W.getComputedStyle(e).visibility !== 'hidden';
  const exact = (s, selectors='a,li,h1,span,div') => [...D.querySelectorAll(selectors)].filter(e => visible(e) && text(e)===s.replace(/\s+/g,'')).sort((a,b)=>a.children.length-b.children.length)[0];
  function paintStatus(message,error=false) {
    const display=message;
    $('#status').textContent=display;
    $('#status').className=display==='导出成功'?'success':error?'error':'';
    $('#jobbar').textContent=display;
    $('#jobbar').style.display=display&&$('#shade').style.display!=='flex'?'block':'none';
  }
  function status(message, error=false) {
    if (currentJob && readJob()?.id===currentJob.id) currentJob=updateJob(currentJob,{message});
    paintStatus(message,error);
  }
  function show() {
    $('#shade').style.display='flex';
    $('#jobbar').style.display='none';
    $('#cancelTask').style.display=isLive(readJob())?'inline-flex':'none';
    const last=GM_getValue('ahoa.export.dates',{}), now=new Date();
    const today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    if (!$('#start').value) $('#start').value=last.start || `${now.getFullYear()}-01-01`;
    if (!$('#end').value) $('#end').value=last.end || today;
    if(!busy)$('#reportType').focus({preventScroll:true});
  }
  function setBusy(value) {
    busy=value; $('#startExport').disabled=value;
    $('#start').disabled=value; $('#end').disabled=value;
    $('#reportType').disabled=value;
    $('#pickStart').disabled=value;$('#pickEnd').disabled=value;
    $('#startExport').textContent=value?'正在导出…':'开始导出';
    $('#startExport').style.display=value||!lastFile?'flex':'none';
    $('#again').style.display=!value&&lastFile?'flex':'none';
    $('#cancelTask').style.display=value||isLive(readJob())?'inline-flex':'none';
    $('#cancelTask').disabled=false;
    if(value){closeCalendar();$('#close').focus({preventScroll:true});}
  }
  const queryKey=()=>JSON.stringify([$('#reportType').value,$('#start').value.trim(),$('#end').value.trim()]);
  function resetResult(){
    if(busy)return;
    lastFile=null;
    $('#again').style.display='none';
    $('#startExport').textContent='开始导出';
    $('#startExport').style.display='flex';
    paintStatus('');
    if(!isLive(readJob()))currentJob=null;
  }
  $('#reportType').onchange=resetResult;
  for(const id of ['start','end']){
    $('#'+id).oninput=resetResult;
    $('#'+id).onchange=resetResult;
  }
  function check() {
    if (cancelled || (currentJob && readJob()?.id!==currentJob.id) || readJob()?.stage==='cancelled') throw new Error('已停止导出，未生成不完整文件。');
  }
  function download(file) {
    const a=D.createElement('a'), url=URL.createObjectURL(file.blob);
    a.href=url; a.download=file.name; D.body.append(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  function fail(e) {
    const detail=e?.message || String(e),message=cancelled?'已停止':'导出失败';
    if(currentJob && readJob()?.id===currentJob.id) currentJob=updateJob(currentJob,{stage:cancelled?'cancelled':'error',message,errorDetail:detail});
    W.console?.warn('[经营报表导出]',detail);
    setBusy(false); show(); status(message,!cancelled);
  }
  const REPORT_ORIGIN='http://tsfx-eda.anhuitelecom.com:12110';
  const API=REPORT_ORIGIN+'/datasience/vbap3/';
  let activeRequest=null;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const labelOf=q=>String(q.set?.alias||q.name||'').replace(/[\s:：]/g,'');
  function authError(){return new Error('登录已失效或当前工号没有报表权限，请重新登录后再试。');}
  function requestJSON(url,body,session){
    check();
    const target=new URL(url);
    if(target.origin!==REPORT_ORIGIN || !/^\/datasience\/(?:vbap3\/(?:api\/results\/vbap[a-f0-9]+|dashboard\/component\/find|query\/data\/)|management\/sysUserInfo\/getUnionUserInfo)$/.test(target.pathname)) throw new Error('接口地址不在允许的查询范围内。');
    return new Promise((resolve,reject)=>{
      let settled=false,handle,timer;
      const finish=(err,value)=>{if(settled)return;settled=true;clearTimeout(timer);if(activeRequest===handle)activeRequest=null;err?reject(err):resolve(value);};
      timer=setTimeout(()=>{finish(new Error('接口查询超时。'));handle?.abort();},120000);
      let raw;
      handle={abort:()=>{finish(new Error('已停止导出。'));raw?.abort();}};
      activeRequest=handle;
      try{raw=GM_xmlhttpRequest({redirect:'error',method:body===undefined?'GET':'POST',url:target.href,timeout:120000,responseType:'text',headers:{'Content-Type':'application/json',guid:session.guid,token:session.token},...(body===undefined?{}:{data:JSON.stringify(body)}),
        onload:r=>{
          try{
            check();
            if([401,403].includes(r.status))throw authError();
            if(r.status<200||r.status>=300)throw new Error(`查询接口 HTTP ${r.status}。`);
            if(r.finalUrl&&new URL(r.finalUrl).origin!==REPORT_ORIGIN)throw authError();
            let data;try{data=JSON.parse(r.responseText);}catch(_){throw new Error('接口未返回 JSON，请检查内网连接或登录状态。');}
            if(data.code!=null&&Number(data.code)!==1000)throw authError();
            finish(null,data);
          }catch(e){finish(e);}
        },onerror:()=>finish(new Error('接口连接失败，请检查内网或 VPN。')),ontimeout:()=>finish(new Error('接口查询超时。')),onabort:()=>finish(new Error('已停止导出。'))});}catch(e){finish(new Error('无法发起接口请求。'));}
      if(cancelled)handle?.abort();
    });
  }
  async function getSession(){
    check();
    let session;
    if(W.location.origin===REPORT_ORIGIN){
      const cookies=Object.fromEntries(D.cookie.split(';').map(s=>{let i=s.indexOf('=');return [s.slice(0,i).trim(),s.slice(i+1)];}));
      session={guid:W.localStorage.getItem('guid')||cookies.guid,token:W.localStorage.getItem('token')||cookies.token};
    }else{
      if(typeof GM_cookie==='undefined'||typeof GM_cookie.list!=='function')throw new Error('请更新脚本并允许读取报表站点登录状态。');
      session=await new Promise((resolve,reject)=>{
        const values={};let pending=2;
        for(const name of ['guid','token'])GM_cookie.list({url:REPORT_ORIGIN+'/dashboard/',name},(cookies,error)=>{
          if(error){reject(new Error('无法读取报表站点登录状态。'));return;}
          const found=(cookies||[]).filter(c=>c.name===name&&(!c.expirationDate||c.expirationDate>Date.now()/1000)).sort((a,b)=>b.path.length-a.path.length)[0];
          values[name]=found?.value;
          if(!--pending)resolve(values);
        });
      });
    }
    check();
    if(!session.guid||!session.token)throw authError();
    // Credentials remain only in this call's memory; never put them in URLs,
    // GM storage, logs, generated workbooks, or a public release.
    const user=await requestJSON(REPORT_ORIGIN+'/datasience/management/sysUserInfo/getUnionUserInfo',undefined,session);
    if(Number(user.code)!==1000||!user.data)throw authError();
    return session;
  }
  function prepareReport(job,cfg,list){
    const report=reportOf(job);
    if(cfg.id!==report.id||!Array.isArray(list))throw new Error('发布配置与所选报表不匹配。');
    const tables=list.filter(c=>c.comContext?.type==='TableSummaryCom'&&c.comRequest);
    if(tables.length!==1)throw new Error('报表表格结构已变化。');
    const entry=tables[0],context=entry.comContext,base=clone(entry.comRequest);
    if(base.dashboardId!==report.id||base.comId!==entry.comId)throw new Error('查询模板不匹配。');
    const render=context.ext?.tableRenderHeader,header=render?.[render.renderType];
    const headers=clone(header?.cellConfig||[]).map(r=>r.map(v=>v??''));
    const visibleFields=base.queryFields?.filter(f=>!f.isHide);
    if(headers.length!==report.headers||headers.some(r=>r.length!==report.cols)||visibleFields?.length!==report.cols)throw new Error('表头或列数已变化，已停止以防错列。');
    const merges=clone(header.mergeConfig||[]).filter(m=>!m.removed&&m.row>=0&&m.col>=0&&m.row+m.rowspan<=report.headers&&m.col+m.colspan<=report.cols);
    if(report.summary&&!base.calcType?.some(c=>c.type==='rowTotal'&&c.show&&c.location===report.summary&&c.isQueryAll&&c.displayName==='合计'))throw new Error('合计行配置已变化。');
    const queries=list.filter(c=>c.comContext?.type==='QueryCom').flatMap(c=>(c.comContext.queryCondition||[]).map(q=>({...q,comId:c.comId})));
    const getQuery=label=>{let matches=queries.filter(q=>labelOf(q)===label);if(matches.length!==1)throw new Error(`${label}筛选配置已变化。`);return matches[0];};
    for(const label of [...report.filters,...(report.dates||[report.range]),report.latn])getQuery(label);
    // Clear only the report's selectable filters; retain server-defined static constraints.
    const ids=new Set(queries.map(q=>q.comId));
    base.conditions=(base.conditions||[]).filter(c=>!ids.has(c.comId));
    const condition=(q,value)=>({...clone(q.condition),comId:q.comId,logicalOp:'AND',queryField:{code:q.condition.queryField.code,dataSetId:q.dataSetId},oprand:value});
    const latn=getQuery(report.latn);
    if(latn.condition?.queryField?.code!=='latn_name'||!['=','IN'].includes(latn.condition.compareOperator))throw new Error('地市筛选字段已变化。');
    base.conditions.push(condition(latn,latn.condition.compareOperator==='IN'?['亳州']:'亳州'));
    if(report.range){
      const range=getQuery(report.range);
      if(range.condition.compareOperator!=='BETWEEN'||range.condition.queryField.code!=='day_id')throw new Error('日期区间字段已变化。');
      base.conditions.unshift(condition(range,[job.start,job.end]));
    }else{
      for(let i=0;i<2;i++){
        const query=getQuery(report.dates[i]);
        const parameter=cfg.paramConfigList?.find(p=>p.id===query.paramsId&&p.paramType==='PARAM_TYPE_VARIABLE_TIME');
        const template=base.customSqlParams?.find(p=>p.key===parameter?.displayName);
        if(!parameter||!template)throw new Error('日期参数映射已变化。');
        const old=String(template.value),date=i===0?job.start:job.end;
        if(/^\d{8}$/.test(old))template.value=date.replace(/-/g,'');
        else if(/^\d{4}-\d{2}-\d{2}$/.test(old))template.value=date;
        else throw new Error('日期参数格式已变化。');
      }
    }
    base.queryFields.forEach(f=>delete f.additionalInfo);
    const fields=context.dataModel.tableModels.filter(f=>!f.isHide);
    const formats=fields.map(f=>{const n=f.numFormat?.[0];return n?.type==='number'?Math.max(0,Math.min(10,Number(n.bitInput)||0)):0;});
    base.pageInfo={limit:PAGE_SIZE,offset:0};
    return {base,headers,merges,formats};
  }
  async function exportReport(job){
    currentJob=job;cancelled=false;$('#reportType').value=job.reportKey;$('#start').value=job.start;$('#end').value=job.end;show();setBusy(true);lastFile=null;$('#again').style.display='none';
    let session=null;
    try{
      const report=reportOf(job);
      currentJob=updateJob(currentJob,{stage:'query'});status('正在检查登录状态…');
      session=await getSession();
      status('正在读取报表配置…');
      const cfg=await requestJSON(API+'api/results/'+report.id,undefined,session);
      const components=await requestJSON(API+'dashboard/component/find',{resultId:report.id},session);
      const {base,headers,merges,formats}=prepareReport(job,cfg.data,components.data?.list),headerCount=headers.length;
      const parts=[],signatures=new Set();let total=null,count=0,written=0,pages=0,summary=null;
      for(let offset=0;total===null||offset<total;offset+=PAGE_SIZE){
        check();status(`正在读取第 ${pages+1} 页（500条/页）…`);
        const req=clone(base);req.pageInfo={limit:PAGE_SIZE,offset};
        const data=await requestJSON(API+'query/data/?useDict=true',req,session);
        check();
        if(!Array.isArray(data.data))throw new Error('接口没有返回表格数据。');
        const found=Number(data.totalCount);
        if(!Number.isSafeInteger(found)||found<0)throw new Error('返回的总条数无效。');
        if(total===null)total=found;
        if(found!==total)throw new Error('分页过程中总条数改变。');
        if(total+headerCount+(report.summary?1:0)>1048576)throw new Error('记录数超过 Excel 单表上限。');
        let rows=data.data;
        if(pages===0)for(let c=0;c<report.cols;c++)if(!formats[c])for(const row of rows){const value=row[c];if(typeof value==='number'&&Number.isFinite(value)&&String(value).includes('.'))formats[c]=Math.max(formats[c],Math.min(10,String(value).split('.')[1].length));}
        if(report.summary){
          const index=report.summary==='top'?0:rows.length-1,candidate=rows[index];
          if(!Array.isArray(candidate)||candidate.length!==report.cols||candidate[0]!=='合计'||candidate.slice(1,report.dimensions).some(v=>v!==null))throw new Error('合计行结构异常。');
          if(summary&&JSON.stringify(summary)!==JSON.stringify(candidate))throw new Error('分页过程中合计发生变化。');
          summary=summary||candidate;rows=rows.filter((_,i)=>i!==index);
          if(pages===0&&report.summary==='top'){parts.push(rowsXML([summary],headerCount,0,formats));written++;}
        }
        const expected=Math.min(PAGE_SIZE,total-offset);
        if(rows.length!==expected)throw new Error('分页行数不完整，未生成文件。');
        if(rows.some(r=>!Array.isArray(r)||r.length!==report.cols||r[0]!=='亳州'))throw new Error('返回数据的地市或列数不匹配。');
        if(rows.length){const signature=hashString(JSON.stringify(rows));if(signatures.has(signature))throw new Error('接口重复返回同一页。');signatures.add(signature);}
        parts.push(rowsXML(rows,headerCount+written,0,formats));count+=rows.length;written+=rows.length;pages++;
        await new Promise(resolve=>setTimeout(resolve,0));
      }
      if(count!==total)throw new Error('总行数校验失败。');
      if(report.summary==='bottom'){parts.push(rowsXML([summary],headerCount+written,0,formats));written++;}
      status('正在生成 XLSX…');check();
      const blob=await buildXlsx(headers,parts,merges,written,formats,`亳州${report.name}`);check();
      lastFile={name:`亳州_${report.name}_${job.start}_${job.end}_${count}条.xlsx`,blob,queryKey:JSON.stringify([job.reportKey,job.start,job.end])};
      download(lastFile);
      currentJob=updateJob(currentJob,{stage:'done',count,pages,message:'导出成功'});status('导出成功');setBusy(false);
    }catch(e){fail(e);}finally{session=null;activeRequest=null;}
  }
  function hashString(s){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return `${s.length}:${h>>>0}`;}
  function validDate(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||s.slice(0,4)==='0000')return false;const d=new Date(`${s}T12:00:00`);return !Number.isNaN(d.getTime())&&isoDate(d)===s;}
  function start(){
    closeCalendar();const start=$('#start').value.trim(),end=$('#end').value.trim(),reportKey=$('#reportType').value;
    if(!REPORTS[reportKey])return status('请选择报表类型。',true);
    if(!validDate(start)||!validDate(end)||start>end)return status('请选择有效日期，开始日期不能晚于结束日期。',true);
    if(isLive(readJob())){$('#cancelTask').style.display='inline-flex';return status('已有任务正在导出，请稍候。',true);}
    const job=saveJob({id:`${Date.now()}-${Math.random().toString(36).slice(2,9)}`,reportKey,start,end,created:Date.now(),stage:'query',message:'准备读取报表…'});
    GM_setValue('ahoa.export.dates',{start,end});GM_setValue('ahoa.export.report',reportKey);exportReport(job);
  }
  $('#startExport').onclick=start;
  $('#again').onclick=()=>{if(lastFile?.queryKey!==queryKey()){resetResult();return;}if(lastFile)download(lastFile);};
  $('#cancelTask').onclick=()=>{const j=readJob();if(isLive(j)){cancelled=true;currentJob=updateJob(j,{stage:'cancelled',message:'已停止'});activeRequest?.abort();status('已停止');}$('#cancelTask').disabled=true;$('#cancelTask').style.display='none';};
  $('#close').onclick=hide;
  GM_registerMenuCommand('亳州经营报表：选择类型和日期导出',show);
  GM_addValueChangeListener(KEY,(_key,_old,j)=>{
    if(!currentJob||j?.id!==currentJob.id)return;
    if(j.stage==='cancelled'){cancelled=true;activeRequest?.abort();}
    if(!busy){currentJob=j;paintStatus(j.stage==='done'?'导出成功':j.stage==='error'?'导出失败':j.stage==='cancelled'?'已停止':j.message||'正在处理…',j.stage==='error');}
  });

  W.addEventListener('pagehide',()=>{if(busy&&currentJob&&readJob()?.id===currentJob.id){cancelled=true;activeRequest?.abort();updateJob(currentJob,{stage:'cancelled',message:'已停止'});}});

  // Minimal OOXML + ZIP writer: no CDN, no clipboard, no third-party libraries.
  const esc=s=>String(s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  function colName(i){let s='';for(i++;i;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s;}
  function rowsXML(rows,start,headerRows,formats=[]) {
    return rows.map((row,i)=>`<row r="${start+i+1}"${i<headerRows?' ht="42" customHeight="1"':''}>`+row.map((v,c)=>{
      const ref=`${colName(c)}${start+i+1}`;
      const style=i<headerRows?1:typeof v==='number'?(formats[c]?3+formats[c]:2):3;
      if(i<headerRows && (v===null||v==='')) return `<c r="${ref}" s="1"/>`;
      if(typeof v==='number' && Number.isFinite(v)) return `<c r="${ref}" s="${style}"><v>${v}</v></c>`;
      return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${esc(v??'--')}</t></is></c>`;
    }).join('')+'</row>').join('');
  }
  async function buildXlsx(headers,bodyParts,merges,count,formats,sheetName='亳州经营报表') {
    const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
    const xml=s=>'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+s;
    const n=headers[0].length, h=headers.length;
    const columns=Array.from({length:n},(_,i)=>`<col min="${i+1}" max="${i+1}" width="${i===6?42:[2,4].includes(i)?24:i<7?15:15}" customWidth="1"/>`).join('');
    const mergeXML=merges.length?`<mergeCells count="${merges.length}">`+merges.map(m=>`<mergeCell ref="${colName(m.col)}${m.row+1}:${colName(m.col+m.colspan-1)}${m.row+m.rowspan}"/>`).join('')+'</mergeCells>':'';
    const sheet=xml(`<worksheet xmlns="${ns}"><dimension ref="A1:${colName(n-1)}${count+h}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="${h}" topLeftCell="A${h+1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="20"/><cols>${columns}</cols><sheetData>${rowsXML(headers,0,h,formats)}${bodyParts.join('')}</sheetData>${mergeXML}<pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/></worksheet>`);
    const xf=(font,fill,border,fmt,alignment)=>`<xf numFmtId="${fmt}" fontId="${font}" fillId="${fill}" borderId="${border}" xfId="0" applyAlignment="1"${fmt?' applyNumberFormat="1"':''}><alignment vertical="center" ${alignment}/></xf>`;
    const styles=xml(`<styleSheet xmlns="${ns}"><numFmts count="10">${Array.from({length:10},(_,i)=>`<numFmt numFmtId="${164+i}" formatCode="0.${'0'.repeat(i+1)}"/>`).join('')}</numFmts><fonts count="2"><font><sz val="11"/><name val="Microsoft YaHei"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Microsoft YaHei"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF636B83"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border/><border><left style="thin"><color rgb="FFE2E6EE"/></left><right style="thin"><color rgb="FFE2E6EE"/></right><top style="thin"><color rgb="FFE2E6EE"/></top><bottom style="thin"><color rgb="FFE2E6EE"/></bottom></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="14">${xf(0,0,0,0,'')}${xf(1,2,1,0,'horizontal="center" wrapText="1"')}${xf(0,0,1,0,'horizontal="right"')}${xf(0,0,1,49,'horizontal="left"')}${Array.from({length:10},(_,i)=>xf(0,0,1,164+i,'horizontal="right"')).join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`);
    const files=[
      ['[Content_Types].xml',xml('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>')],
      ['_rels/.rels',xml('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')],
      ['xl/workbook.xml',xml(`<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(sheetName.replace(/[\\/*?:\[\]]/g,'_').slice(0,31))}" sheetId="1" r:id="rId1"/></sheets></workbook>`)],
      ['xl/_rels/workbook.xml.rels',xml('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>')],
      ['xl/styles.xml',styles], ['xl/worksheets/sheet1.xml',sheet]
    ];
    return zip(files);
  }
  async function zip(files) {
    const enc=new TextEncoder(), locals=[], central=[]; let offset=0;
    const crcTable=Uint32Array.from({length:256},(_,i)=>{let c=i;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
    const crc32=b=>{let c=0xffffffff;for(const x of b)c=crcTable[(c^x)&255]^(c>>>8);return(c^0xffffffff)>>>0;};
    const write=(bytes,fields)=>{const d=new DataView(bytes.buffer);for(const [pos,size,value] of fields)size===2?d.setUint16(pos,value,true):d.setUint32(pos,value,true);};
    for(const [name,content] of files) {
      const filename=enc.encode(name), raw=enc.encode(content), crc=crc32(raw);let payload=raw, method=0;
      // Native compression when supported; stored ZIP is a standards-compliant fallback.
      try {const compressed=new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());if(compressed.length<raw.length){payload=compressed;method=8;}}catch(_){}
      const local=new Uint8Array(30+filename.length);
      write(local,[[0,4,0x04034b50],[4,2,20],[6,2,0x800],[8,2,method],[14,4,crc],[18,4,payload.length],[22,4,raw.length],[26,2,filename.length]]);local.set(filename,30);
      const dir=new Uint8Array(46+filename.length);
      write(dir,[[0,4,0x02014b50],[4,2,20],[6,2,20],[8,2,0x800],[10,2,method],[16,4,crc],[20,4,payload.length],[24,4,raw.length],[28,2,filename.length],[42,4,offset]]);dir.set(filename,46);
      locals.push(local,payload);central.push(dir);offset+=local.length+payload.length;
    }
    const size=central.reduce((s,b)=>s+b.length,0), end=new Uint8Array(22);
    write(end,[[0,4,0x06054b50],[8,2,files.length],[10,2,files.length],[12,4,size],[16,4,offset]]);
    return new Blob([...locals,...central,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  }
})();
