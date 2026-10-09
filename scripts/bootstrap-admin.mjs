import { createClient } from "@supabase/supabase-js";

const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "BOOTSTRAP_ADMIN_EMAIL", "BOOTSTRAP_ADMIN_USERNAME", "BOOTSTRAP_ADMIN_PASSWORD"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_USERNAME, BOOTSTRAP_ADMIN_PASSWORD } = process.env;
if (!/^[a-zA-Z0-9_.-]{3,40}$/.test(BOOTSTRAP_ADMIN_USERNAME)) {
  console.error("BOOTSTRAP_ADMIN_USERNAME must be 3-40 letters, numbers, dots, underscores, or hyphens.");
  process.exit(1);
}
if (BOOTSTRAP_ADMIN_PASSWORD.length < 10) {
  console.error("BOOTSTRAP_ADMIN_PASSWORD must have at least 10 characters.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data, error } = await supabase.auth.admin.createUser({
  email: BOOTSTRAP_ADMIN_EMAIL,
  password: BOOTSTRAP_ADMIN_PASSWORD,
  email_confirm: true,
  app_metadata: { role: "admin", username: BOOTSTRAP_ADMIN_USERNAME, must_change_password: true },
});
if (error) {
  console.error(`Unable to create the admin account: ${error.message}`);
  process.exit(1);
}
const { error: mappingError } = await supabase.from("admin_accounts").insert({
  user_id: data.user.id,
  username: BOOTSTRAP_ADMIN_USERNAME,
});
if (mappingError) {
  await supabase.auth.admin.deleteUser(data.user.id);
  console.error(`Unable to register the username mapping: ${mappingError.message}`);
  process.exit(1);
}
console.log("Admin account created. Sign in once and set a new password in the dashboard.");
