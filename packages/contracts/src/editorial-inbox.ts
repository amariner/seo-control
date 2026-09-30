import { z } from "zod";
import { editorialStatusSchema } from "./editorial";

/**
 * Bandeja de cambios del visor (D-067). El visor desplegado no puede escribir
 * la curación —vive en el repositorio y llega con cada despliegue—, así que
 * sus cambios de estado y fecha de publicación se guardan aquí, se superponen
 * al plan mientras tanto y el workbench los incorpora a la curación al
 * sincronizar (`pnpm editorial:pull`).
 *
 * Cada cambio es inmutable: nunca se edita, solo se marca como traído.
 */
export const editorialInboxChangeSchema = z
  .object({
    id: z.string().uuid(),
    pieceId: z.string().min(1),
    status: editorialStatusSchema.nullable(),
    publicationDate: z.string().date().nullable(),
    /** Fecha de redacción; opcional en cambios anteriores a su edición. */
    writingDate: z.string().date().nullable().default(null),
    actor: z.string().min(1),
    createdAt: z.string().datetime({ offset: true }),
    /** Cuándo lo incorporó el workbench a la curación; `null` mientras siga pendiente. */
    pulledAt: z.string().datetime({ offset: true }).nullable(),
  })
  .refine((change) => change.status !== null || change.publicationDate !== null || change.writingDate !== null, { message: "El cambio no modifica nada." });
export type EditorialInboxChange = z.infer<typeof editorialInboxChangeSchema>;

/** Lo que el visor puede cambiar de una pieza: estado y fechas de redacción y publicación. */
export const editorialInboxEditSchema = z
  .object({
    status: editorialStatusSchema.exclude(["desconocido"]).optional(),
    publicationDate: z.string().date().optional(),
    writingDate: z.string().date().optional(),
  })
  .strict()
  .refine((edit) => edit.status !== undefined || edit.publicationDate !== undefined || edit.writingDate !== undefined, { message: "Indica un estado o una fecha." });
export type EditorialInboxEdit = z.infer<typeof editorialInboxEditSchema>;
