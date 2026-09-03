"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";

export function ReportEditor() {
  const [saved, setSaved] = useState("Guardado localmente");
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    content: `<h2>Resumen ejecutivo</h2><p>El crecimiento orgánico del piloto se mantiene, con Noken impulsando la demanda non-branded en Reino Unido. La incidencia de canonical en colecciones francesas de Porcelanosa es la prioridad del periodo.</p><h2>Decisión propuesta</h2><p>Corregir la fuente canónica del template y validar una muestra antes de la publicación completa.</p>`,
    onUpdate: () => setSaved("Cambios sin publicar"),
  });

  if (!editor) return <div className="editor-wrap"><div className="tiptap">Cargando editor…</div></div>;
  return <><div className="editor-wrap"><div className="editor-tools"><button className={`editor-button ${editor.isActive("bold") ? "editor-button-active" : ""}`} onClick={() => editor.chain().focus().toggleBold().run()}>B</button><button className={`editor-button ${editor.isActive("italic") ? "editor-button-active" : ""}`} onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></button><button className={`editor-button ${editor.isActive("heading", { level: 2 }) ? "editor-button-active" : ""}`} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button><button className={`editor-button ${editor.isActive("bulletList") ? "editor-button-active" : ""}`} onClick={() => editor.chain().focus().toggleBulletList().run()}>Lista</button><span className="ds-meta" style={{ marginLeft: "auto", alignSelf: "center" }}>{saved}</span></div><EditorContent editor={editor} /></div><div className="block-palette"><button className="button">+ KPI</button><button className="button">+ Gráfico</button><button className="button">+ Tabla</button><button className="button">+ Evidencia</button><button className="button">+ Conclusión</button><button className="button">+ Acción</button><button className="button">+ Metodología</button></div></>;
}
