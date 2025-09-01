"""
MegaMind_X Streamlit adaptive text input with voice + file attachments
- No React/Tailwind. Only Streamlit + CSS + a tiny JS (Web Speech API) for mic and auto-resize
- Ready to drop into an existing Streamlit project without breaking structure

Usage:
    import streamlit as st
    from mmx_streamlit_input import render_mmx_text_input

    result = render_mmx_text_input(key_prefix="mmx", label="Сообщение")
    if result.submitted:
        st.success("Отправлено!")
        st.write(result.data)

Notes:
- Initial size: 16.5cm x 1.5cm, auto-resize on input
- Voice input uses Web Speech API (Chrome/Edge). If unsupported, shows a note
- Stores data into st.session_state under keys based on key_prefix
"""

from __future__ import annotations
import streamlit as st
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class SubmitResult:
    submitted: bool
    cleared: bool
    text: str
    files: List
    data: dict


def _ensure_state(key_prefix: str):
    st.session_state.setdefault(f"{key_prefix}_text", "")
    st.session_state.setdefault(f"{key_prefix}_files", [])
    st.session_state.setdefault(f"{key_prefix}_history", [])


def render_mmx_text_input(
    key_prefix: str = "mmx",
    label: str = "Сообщение",
    help_text: Optional[str] = "Поддерживает голосовой ввод и автодобавление файлов.",
) -> SubmitResult:
    _ensure_state(key_prefix)

    # Wrap in a form to submit both text + files atomically
    with st.form(key=f"{key_prefix}_form", clear_on_submit=False):
        # CSS: initial 16.5cm x 1.5cm, adaptive height, mobile-safe override
        st.markdown(
            f"""
            <style>
              /* Base box for our textarea */
              textarea[placeholder="MMX_TEXTAREA_{key_prefix}"] {{
                  width: 16.5cm !important;
                  min-height: 1.5cm !important;
                  resize: none !important;
                  line-height: 1.35rem;
                  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
                  overflow: hidden; /* for auto-resize */
              }}
              @media (max-width: 980px) {{
                  textarea[placeholder="MMX_TEXTAREA_{key_prefix}"] {{
                      width: 100% !important; /* responsive on small screens */
                  }}
              }}
              /* Mic button styles */
              .mmx-mic-btn {{
                  display: inline-flex; align-items: center; gap: 6px;
                  background: #0ea5b9; color: white; border: 0; border-radius: 6px;
                  padding: 6px 10px; cursor: pointer; font-size: 0.9rem;
              }}
              .mmx-mic-btn.mmx-on {{ background: #0891a2; }}
              .mmx-mic-note {{ font-size: 12px; color: #6b7280; margin-top: 4px; }}
              .mmx-counter {{ font-size: 12px; color: #6b7280; margin-top: 4px; text-align: right; }}
            </style>
            """,
            unsafe_allow_html=True,
        )

        # Text area (uses placeholder marker to target CSS/JS reliably)
        text = st.text_area(
            label,
            key=f"{key_prefix}_text",
            value=st.session_state.get(f"{key_prefix}_text", ""),
            height=58,  # ~1.5cm at 96dpi
            placeholder=f"MMX_TEXTAREA_{key_prefix}",
            help=help_text,
        )

        # Mic + auto-resize enhancer
        st.components.v1.html(
            f"""
            <div>
              <button id="mmx_mic_btn_{key_prefix}" type="button" class="mmx-mic-btn">🎙 Говорить</button>
              <div id="mmx_mic_note_{key_prefix}" class="mmx-mic-note"></div>
            </div>
            <script>
              (function() {{
                const ph = "MMX_TEXTAREA_{key_prefix}";
                const ta = document.querySelector(`textarea[placeholder="${{ph}}"]`);
                const btn = document.getElementById("mmx_mic_btn_{key_prefix}");
                const note = document.getElementById("mmx_mic_note_{key_prefix}");
                if (!ta) {{
                  note.textContent = "Поле не найдено";
                  return;
                }}
                // Auto-resize
                const autoresize = () => {{
                  ta.style.height = 'auto';
                  ta.style.height = (ta.scrollHeight) + 'px';
                }};
                ta.addEventListener('input', autoresize);
                window.setTimeout(autoresize, 50);

                // Mic via Web Speech API
                let rec = null; let active = false;
                const supported = ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window);
                if (!supported) {{
                  note.textContent = "Голосовой ввод не поддерживается в этом браузере";
                  btn.disabled = true;
                }} else {{
                  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
                  rec = new SR();
                  rec.lang = 'ru-RU';
                  rec.interimResults = true; rec.continuous = true;
                  rec.onresult = (evt) => {{
                    let buf = '';
                    for (let i=evt.resultIndex; i<evt.results.length; i++) {{
                      buf += evt.results[i][0].transcript;
                    }}
                    if (buf) {{
                      // append transcript into textarea
                      const prev = ta.value; ta.value = prev + (prev ? ' ' : '') + buf.trim();
                      ta.dispatchEvent(new Event('input', {{ bubbles: true }}));
                      autoresize();
                    }}
                  }};
                  rec.onend = () => {{ active = false; btn.classList.remove('mmx-on'); }};
                  btn.addEventListener('click', () => {{
                    if (!active) {{
                      try {{ rec.start(); active = true; btn.classList.add('mmx-on'); }} catch(e) {{}}
                    }} else {{
                      try {{ rec.stop(); }} catch(e) {{}}
                    }}
                  }});
                }}
              }})();
            </script>
            """,
            height=70,
        )

        # Files
        files = st.file_uploader("Прикрепить файлы", type=None, accept_multiple_files=True, key=f"{key_prefix}_files")

        # Char counter
        st.markdown(
            f"<div class='mmx-counter'>{len(text or '')} символов</div>",
            unsafe_allow_html=True,
        )

        c1, c2 = st.columns([1, 1])
        submitted = c1.form_submit_button("Отправить")
        cleared = c2.form_submit_button("Очистить")

    # After form (server side state handling)
    result = SubmitResult(
        submitted=False, cleared=False, text=text or "", files=files or [], data={}
    )

    if submitted:
        st.session_state[f"{key_prefix}_text"] = text or ""
        st.session_state[f"{key_prefix}_files"] = files or []
        entry = {"text": st.session_state[f"{key_prefix}_text"], "files": [f.name for f in (files or [])]}
        st.session_state[f"{key_prefix}_history"].insert(0, entry)
        result.submitted = True
        result.data = entry

    if cleared:
        st.session_state[f"{key_prefix}_text"] = ""
        st.session_state[f"{key_prefix}_files"] = []
        result.cleared = True
        result.text = ""
        result.files = []

    return result


if __name__ == "__main__":
    st.set_page_config(page_title="MMX Input Demo", page_icon="📝", layout="centered")
    st.title("MegaMind_X — Text Input Demo")
    st.write("Ниже интерактивный ввод с авто‑ростом, голосом и файлами.")

    res = render_mmx_text_input()

    if res.submitted:
        st.success("Отправлено! Данные ниже:")
        st.json(res.data)
    if res.cleared:
        st.info("Поле очищено.")

    st.subheader("Состояние сессии")
    st.json({
        'text': st.session_state.get('mmx_text', ''),
        'files': [getattr(f, 'name', None) for f in st.session_state.get('mmx_files', [])],
        'history': st.session_state.get('mmx_history', []),
    })