/* auth.js */
'use strict';
window.Auth = (() => {
  const AVATARS=['🧑','👩','🧔','👨','🧑‍💻','👩‍💻','🦸','🦹','🧙','🧝','🎩','🐱','🦊','🐸','🐧','🦄'];
  let _selectedAvatar=AVATARS[0], _onSuccess=null;

  function init(cb) {
    _onSuccess=cb;
    _buildAvatars(); _wireTabs(); _wireToggles(); _wirePwStrength(); _wireForms();
    _wireResetToken();
  }

  async function checkSession() {
    try { const {user}=await API.me(); return user; } catch(_){ return null; }
  }

  function _buildAvatars(){
    const grid=document.getElementById('avatar-grid');
    AVATARS.forEach(a=>{
      const btn=document.createElement('div'); btn.className='avatar-opt'+(a===_selectedAvatar?' selected':'');
      btn.textContent=a;
      btn.addEventListener('click',()=>{ document.querySelectorAll('.avatar-opt').forEach(x=>x.classList.remove('selected')); btn.classList.add('selected'); _selectedAvatar=a; });
      grid.appendChild(btn);
    });
  }

  function _wireTabs(){
    const tabs=document.querySelectorAll('.auth-tab');
    const lf=document.getElementById('login-form'), rf=document.getElementById('register-form');
    const te=document.querySelector('.auth-tabs');
    tabs.forEach(tab=>tab.addEventListener('click',()=>{
      if(tab.classList.contains('active')) return;
      const t=tab.dataset.tab;
      tabs.forEach(x=>x.classList.remove('active')); tab.classList.add('active'); te.dataset.tab=t;
      // make sure forgot/reset panels are hidden when switching main tabs
      _showPanel(t==='register' ? rf : lf, t==='register' ? lf : rf);
      document.getElementById('forgot-form').classList.add('hidden');
      document.getElementById('reset-form').classList.add('hidden');
      document.querySelector('.auth-tabs').style.display='';
      document.getElementById('login-error').classList.add('hidden');
      document.getElementById('reg-error').classList.add('hidden');
    }));
  }

  function _showPanel(show, hide){
    const isLeft=hide===document.getElementById('login-form');
    _swap(hide,show,isLeft?'left':'right');
  }

  function _swap(out,inn,dir){
    out.classList.add(dir==='left'?'slide-out-left':'slide-out-right');
    setTimeout(()=>{ out.classList.add('hidden'); out.classList.remove(dir==='left'?'slide-out-left':'slide-out-right');
      inn.classList.remove('hidden'); inn.classList.add(dir==='left'?'slide-in-right':'slide-in-left');
      setTimeout(()=>inn.classList.remove(dir==='left'?'slide-in-right':'slide-in-left'),320);
    },220);
  }

  function _wireToggles(){
    document.querySelectorAll('.field-toggle').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const inp=document.getElementById(btn.dataset.target);
        inp.type=inp.type==='password'?'text':'password';
        btn.textContent=inp.type==='password'?'👁':'🙈';
      });
    });
  }

  function _wireResetToken(){
    // If URL hash contains a reset token, show the reset panel immediately
    const hash=window.location.hash;
    const m=hash.match(/[?&]token=([^&]+)/);
    if(m){
      const token=decodeURIComponent(m[1]);
      _showResetPanel(token);
    }
  }

  function _showResetPanel(token){
    const lf=document.getElementById('login-form');
    const rs=document.getElementById('reset-form');
    document.querySelector('.auth-tabs').style.display='none';
    lf.classList.add('hidden');
    rs.classList.remove('hidden');
    rs.dataset.token=token;
    // wire pw strength for reset panel
    const inp=document.getElementById('reset-password'), bar=document.getElementById('reset-pw-bar');
    inp.addEventListener('input',()=>{
      const v=inp.value; let s=0;
      if(v.length>=6)s++;if(v.length>=10)s++;if(/[A-Z]/.test(v))s++;if(/[0-9]/.test(v))s++;if(/[^A-Za-z0-9]/.test(v))s++;
      bar.style.width=(s/5*100)+'%';
      bar.style.background=['#f87171','#f87171','#fbbf24','#34d399','#34d399','#34d399'][s];
    });
  }

  function _wirePwStrength(){
    const inp=document.getElementById('reg-password'), bar=document.querySelector('.pw-bar');
    inp.addEventListener('input',()=>{
      const v=inp.value; let s=0;
      if(v.length>=6)s++;if(v.length>=10)s++;if(/[A-Z]/.test(v))s++;if(/[0-9]/.test(v))s++;if(/[^A-Za-z0-9]/.test(v))s++;
      bar.style.width=(s/5*100)+'%';
      bar.style.background=['#f87171','#f87171','#fbbf24','#34d399','#34d399','#34d399'][s];
    });
  }

  function _setLoading(btn,on){ btn.querySelector('.btn-text').classList.toggle('hidden',on); btn.querySelector('.btn-loader').classList.toggle('hidden',!on); btn.disabled=on; }

  function _wireForms(){
    document.getElementById('login-form').addEventListener('submit',async e=>{
      e.preventDefault();
      const identity=document.getElementById('login-identity').value.trim();
      const password=document.getElementById('login-password').value.trim();
      const errEl=document.getElementById('login-error'), btn=document.getElementById('login-btn');
      errEl.classList.add('hidden'); _setLoading(btn,true);
      try{ const {user}=await API.login({identity,password}); _hide(()=>_onSuccess&&_onSuccess(user)); }
      catch(err){ errEl.textContent=err.message; errEl.classList.remove('hidden'); }
      finally{ _setLoading(btn,false); }
    });

    document.getElementById('register-form').addEventListener('submit',async e=>{
      e.preventDefault();
      const username=document.getElementById('reg-username').value.trim();
      const email=document.getElementById('reg-email').value.trim();
      const password=document.getElementById('reg-password').value.trim();
      const errEl=document.getElementById('reg-error'), btn=document.getElementById('reg-btn');
      errEl.classList.add('hidden'); _setLoading(btn,true);
      try{ const {user}=await API.register({username,email,password,avatar:_selectedAvatar}); _hide(()=>_onSuccess&&_onSuccess(user)); }
      catch(err){ errEl.textContent=err.message; errEl.classList.remove('hidden'); }
      finally{ _setLoading(btn,false); }
    });

    // Forgot password
    document.getElementById('btn-forgot').addEventListener('click',()=>{
      const lf=document.getElementById('login-form'), ff=document.getElementById('forgot-form');
      document.querySelector('.auth-tabs').style.display='none';
      _swap(lf,ff,'left');
    });

    document.getElementById('btn-back-login').addEventListener('click',()=>{
      const lf=document.getElementById('login-form'), ff=document.getElementById('forgot-form');
      document.querySelector('.auth-tabs').style.display='';
      _swap(ff,lf,'right');
      document.getElementById('forgot-email').value='';
      document.getElementById('forgot-error').classList.add('hidden');
      document.getElementById('forgot-success').classList.add('hidden');
    });

    document.getElementById('forgot-btn').addEventListener('click',async()=>{
      const email=document.getElementById('forgot-email').value.trim();
      const errEl=document.getElementById('forgot-error'), sucEl=document.getElementById('forgot-success');
      const btn=document.getElementById('forgot-btn');
      errEl.classList.add('hidden'); sucEl.classList.add('hidden');
      if(!email){ errEl.textContent='Please enter your email.'; errEl.classList.remove('hidden'); return; }
      _setLoading(btn,true);
      try{
        await API.forgotPassword({email});
        sucEl.textContent='If that email exists, a reset link has been sent. Check your inbox.';
        sucEl.classList.remove('hidden');
      } catch(err){ errEl.textContent=err.message; errEl.classList.remove('hidden'); }
      finally{ _setLoading(btn,false); }
    });

    document.getElementById('reset-btn').addEventListener('click',async()=>{
      const rs=document.getElementById('reset-form');
      const token=rs.dataset.token||'';
      const password=document.getElementById('reset-password').value.trim();
      const errEl=document.getElementById('reset-error'), sucEl=document.getElementById('reset-success');
      const btn=document.getElementById('reset-btn');
      errEl.classList.add('hidden'); sucEl.classList.add('hidden');
      _setLoading(btn,true);
      try{
        await API.resetPassword({token,password});
        sucEl.textContent='Password updated! Redirecting to sign in…';
        sucEl.classList.remove('hidden');
        btn.disabled=true;
        setTimeout(()=>{
          window.location.hash='';
          rs.classList.add('hidden');
          document.querySelector('.auth-tabs').style.display='';
          document.getElementById('login-form').classList.remove('hidden');
        },2000);
      } catch(err){ errEl.textContent=err.message; errEl.classList.remove('hidden'); }
      finally{ _setLoading(btn,false); }
    });
  }

  function _hide(cb){
    const card=document.getElementById('auth-card');
    card.style.transition='all .4s ease'; card.style.transform='scale(.95)'; card.style.opacity='0';
    setTimeout(()=>{ document.getElementById('auth-screen').classList.add('hidden'); cb&&cb(); },350);
  }

  return { init, checkSession };
})();
