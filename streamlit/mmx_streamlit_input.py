"""
MegaMind_X Streamlit adaptive text input with voice (RU/EN) + file attachments
- Pure Streamlit + minimal JS (Web Speech API) and CSS
- Drop-in to existing Streamlit projects (no React/Tailwind)

Usage:
    import streamlit as st
    from mmx_streamlit_input import render_mmx_text_input

    res = render_mmx_text_input(
        key_prefix="mmx",
        label="Сообщение",
        max_length=5000,
        languages=[("Русский", "ru-RU"), ("English", "en-US")],
        allowed_file_types=["txt", "pdf", "jpg", "jpeg", "png"],
        max_file_size=10*1024*1024,  # 10 MB
        max_width_cm=26.0,
    )
    if res.submitted:
        st.success("Отправлено!")
        st.json(res.data)

Parameters:
- key_prefix: str — префикс ключей session_state
- label: str — заголовок поля
- help_text: Optional[str]
- max_length: int — лимит символов, по достижении — блокируем набор (можно удалять/редактировать)
- languages: list[(label, locale)] — языки для Web Speech API, например [("Русский","ru-RU"),("English","en-US")]
- allowed_file_types: list[str] — допустимые расширения файлов (без точки)
- max_file_size: int — лимит размера одного файла в байтах (напр. 10 МБ)
- max_width_cm: float — максимум ширины текстового поля; ширина = clamp(16.5см, 100%, max_width_cm)

Returns SubmitResult(submitted, cleared, text, files, data)
- files: список принятых файлов (dict: name, type, size, data)
- data: {text, files: [name,...], lang}
"""

from __future__ import annotations
import base64
from dataclasses import dataclass
from typing import List, Optional, Tuple
import streamlit as st


@dataclass
class SubmitResult:
    submitted: bool
    cleared: bool
    text: str
    files: List[dict]
    data: dict


def _ensure_state(key_prefix: str):
    st.session_state.setdefault(f"{key_prefix}_text", "")
    st.session_state.setdefault(f"{key_prefix}_files", [])  # list of dict {name,type,size,data}
    st.session_state.setdefault(f"{key_prefix}_history", [])
    st.session_state.setdefault(f"{key_prefix}_lang", "ru-RU")


def _file_ext_ok(name: str, allowed: List[str]) -> bool:
    if not allowed:
        return True
    ext = (name.rsplit('.', 1)[-1] if '.' in name else '').lower()
    return ext in {e.lower() for e in allowed}


def _read_file_info(f) -> Tuple[str, str, int, bytes]:
    name = getattr(f, 'name', 'file')
    ftype = getattr(f, 'type', '') or ''
    try:
        size = getattr(f, 'size', None)
        if size is None:
            buf = f.getbuffer()
            size = buf.nbytes
        data = f.getvalue()
    except Exception:
        data = f.read()
        size = len(data)
    return name, ftype, size, data


def render_mmx_text_input(
    key_prefix: str = "mmx",
    label: str = "Сообщение",
    help_text: Optional[str] = "Поддерживает голосовой ввод и автодобавление файлов.",
    max_length: int = 5000,
    languages: List[Tuple[str, str]] = (("Русский", "ru-RU"), ("English", "en-US")),
    allowed_file_types: Optional[List[str]] = None,
    max_file_size: int = 10 * 1024 * 1024,
    max_width_cm: float = 26.0,
) -> SubmitResult:
    """Рендерит адаптивное текстовое поле с голосовым вводом и загрузкой файлов.
    См. параметры в верхнем docstring.
    """
    _ensure_state(key_prefix)

    # language selector for voice
    lang_labels = [lbl for (lbl, _) in languages]
    lang_values = [val for (_, val) in languages]
    current_lang = st.session_state.get(f"{key_prefix}_lang", lang_values[0] if lang_values else "ru-RU")
    col_lang, _ = st.columns([1, 4])
    with col_lang:
        sel_idx = max(0, lang_values.index(current_lang)) if current_lang in lang_values else 0
        chosen = st.selectbox("Язык распознавания", lang_labels, index=sel_idx, key=f"{key_prefix}_lang_sel")
        chosen_lang = lang_values[lang_labels.index(chosen)] if lang_labels else "ru-RU"
        st.session_state[f"{key_prefix}_lang"] = chosen_lang

    # Form wrapper
    with st.form(key=f"{key_prefix}_form", clear_on_submit=False):
        # CSS for width/height and JS hooks
        st.markdown(
            f"""
            <style>
              textarea[placeholder="MMX_TEXTAREA_{key_prefix}"] {{
                  width: clamp(16.5cm, 100%, {max_width_cm}cm) !important;
                  min-height: 1.5cm !important;
                  max-width: {max_width_cm}cm !important;
                  resize: none !important;
                  line-height: 1.35rem;
                  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
                  overflow: hidden; /* vertical auto-resize */
                  overflow-x: auto; /* horizontal scroll when needed */
              }}
              @media (max-width: 980px) {{
                  textarea[placeholder="MMX_TEXTAREA_{key_prefix}"] {{ width: 100% !important; }}
              }}
              .mmx-mic-btn {{ display:inline-flex; align-items:center; gap:6px; background:#0ea5b9; color:#fff; border:0; border-radius:6px; padding:6px 10px; cursor:pointer; font-size:0.9rem; }}
              .mmx-mic-btn.mmx-on {{ background:#0891a2; }}
              .mmx-mic-note {{ font-size:12px; color:#6b7280; margin-top:4px; }}
              .mmx-counter {{ font-size:12px; color:#6b7280; margin-top:4px; text-align:right; }}
              .mmx-counter.over {{ color:#ef4444; }}
              .mmx-file {{ display:flex; gap:10px; align-items:flex-start; padding:6px 0; border-bottom:1px solid #e5e7eb; }}
              .mmx-file img {{ border:1px solid #e5e7eb; border-radius:6px; max-width:72px; max-height:72px; object-fit:cover; }}
              .mmx-file-name {{ font-size:13px; font-weight:600; }}
              .mmx-file-size {{ font-size:12px; color:#6b7280; }}
              .mmx-warn {{ color:#b45309; font-size:12px; margin:6px 0; }}
            </style>
            """,
            unsafe_allow_html=True,
        )

        # Text area; enforce max_length also in JS to block beyond limit while allowing delete
        text = st.text_area(
            label,
            key=f"{key_prefix}_text",
            value=st.session_state.get(f"{key_prefix}_text", ""),
            height=58,  # ~1.5cm at 96dpi
            placeholder=f"MMX_TEXTAREA_{key_prefix}",
            help=help_text,
        )

        # Controls: Mic + JS enhancer (auto-resize + max_length enforcement)
        st.components.v1.html(
            f"""
            <div>
              <button id="mmx_mic_btn_{key_prefix}" type="button" class="mmx-mic-btn">🎙 Говорить</button>
              <div id="mmx_mic_note_{key_prefix}" class="mmx-mic-note"></div>
            </div>
            <script>
              (function() {{
                const PH = "MMX_TEXTAREA_{key_prefix}";
                const ta = document.querySelector(`textarea[placeholder="${{PH}}"]`);
                const btn = document.getElementById("mmx_mic_btn_{key_prefix}");
                const note = document.getElementById("mmx_mic_note_{key_prefix}");
                if (!ta) {{ if (note) note.textContent = "Поле не найдено"; return; }}

                // Auto-resize
                const autoresize = () => {{ ta.style.height = 'auto'; ta.style.height = (ta.scrollHeight) + 'px'; }};
                ta.addEventListener('input', autoresize);
                window.setTimeout(autoresize, 50);

                // Max length blocker
                const MAXL = {max_length};
                let prev = ta.value || '';
                ta.addEventListener('input', () => {{
                  if (ta.value.length > MAXL) {{
                    // keep selection end while preventing growth
                    const pos = ta.selectionStart - (ta.value.length - prev.length);
                    ta.value = prev;
                    if (pos >= 0) {{ ta.setSelectionRange(pos, pos); }}
                  }} else {{ prev = ta.value; }}
                }});

                // Web Speech API
                const chosenLang = {chosen_lang!r};
                let rec = null; let active = false;
                const supported = ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window);
                if (!supported) {{
                  if (note) note.textContent = "Голосовой ввод недоступен";
                  btn.disabled = true;
                }} else {{
                  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
                  rec = new SR();
                  rec.lang = chosenLang;
                  rec.interimResults = true; rec.continuous = true;
                  rec.onresult = (evt) => {{
                    let buf = '';
                    for (let i=evt.resultIndex; i<evt.results.length; i++) buf += evt.results[i][0].transcript;
                    if (buf) {{
                      const next = (ta.value ? ta.value + ' ' : '') + buf.trim();
                      ta.value = next.slice(0, MAXL); // respect max
                      ta.dispatchEvent(new Event('input', {{ bubbles: true }}));
                      autoresize();
                    }}
                  }};
                  rec.onend = () => {{ active = false; btn.classList.remove('mmx-on'); }};
                  btn.addEventListener('click', () => {{
                    if (!active) {{ try {{ rec.lang = chosenLang; rec.start(); active = true; btn.classList.add('mmx-on'); }} catch(e) {{}} }}
                    else {{ try {{ rec.stop(); }} catch(e) {{}} }}
                  }});
                }}
              }})();
            </script>
            """,
            height=80,
        )

        # Files: accept and validate to session_state pending list
        warnings = []
        uploaded = st.file_uploader(
            "Прикрепить файлы",
            type=allowed_file_types,
            accept_multiple_files=True,
            key=f"{key_prefix}_uploader",
        )
        if uploaded:
            for f in uploaded:
                name, ftype, size, data = _read_file_info(f)
                if allowed_file_types and not _file_ext_ok(name, allowed_file_types):
                    warnings.append(f"Файл {name}: недопустимый тип")
                    continue
                if size > max_file_size:
                    warnings.append(f"Файл {name}: превышен размер ({size} > {max_file_size} байт)")
                    continue
                # de-dup by name+size
                existing = st.session_state[f"{key_prefix}_files"]
                if any(x.get('name') == name and x.get('size') == size for x in existing):
                    continue
                existing.append({"name": name, "type": ftype, "size": size, "data": data})

        if warnings:
            for w in warnings:
                st.warning(w)

        # Preview with delete per item
        files_list = st.session_state.get(f"{key_prefix}_files", [])
        if files_list:
            st.markdown("**Файлы к отправке:**")
            for idx, item in enumerate(list(files_list)):
                c1, c2, c3 = st.columns([1, 5, 1])
                with c1:
                    # image preview if possible
                    is_img = (item.get('type','').startswith('image/')) or (item.get('name','').lower().split('.')[-1] in {"jpg","jpeg","png","gif"})
                    if is_img and item.get('data'):
                        try:
                            st.image(item['data'], caption="", width=72)
                        except Exception:
                            st.write("🖼️")
                    else:
                        st.write("📄")
                with c2:
                    st.markdown(f"<div class='mmx-file-name'>{item.get('name','')}</div>", unsafe_allow_html=True)
                    st.markdown(f"<div class='mmx-file-size'>{item.get('size',0)} байт</div>", unsafe_allow_html=True)
                with c3:
                    if st.button("Удалить", key=f"{key_prefix}_del_{idx}"):
                        try:
                            st.session_state[f"{key_prefix}_files"].pop(idx)
                            st.experimental_rerun()
                        except Exception:
                            pass

        # Char counter server-side (authoritative)
        cnt = len(text or "")
        over = cnt > max_length
        st.markdown(
            f"<div class='mmx-counter {'over' if over else ''}'>{cnt} / {max_length}</div>",
            unsafe_allow_html=True,
        )

        c1, c2 = st.columns([1, 1])
        submitted = c1.form_submit_button("Отправить")
        cleared = c2.form_submit_button("Очистить")

    # After form
    # Enforce max_length on server too
    text = (text or "")[:max_length]

    result = SubmitResult(submitted=False, cleared=False, text=text or "", files=st.session_state.get(f"{key_prefix}_files", []), data={})

    if submitted:
        st.session_state[f"{key_prefix}_text"] = text
        # keep only validated files as already stored
        files_ok = st.session_state.get(f"{key_prefix}_files", [])
        st.session_state[f"{key_prefix}_files"] = files_ok
        entry = {
            "text": text,
            "files": [f.get('name') for f in files_ok],
            "lang": st.session_state.get(f"{key_prefix}_lang", "ru-RU"),
        }
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
    st.write("Ниже интерактивный ввод с авто‑ростом, голосом (RU/EN), лимитами и файлами.")

    res = render_mmx_text_input(
        max_length=5000,
        languages=[("Русский","ru-RU"),("English","en-US")],
        allowed_file_types=["txt","pdf","jpg","jpeg","png"],
        max_file_size=10*1024*1024,
        max_width_cm=26.0,
    )

    if res.submitted:
        st.success("Отправлено! Данные ниже:")
        st.json(res.data)
    if res.cleared:
        st.info("Поле очищено.")

    st.subheader("Состояние сессии")
    st.json({
        'text': st.session_state.get('mmx_text', ''),
        'files': [f.get('name') for f in st.session_state.get('mmx_files', [])],
        'history': st.session_state.get('mmx_history', []),
        'lang': st.session_state.get('mmx_lang', 'ru-RU')
    })