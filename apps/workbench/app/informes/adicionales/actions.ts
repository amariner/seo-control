"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdditionalRequest } from "@/lib/additional-reports";

const text = (value: FormDataEntryValue | null) => (typeof value === "string" ? value.trim() : "");

/**
 * Crea la carpeta y el README de un informe adicional solicitado (D-076).
 * Todo queda en `informes-adicionales/`, fuera de git; Claude lo elabora
 * cuando se le pide en el chat («haz el informe adicional <ruta>»).
 */
export async function requestAdditionalReport(formData: FormData) {
  const title = text(formData.get("title"));
  const question = text(formData.get("question"));
  if (title.length < 4 || question.length < 10)
    redirect(`/informes/adicionales?${new URLSearchParams({ error: "Escribe un título y la pregunta de negocio que tiene que responder" })}`);
  let path: string;
  try {
    path = createAdditionalRequest({
      project: text(formData.get("project")),
      topic: text(formData.get("topic")),
      title: title.slice(0, 160),
      question: question.slice(0, 2000),
      period: text(formData.get("period")).slice(0, 120),
      source: text(formData.get("source")).slice(0, 300),
      today: new Date().toISOString().slice(0, 10),
    });
  } catch (error) {
    redirect(`/informes/adicionales?${new URLSearchParams({ error: error instanceof Error ? error.message : String(error) })}`);
  }
  revalidatePath("/informes", "layout");
  redirect(`/informes/adicionales/${path}?${new URLSearchParams({ ok: "Solicitud creada. Pide en el chat «haz el informe adicional " + path + "» para que Claude lo elabore." })}`);
}
