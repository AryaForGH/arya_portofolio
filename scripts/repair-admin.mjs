import { createClient } from "@supabase/supabase-js";

const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ADMIN_RECOVERY_EMAIL", "ADMIN_RECOVERY_USERNAME", "ADMIN_RECOVERY_PASSWORD"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  ADMIN_RECOVERY_EMAIL,
  ADMIN_RECOVERY_USERNAME,
  ADMIN_RECOVERY_PASSWORD,
} = process.env;
const email = ADMIN_RECOVERY_EMAIL.trim().toLowerCase();
const username = ADMIN_RECOVERY_USERNAME.trim();

if (!/^[a-zA-Z0-9_.-]{3,40}$/.test(username)) {
  console.error("ADMIN_RECOVERY_USERNAME must be 3-40 letters, numbers, dots, underscores, or hyphens.");
  process.exit(1);
}
if (ADMIN_RECOVERY_PASSWORD.length < 10 || ADMIN_RECOVERY_PASSWORD.length > 256) {
  console.error("ADMIN_RECOVERY_PASSWORD must contain 10-256 characters.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let user = null;
for (let page = 1; !user; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) {
    console.error(`Unable to search Supabase Auth users: ${error.message}`);
    process.exit(1);
  }
  user = data.users.find((candidate) => candidate.email?.toLowerCase() === email) || null;
  if (user || data.users.length < 1000) break;
}

if (!user) {
  console.error("No Auth user matches ADMIN_RECOVERY_EMAIL. Check the email in Supabase Authentication → Users.");
  process.exit(1);
}

const { data: usernameOwner, error: ownerError } = await supabase
  .from("admin_accounts").select("user_id").eq("username", username).maybeSingle();
if (ownerError) {
  console.error(`Unable to check the admin username mapping: ${ownerError.message}`);
  process.exit(1);
}
if (usernameOwner && usernameOwner.user_id !== user.id) {
  console.error("That username is already assigned to a different Auth user. Choose the username already mapped to this account.");
  process.exit(1);
}

const appMetadata = {
  ...user.app_metadata,
  role: "admin",
  username,
  must_change_password: true,
};
const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
  password: ADMIN_RECOVERY_PASSWORD,
  app_metadata: appMetadata,
});
if (updateError) {
  console.error(`Unable to repair the Auth user: ${updateError.message}`);
  process.exit(1);
}

const { error: mappingError } = await supabase.from("admin_accounts").upsert(
  { user_id: user.id, username },
  { onConflict: "user_id" },
);
if (mappingError) {
  console.error(`The password and admin role were updated, but the username mapping needs repair: ${mappingError.message}`);
  process.exit(1);
}

console.log(`Admin account repaired for username "${username}". Sign in with the new temporary password and change it in the dashboard.`);
