import { configDefaults, defineConfig } from "vitest/config";

/* El build `standalone` copia las pruebas en `.next/standalone`; sin excluirlo,
   vitest las recoge y falla al no encontrar el tsconfig del monorepo. */
export default defineConfig({
  test: { exclude: [...configDefaults.exclude, ".next/**"] },
});
