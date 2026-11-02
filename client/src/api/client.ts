import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

export type ApiError = { message: string; fieldErrors: Record<string, string> };

/** Normalise any thrown error into a message plus per-field errors for forms. */
export function parseApiError(err: unknown): ApiError {
  if (axios.isAxiosError(err)) {
    if (!err.response) {
      return { message: "Can't reach the server. Check that it's running.", fieldErrors: {} };
    }
    const data = err.response.data as { error?: string; fieldErrors?: Record<string, string> } | undefined;
    return {
      message: data?.error ?? "Something went wrong. Try again.",
      fieldErrors: data?.fieldErrors ?? {},
    };
  }
  return { message: "Something went wrong. Try again.", fieldErrors: {} };
}