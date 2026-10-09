import { requireSupabase, supabasePublishableKey, supabaseUrl } from "./supabase.js";

export async function uploadFileWithProgress(bucket, path, file, onProgress) {
  const client = requireSupabase();
  const { data: { session }, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session?.access_token || !supabaseUrl || !supabasePublishableKey) {
    throw new Error("An authenticated admin session is required to upload files.");
  }

  return new Promise((resolve, reject) => {
    const encodedPath = path.split("/").map(encodeURIComponent).join("/");
    const request = new XMLHttpRequest();
    request.open("POST", `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/${bucket}/${encodedPath}`);
    request.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    request.setRequestHeader("apikey", supabasePublishableKey);
    request.setRequestHeader("Content-Type", file.type);
    request.setRequestHeader("x-upsert", "false");
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(100);
        resolve();
        return;
      }
      reject(new Error(`Storage upload failed with status ${request.status}.`));
    });
    request.addEventListener("error", () => reject(new Error("A network error interrupted the upload.")));
    request.addEventListener("abort", () => reject(new Error("The upload was canceled.")));
    request.send(file);
  });
}
