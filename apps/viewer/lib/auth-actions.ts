"use server";

import { signOut } from "@/auth";

/** Cierra la sesión y vuelve al login (D-047). */
export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
