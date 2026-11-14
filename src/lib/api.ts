import { demoApi } from "./demoApi";
import { makeSupabaseApi } from "./supabaseApi";
import type { Api } from "./types";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Live backend when Supabase keys are set, otherwise the in-browser demo. */
export const api: Api = url && key ? makeSupabaseApi(url, key) : demoApi;
