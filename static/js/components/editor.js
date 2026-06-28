/* components/editor.js — rich text editor wiring */
'use strict';
window.Editor = (() => {

  function wire(toolbarEl, contentEl, imgBtnId, imgInputId) {
    if (!toolbarEl || !contentEl) return;

    // Toolbar buttons
    toolbarEl.querySelectorAll('[data-cmd]').forEach(btn => {
      btn.addEventListener('mousedown', e => {
        e.preventDefault();
        const cmd = btn.dataset.cmd;
        if (cmd === 'h2') {
          document.execCommand('formatBlock', false, 'h2');
        } else if (cmd === 'code') {
          const sel = window.getSelection();
          if (sel && !sel.isCollapsed) {
            const range = sel.getRangeAt(0);
            const code  = document.createElement('code');
            range.surroundContents(code);
          }
        } else {
          document.execCommand(cmd, false, null);
        }
        contentEl.focus();
        _updateActive(toolbarEl);
      });
    });

    // Color dots — apply foreColor to selected text
    toolbarEl.querySelectorAll('.rte-color-dots .rcd-dot').forEach(dot => {
      dot.addEventListener('mousedown', e => {
        e.preventDefault(); // keep selection alive
        const color = dot.dataset.color;
        if (color) {
          document.execCommand('foreColor', false, color);
        } else {
          // "Default" — remove foreColor by applying inherited color
          document.execCommand('removeFormat', false, null);
        }
        // Mark active
        dot.closest('.rte-color-dots').querySelectorAll('.rcd-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        contentEl.focus();
        _updateActive(toolbarEl);
      });
    });

    // Legacy <select> fallback (kept for safety, no-ops if no select present)
    const colorSel = toolbarEl.querySelector('.rte-color-sel');
    if (colorSel) {
      colorSel.addEventListener('change', () => {
        if (colorSel.value) document.execCommand('foreColor', false, colorSel.value);
        colorSel.value = '';
        contentEl.focus();
      });
    }

    // Image insert
    const imgBtn   = document.getElementById(imgBtnId);
    const imgInput = document.getElementById(imgInputId);
    if (imgBtn && imgInput) {
      imgBtn.addEventListener('click', () => imgInput.click());
      imgInput.addEventListener('change', () => {
        const file = imgInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
          contentEl.focus();
          document.execCommand('insertImage', false, e.target.result);
          imgInput.value = '';
        };
        reader.readAsDataURL(file);
      });
    }

    // Track active state
    contentEl.addEventListener('keyup',   () => _updateActive(toolbarEl));
    contentEl.addEventListener('mouseup', () => _updateActive(toolbarEl));
    contentEl.addEventListener('focus',   () => _updateActive(toolbarEl));
  }

  function _updateActive(toolbar) {
    toolbar.querySelectorAll('[data-cmd]').forEach(btn => {
      const cmd = btn.dataset.cmd;
      if (['bold','italic','underline','strikeThrough','insertUnorderedList','insertOrderedList'].includes(cmd)) {
        btn.classList.toggle('active', document.queryCommandState(cmd));
      }
    });
  }

  function getHTML(el) { return el ? el.innerHTML.trim() : ''; }
  function setHTML(el, html) { if (el) el.innerHTML = html || ''; }
  function clear(el)  { if (el) el.innerHTML = ''; }

  return { wire, getHTML, setHTML, clear };
})();
