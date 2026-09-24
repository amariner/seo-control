"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";

export function ReportEditor() {
  const [saved, setSaved] = useState("Borrador sin guardar");
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    content: `<h2>Datos del periodo</h2><p>Añade las métricas y sus fuentes.</p><h2>Notas de revisión</h2><p>Documenta aquí la revisión del informe.</p>`,
    onUpdate: () => setSaved("Cambios sin publicar"),
    // El área editable es un `role="textbox"`: sin nombre accesible, quien usa
    // lector de pantalla no sabe qué está editando (Axe: aria-input-field-name).
    // `contenteditable` por sí solo no expone un rol que admita `aria-multiline`,
    // así que el rol se declara explícitamente junto al nombre accesible.
    editorProps: { attributes: { role: "textbox", "aria-label": "Cuerpo del informe ejecutivo", "aria-multiline": "true" } },
  });

  if (!editor) return <div className="editor-wrap"><div className="tiptap">Cargando editor…</div></div>;
  return <><div className="editor-wrap"><div className="editor-tools"><button className={`editor-button ${editor.isActive("bold") ? "editor-button-active" : ""}`} aria-label="Negrita" aria-pressed={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>B</button><button className={`editor-button ${editor.isActive("italic") ? "editor-button-active" : ""}`} aria-label="Cursiva" aria-pressed={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></button><button className={`editor-button ${editor.isActive("heading", { level: 2 }) ? "editor-button-active" : ""}`} aria-label="Título de sección" aria-pressed={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button><button className={`editor-button ${editor.isActive("bulletList") ? "editor-button-active" : ""}`} onClick={() => editor.chain().focus().toggleBulletList().run()}>Lista</button><span className="ds-meta" style={{ marginLeft: "auto", alignSelf: "center" }}>{saved}</span></div><EditorContent editor={editor} /></div></>;
}
