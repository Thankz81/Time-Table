/* views/deadlines.js */
'use strict';
window.DeadlinesView = (() => {
  let _showForm=false;

  async function render() {
    const el=document.getElementById('view-deadlines');
    el.innerHTML=`
      <div class="dl-toolbar">
        <div class="dl-toolbar-title">All Deadlines</div>
        <button class="dl-add-btn" id="dl-add-btn">+ Add Deadline</button>
      </div>
      <div id="dl-add-area"></div>
      <div class="dl-body" id="dl-list-body"></div>`;
    document.getElementById('dl-add-btn').onclick=_toggleForm;
    await _loadAndRender();
  }

  function _toggleForm(){
    _showForm=!_showForm;
    const area=document.getElementById('dl-add-area');
    if(!_showForm){area.innerHTML='';return;}
    const today=Store.todayStr();
    area.innerHTML=`
      <div class="dl-add-form">
        <div class="dl-af-row">
          <input class="dl-af-input" id="daf-title" placeholder="Deadline title…" autocomplete="off">
          <input type="date" class="dl-af-sel" id="daf-date" value="${today}">
          <input type="time" class="dl-af-sel" id="daf-time">
        </div>
        <div class="dl-af-row">
          <label style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--tx2);cursor:pointer">
            <input type="checkbox" id="daf-urgent" style="accent-color:var(--dl-c)"> Mark as Urgent
          </label>
        </div>
        <div class="dl-af-btns">
          <button class="dl-af-cancel" id="daf-cancel">Cancel</button>
          <button class="dl-af-save"   id="daf-save">Add Deadline</button>
        </div>
      </div>`;
    document.getElementById('daf-title').focus();
    document.getElementById('daf-cancel').onclick=()=>{_showForm=false;area.innerHTML='';};
    document.getElementById('daf-save').onclick=async()=>{
      const title=document.getElementById('daf-title').value.trim();
      const date=document.getElementById('daf-date').value;
      const time=document.getElementById('daf-time').value;
      const urgent=document.getElementById('daf-urgent').checked;
      if(!title||!date){Toast.show('Title and date required','error');return;}
      try{
        await API.createDeadline({title,date,time:time||null,urgent});
        _showForm=false; area.innerHTML='';
        await _loadAndRender();
        Toast.show('Deadline added ✓','success');
      }catch(e){Toast.show(e.message,'error');}
    };
  }

  async function _loadAndRender(){
    try{const {deadlines}=await API.getDeadlines();_renderList(deadlines);}
    catch(e){Toast.show(e.message,'error');}
  }

  function _renderList(deadlines){
    const body=document.getElementById('dl-list-body'); if(!body) return;
    body.innerHTML='';
    if(!deadlines.length){
      body.innerHTML='<div class="dl-empty"><div class="dl-empty-icon">⚑</div><div>No deadlines yet</div></div>';
      return;
    }
    const today=Store.todayStr();
    const now=new Date();
    const groups={today:[],week:[],later:[]};
    deadlines.forEach(d=>{
      const dDate=new Date(d.date+'T00:00:00');
      const diffDays=Math.ceil((dDate-new Date(today+'T00:00:00'))/(86400000));
      if(diffDays<=0) groups.today.push(d);
      else if(diffDays<=7) groups.week.push(d);
      else groups.later.push(d);
    });
    const groupDefs=[
      {key:'today',label:'Today / Overdue',cls:'today-group'},
      {key:'week', label:'This Week',       cls:'week-group'},
      {key:'later',label:'Later',           cls:'later-group'},
    ];
    groupDefs.forEach(({key,label,cls})=>{
      if(!groups[key].length) return;
      const sec=document.createElement('div'); sec.className='dl-group';
      sec.innerHTML=`<div class="dl-group-header ${cls}">${label} · ${groups[key].length}</div>`;
      groups[key].forEach(d=>{
        const el=_dlItem(d,now,today);
        sec.appendChild(el);
      });
      body.appendChild(sec);
    });
  }

  function _dlItem(d,now,today){
    const el=document.createElement('div');
    el.className='dl-item'+(d.urgent?' urgent-item':'');
    const dParts=d.date.split('-');
    const countdownHTML=_countdownHTML(d,now,today);
    el.innerHTML=`
      <div class="dl-date-col">
        <div class="dl-date-day">${dParts[2]}</div>
        <div class="dl-date-mon">${_monthShort(parseInt(dParts[1]))}</div>
      </div>
      <div class="dl-vert-line"></div>
      <div class="dl-body-col">
        <div class="dl-title">${_e(d.title)}</div>
        <div class="dl-meta">
          ${d.time?`<span class="dl-time-tag">🕐 ${d.time}</span>`:''}
          ${countdownHTML}
          ${d.urgent?'<span class="badge b-urgent">URGENT</span>':''}
        </div>
      </div>
      <div class="dl-actions">
        <button class="dl-act del" title="Delete" data-a="del">✕</button>
      </div>`;
    el.querySelector('[data-a="del"]').onclick=async e=>{
      e.stopPropagation();
      el.style.transition='all .22s'; el.style.opacity='0';
      setTimeout(async()=>{
        try{await API.deleteDeadline(d.id);await _loadAndRender();Toast.show('Deadline deleted');}
        catch(err){Toast.show(err.message,'error');}
      },200);
    };
    el.onclick = e => { if(e.target.closest('.dl-actions')) return; Preview.openDeadline(d, _loadAndRender); };
    el.style.cursor='pointer';
    return el;
  }

  function _countdownHTML(d,now,today){
    const dDate=new Date(d.date+'T00:00:00');
    const diffDays=Math.ceil((dDate-new Date(today+'T00:00:00'))/(86400000));
    let label,cls;
    if(diffDays<0){label=`${-diffDays} day${-diffDays===1?'':'s'} overdue`;cls='overdue';}
    else if(diffDays===0){
      if(d.time){
        const[hh,mm]=d.time.split(':').map(Number);
        const dlMs=new Date(now.getFullYear(),now.getMonth(),now.getDate(),hh,mm).getTime();
        const diff=dlMs-now.getTime();
        if(diff<0){label='Overdue';cls='overdue';}
        else if(diff<3600000){label=`${Math.ceil(diff/60000)}min left`;cls='today';}
        else{label=`${Math.ceil(diff/3600000)}h left`;cls='today';}
      }else{label='Due today';cls='today';}
    }else if(diffDays<=3){label=`${diffDays} day${diffDays===1?'':'s'} left`;cls='soon';}
    else{label=`${diffDays} days left`;cls='later';}
    return `<span class="dl-countdown-tag ${cls}">${label}</span>`;
  }

  const MONTHS_S=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function _monthShort(m){return MONTHS_S[m-1]||''}
  function _e(s){if(!s)return'';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}

  return { render };
})();
