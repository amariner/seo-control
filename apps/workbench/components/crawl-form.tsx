"use client";

import { useState } from "react";
import { HardDrive, Play } from "lucide-react";
import { PILOT_PROJECTS } from "@seo/contracts";

/**
 * Configuración de crawl. Es lo único interactivo de la portada, así que es lo
 * único que sigue siendo cliente: el estado del disco se mide en el servidor y
 * llega como propiedad, no por `fetch`.
 *
 * El botón valida la configuración; no lanza nada. Mientras el preflight no dé
 * el visto bueno queda deshabilitado, y se dice por qué.
 */
export function CrawlForm({ ready, freeGiB, requiredGiB }: { ready: boolean; freeGiB: number | null; requiredGiB: number }) {
  const [validated, setValidated] = useState(false);
  return (
    <>
      <div className="form-row">
        <label className="field">
          <span>Proyecto</span>
          <select className="input">
            {PILOT_PROJECTS.map((brand) => <option key={brand.slug}>{brand.name}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Máximo de URLs</span>
          <input className="input" type="number" defaultValue="50000" min="1" max="50000" />
        </label>
      </div>
      <label className="field" style={{ marginTop: 9 }}>
        <span>URL inicial autorizada</span>
        <input className="input" defaultValue={`https://www.${PILOT_PROJECTS[0]?.domain ?? "porcelanosa.com"}/`} />
      </label>
      <button className="button button-primary" style={{ marginTop: 12 }} disabled={!ready} onClick={() => setValidated(true)}>
        <Play size={12} style={{ verticalAlign: -2, marginRight: 5 }} />
        {validated ? "Configuración validada" : "Validar nuevo crawl"}
      </button>
      {!ready ? (
        <div className="notice">
          <HardDrive size={13} style={{ verticalAlign: -2, marginRight: 6 }} />
          {freeGiB === null
            ? "No se pudo medir el disco, así que el crawler queda bloqueado por precaución."
            : `El crawler está bloqueado: ${freeGiB} GiB libres frente a los ${requiredGiB} GiB exigidos. La interfaz y los importadores sí se pueden validar.`}
        </div>
      ) : null}
    </>
  );
}
