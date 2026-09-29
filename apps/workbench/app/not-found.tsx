import Link from "next/link";
import { WorkbenchFrame } from "@/components/workbench-frame";

/** 404 del workbench dentro de su shell (D-077). */
export default function NotFound() {
  return (
    <WorkbenchFrame eyebrow="Error 404" title="Página no encontrada" description="La dirección no existe en el workbench o el elemento ya no está en local.">
      <p>
        <Link className="section-link" href="/">Volver al inicio</Link>
      </p>
    </WorkbenchFrame>
  );
}
