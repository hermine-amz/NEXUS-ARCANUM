"use client";

import React, { useEffect, useRef } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Palette,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Rédigez votre contenu ici...",
  minHeight = "180px",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const lastHtmlRef = useRef<string>(value);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (value !== lastHtmlRef.current && el.innerHTML !== value) {
      el.innerHTML = value || "";
      lastHtmlRef.current = value;
    }
  }, [value]);

  useEffect(() => {
    const el = editorRef.current;
    if (el && !el.innerHTML && value) {
      el.innerHTML = value;
      lastHtmlRef.current = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emitChange = () => {
    const el = editorRef.current;
    if (!el) return;
    const html = el.innerHTML;
    lastHtmlRef.current = html;
    onChange(html);
  };

  const exec = (cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    emitChange();
  };

  const handleInsertLink = () => {
    const url = window.prompt("Adresse du lien (https://...) :", "https://");
    if (url && url.trim()) {
      exec("createLink", url.trim());
    }
  };

  const handleInsertImage = () => {
    const url = window.prompt("URL de l'image à insérer (https://...) :", "https://");
    if (url && url.trim()) {
      exec("insertImage", url.trim());
    }
  };

  const btnCls =
    "p-1.5 rounded-lg text-slate-600 hover:bg-white hover:text-navy-950 hover:shadow-2xs transition cursor-pointer";

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden focus-within:border-navy-900 focus-within:ring-2 focus-within:ring-navy-950/10 transition">
      {/* Barre d'outils complète */}
      <div className="flex flex-wrap items-center gap-1 px-2.5 py-2 bg-slate-50 border-b border-slate-200 text-xs">
        <button type="button" onClick={() => exec("undo")} className={btnCls} title="Annuler">
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => exec("redo")} className={btnCls} title="Rétablir">
          <Redo2 className="w-3.5 h-3.5" />
        </button>

        <span className="w-px h-4 bg-slate-200 mx-0.5" />

        {/* Police */}
        <select
          aria-label="Police"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) exec("fontName", e.target.value);
            e.target.value = "";
          }}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 cursor-pointer"
        >
          <option value="" disabled>
            Police
          </option>
          <option value="Plus Jakarta Sans, sans-serif">Sans-serif</option>
          <option value="Playfair Display, Georgia, serif">Serif (Éditorial)</option>
          <option value="Georgia, serif">Georgia</option>
          <option value="monospace">Monospace</option>
        </select>

        {/* Taille */}
        <select
          aria-label="Taille"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) exec("fontSize", e.target.value);
            e.target.value = "";
          }}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 cursor-pointer"
        >
          <option value="" disabled>
            Taille
          </option>
          <option value="2">Petit</option>
          <option value="3">Normal</option>
          <option value="4">Moyen</option>
          <option value="5">Grand</option>
          <option value="6">Titre</option>
        </select>

        <span className="w-px h-4 bg-slate-200 mx-0.5" />

        <button type="button" onClick={() => exec("bold")} className={btnCls} title="Gras">
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => exec("italic")} className={btnCls} title="Italique">
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => exec("underline")} className={btnCls} title="Souligné">
          <Underline className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => exec("strikeThrough")} className={btnCls} title="Barré">
          <Strikethrough className="w-3.5 h-3.5" />
        </button>

        <span className="w-px h-4 bg-slate-200 mx-0.5" />

        {/* Couleur texte */}
        <label
          title="Couleur du texte"
          className={`${btnCls} relative inline-flex items-center`}
        >
          <Palette className="w-3.5 h-3.5" />
          <input
            type="color"
            aria-label="Couleur du texte"
            onChange={(e) => exec("foreColor", e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </label>

        {/* Surlignage */}
        <label
          title="Couleur de surlignage"
          className={`${btnCls} relative inline-flex items-center`}
        >
          <Highlighter className="w-3.5 h-3.5" />
          <input
            type="color"
            defaultValue="#fef08a"
            aria-label="Surligner"
            onChange={(e) => exec("hiliteColor", e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </label>

        <span className="w-px h-4 bg-slate-200 mx-0.5" />

        <button type="button" onClick={() => exec("justifyLeft")} className={btnCls} title="Aligner à gauche">
          <AlignLeft className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => exec("justifyCenter")} className={btnCls} title="Centrer">
          <AlignCenter className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => exec("justifyRight")} className={btnCls} title="Aligner à droite">
          <AlignRight className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => exec("justifyFull")} className={btnCls} title="Justifier">
          <AlignJustify className="w-3.5 h-3.5" />
        </button>

        <span className="w-px h-4 bg-slate-200 mx-0.5" />

        <button type="button" onClick={() => exec("insertUnorderedList")} className={btnCls} title="Liste à puces">
          <List className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => exec("insertOrderedList")} className={btnCls} title="Liste numérotée">
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => exec("formatBlock", "BLOCKQUOTE")} className={btnCls} title="Citation">
          <Quote className="w-3.5 h-3.5" />
        </button>

        <span className="w-px h-4 bg-slate-200 mx-0.5" />

        <button type="button" onClick={handleInsertLink} className={btnCls} title="Insérer un lien">
          <Link2 className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={handleInsertImage} className={btnCls} title="Insérer une image">
          <ImageIcon className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => exec("removeFormat")} className={btnCls} title="Effacer le style">
          <Eraser className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Zone d'édition */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={emitChange}
        onBlur={emitChange}
        data-placeholder={placeholder}
        style={{ minHeight }}
        className="p-3.5 text-sm text-slate-800 leading-relaxed focus:outline-none prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-4 [&_blockquote]:border-gold-500 [&_blockquote]:pl-3 [&_blockquote]:italic [&_a]:text-blue-700 [&_a]:underline [&_img]:max-w-full [&_img]:rounded-xl [&_img]:my-2 empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400"
      />
    </div>
  );
}
