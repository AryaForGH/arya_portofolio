import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpRight, Check, Eye, EyeOff, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { usePreferences } from "../contexts/PreferencesContext.jsx";
import { getAdminContent } from "../lib/content.js";
import { requireSupabase } from "../lib/supabase.js";
import { uploadFileWithProgress } from "../lib/storage.js";

const schema = {
  profiles: { title: "profile", fields: [
    ["full_name", "text"], ["profession", "translation"], ["headline", "translation"], ["bio", "translation", true], ["education", "translation"],
    ["location", "text"], ["phone", "tel"], ["email", "email"], ["avatar_url", "image"], ["availability_text", "translation"],
    ["section_visibility", "json", true], ["seo_title", "translation"], ["seo_description", "translation", true], ["published", "boolean"],
  ] },
  projects: { title: "projects", fields: [
    ["slug", "text"], ["title", "translation"], ["short_description", "translation", true], ["description", "translation", true],
    ["thumbnail_url", "image"], ["gallery_urls", "images", true], ["category", "text"], ["technologies", "list"],
    ["year", "number"], ["status", "text"], ["featured", "boolean"], ["github_url", "url"], ["live_url", "url"],
    ["sort_order", "number"], ["published", "boolean"],
  ] },
  certificates: { title: "certificates", fields: [
    ["title", "translation"], ["issuer", "text"], ["issue_date", "date"], ["expiry_date", "date"], ["credential_id", "text"],
    ["verification_url", "url"], ["preview_url", "image"], ["pdf_url", "url"], ["description", "translation", true],
    ["category", "text"], ["sort_order", "number"], ["published", "boolean"],
  ] },
  experiences: { title: "experiences", fields: [
    ["organization", "text"], ["position", "translation"], ["experience_type", "text"], ["location", "text"],
    ["start_date", "date"], ["end_date", "date"], ["is_current", "boolean"], ["description", "translation", true],
    ["responsibilities", "list", true], ["achievements", "list", true], ["logo_url", "image"],
    ["sort_order", "number"], ["published", "boolean"],
  ] },
  educations: { title: "educationTitle", fields: [
    ["institution", "text"], ["degree", "translation"], ["field_of_study", "translation"], ["location", "text"],
    ["start_date", "date"], ["end_date", "date"], ["is_current", "boolean"],
    ["description", "translation", true], ["achievements", "list", true], ["grade", "text"],
    ["logo_url", "image"], ["sort_order", "number"], ["published", "boolean"],
  ] },
  services: { title: "services", fields: [
    ["name", "translation"], ["category", "text"], ["description", "translation", true], ["price_min", "number"],
    ["price_max", "number"], ["price_fixed", "boolean"], ["currency", "text"], ["estimated_duration", "text"],
    ["features", "list", true], ["revisions", "number"], ["complexity", "text"], ["featured", "boolean"],
    ["available", "boolean"], ["terms", "translation", true], ["sort_order", "number"], ["published", "boolean"],
  ] },
  skills: { title: "skills", fields: [["name", "translation"], ["category", "text"], ["proficiency", "number"], ["sort_order", "number"], ["published", "boolean"]] },
  social_links: { title: "social_links", fields: [["platform", "text"], ["url", "url"], ["sort_order", "number"], ["published", "boolean"]] },
  contact_messages: { title: "contact_messages", fields: [["name", "text"], ["email", "email"], ["message", "textarea", true], ["read_at", "datetime-local"]] },
  site_settings: { title: "site_settings", fields: [["key", "text"], ["value", "json", true], ["description", "text"], ["is_public", "boolean"]] },
};
const requiredFields = {
  projects: ["slug", "title"],
  certificates: ["title"],
  experiences: ["organization", "position"],
  educations: ["institution", "degree", "field_of_study", "start_date"],
  services: ["name"],
  skills: ["name"],
  social_links: ["platform", "url"],
  site_settings: ["key"],
};

function jsonValue(value) {
  if (value == null) return "";
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}
function fieldLabel(field, t) { return t(`field_${field}`) !== `field_${field}` ? t(`field_${field}`) : t(field); }
function toDbValue(value, type) {
  if (value === "" && type !== "boolean") return null;
  if (type === "json") {
    try { return JSON.parse(value); }
    catch { throw new Error("Invalid JSON. Use a JSON string, array, or object."); }
  }
  if (type === "number") return Number(value);
  if (type === "boolean") return Boolean(value);
  return value;
}
function initialValues(config, record) {
  return Object.fromEntries(config.fields.flatMap(([name, type]) => {
    const value = record?.[name];
    if (type === "translation") return [
      [`${name}_id`, value?.id || ""],
      [`${name}_en`, value?.en || ""],
    ];
    if (type === "list") return [[name, Array.isArray(value) ? value.map((entry) => typeof entry === "string"
      ? entry : `${entry?.id || ""} || ${entry?.en || ""}`).join("\n") : ""]];
    if (type === "images") return [[name, Array.isArray(value) ? value : []]];
    return [[name, value == null ? (type === "boolean" ? false : "") : type === "json" ? jsonValue(value) : value]];
  }));
}

const imageBuckets = {
  profiles: "profile-images",
  projects: "project-images",
  certificates: "certificates",
  experiences: "project-images",
  educations: "project-images",
};

const imageLimits = {
  "profile-images": 10,
  "project-images": 10,
  certificates: 10,
};

export function AdminLoginPage() {
  const { signIn } = useAuth();
  const { t } = usePreferences();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    resolver: zodResolver(z.object({ username: z.string().min(1), password: z.string().min(1) })),
  });
  async function onSubmit(values) {
    setError("");
    try { await signIn(values.username, values.password); navigate("/admin/dashboard", { replace: true }); }
    catch (loginError) {
      console.error("Admin sign-in failed", loginError);
      const errorMessages = {
        INVALID_CREDENTIALS: "loginError",
        LOGIN_RATE_LIMITED: "loginRateLimited",
        LOGIN_NETWORK_ERROR: "loginNetworkError",
        LOGIN_CONFIGURATION_ERROR: "loginServiceError",
        LOGIN_SERVICE_ERROR: "loginServiceError",
      };
      setError(t(errorMessages[loginError.message] || "loginServiceError"));
    }
  }
  return <main className="login-wrap"><form className="login-card glass form-stack" onSubmit={handleSubmit(onSubmit)}>
    <Link className="brand" to="/">Portfolio<span>.</span></Link><h1>{t("loginTitle")}</h1>
    <label>{t("username")}<input className="field" autoComplete="username" {...register("username")} /></label>
    <label>{t("password")}<div style={{ display: "flex", gap: 8 }}><input className="field" type={showPassword ? "text" : "password"} autoComplete="current-password" {...register("password")} /><button type="button" className="icon-button" aria-label={t("togglePassword")} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
    {error && <p role="alert" className="muted">{error}</p>}
    <button className="button button-primary" disabled={isSubmitting}>{isSubmitting ? t("sending") : t("login")}</button>
  </form></main>;
}

export function DashboardPage() {
  const { t } = usePreferences();
  const { session, changeInitialPassword } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, data: {} });
  const [password, setPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState("");
  const mustChange = Boolean(session?.user?.app_metadata?.must_change_password);
  useEffect(() => {
    if (mustChange) {
      setState({ loading: false, error: null, data: {} });
      return undefined;
    }
    let active = true;
    Promise.all(["projects", "certificates", "experiences", "services", "contact_messages"].map((table) => getAdminContent(table)))
      .then(([projects, certificates, experiences, services, messages]) => {
        if (active) setState({ loading: false, error: null, data: { projects, certificates, experiences, services, messages } });
      }).catch((error) => { console.error("Unable to load dashboard statistics", error); if (active) setState({ loading: false, error, data: {} }); });
    return () => { active = false; };
  }, [mustChange]);
  async function updatePassword(event) {
    event.preventDefault();
    if (password.length < 10) { setPasswordStatus(t("genericError")); return; }
    try {
      await changeInitialPassword(password);
      setPassword(""); setPasswordStatus(t("saveSuccess"));
    } catch (error) { console.error("Password update failed", error); setPasswordStatus(t("genericError")); }
  }
  const metrics = [
    ["totalProjects", state.data.projects?.length || 0], ["totalCertificates", state.data.certificates?.length || 0],
    ["totalExperience", state.data.experiences?.length || 0], ["activeServices", state.data.services?.filter((item) => item.available).length || 0],
    ["unreadMessages", state.data.messages?.filter((item) => !item.read_at).length || 0],
  ];
  return <main className="admin-content">
    <div className="admin-title-row"><div><span className="eyebrow">{t("admin")}</span><h1>{t("dashboard")}</h1></div><Link className="button" to="/" target="_blank">{t("navHome")} <ArrowUpRight size={14} /></Link></div>
    {mustChange && <form className="admin-panel" style={{ padding: 20, marginBottom: 20 }} onSubmit={updatePassword}><h3>{t("password")}</h3><p className="muted">{t("changeInitialPassword")}</p><div style={{ display: "flex", gap: 9 }}><input className="field" type="password" minLength="10" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t("minimumPassword")} required /><button className="button button-primary">{t("save")}</button></div>{passwordStatus && <p role="status" className="muted">{passwordStatus}</p>}</form>}
    {mustChange ? null : state.error ? <div className="error-state"><p>{t("genericError")}</p><button className="button" onClick={() => window.location.reload()}>{t("retry")}</button></div> : state.loading ? <div className="empty-state">{t("loadingData")}</div> : <>
      <div className="stat-grid">{metrics.map(([key, value]) => <div className="stat-card" key={key}><p>{t(key)}</p><strong>{value}</strong></div>)}</div>
      <section className="admin-panel"><div style={{ padding: 18 }}><h2 style={{ margin: 0, fontSize: 19 }}>{t("latestProjects")}</h2></div><div className="table-wrap"><table className="admin-table"><thead><tr><th>{t("title")}</th><th>{t("category")}</th><th>{t("status")}</th><th>{t("actions")}</th></tr></thead><tbody>{(state.data.projects || []).slice(0, 6).map((item) => <tr key={item.id}><td>{item.title?.id || item.title?.en || item.slug}</td><td>{item.category || "—"}</td><td>{item.published ? t("published") : t("draft")}</td><td><Link className="button button-quiet" to="/admin/projects">{t("edit")}</Link></td></tr>)}</tbody></table>{!state.data.projects?.length && <div className="empty-state">{t("empty")}</div>}</div></section>
    </>}
  </main>;
}

export function AdminResourcePage({ resource }) {
  const { t } = usePreferences();
  const config = schema[resource];
  const isMessages = resource === "contact_messages";
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [toast, setToast] = useState("");
  const [stagedMedia, setStagedMedia] = useState({});
  const form = useForm({ defaultValues: initialValues(config, null) });

  async function load() {
    setLoading(true); setError(""); setPage(0);
    try { setItems(await getAdminContent(resource)); }
    catch (loadError) { console.error(`Unable to load admin resource ${resource}`, loadError); setError(t("genericError")); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [resource]);
  function clearStagedMedia() {
    Object.values(stagedMedia).flat().forEach(({ preview }) => URL.revokeObjectURL(preview));
    setStagedMedia({});
  }
  function openEditor(record = null) {
    setEditing(record || {});
    form.reset(initialValues(config, record));
    clearStagedMedia();
    if (resource === "profiles") form.setValue("education_visible", record?.section_visibility?.education !== false);
  }
  function selectImages(field, fileList, multiple) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const bucket = imageBuckets[resource];
    const maxSize = (imageLimits[bucket] || 10) * 1024 * 1024;
    const valid = files.filter((file) =>
      ["image/jpeg", "image/png", "image/webp"].includes(file.type) &&
      /\.(jpe?g|png|webp)$/i.test(file.name) &&
      file.size > 0 && file.size <= maxSize);
    if (valid.length !== files.length) {
      setError(t("invalidImageUpload").replace("{size}", String(imageLimits[bucket] || 10)));
    } else setError("");
    if (!valid.length) return;
    const next = valid.map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setStagedMedia((current) => {
      const old = current[field] || [];
      const appended = multiple ? [...old, ...next] : next;
      (multiple ? [] : old).forEach(({ preview }) => URL.revokeObjectURL(preview));
      return { ...current, [field]: appended };
    });
  }
  function removeStagedImage(field, index) {
    setStagedMedia((current) => {
      const existing = current[field] || [];
      const removed = existing[index];
      if (removed) URL.revokeObjectURL(removed.preview);
      return { ...current, [field]: existing.filter((_, itemIndex) => itemIndex !== index) };
    });
  }
  async function save(values) {
    setSaving(true); setError("");
    const uploadedPaths = [];
    let persisted = false;
    try {
      if (requiredFields[resource]?.some((field) => {
        const definition = config.fields.find(([name]) => name === field);
        return definition?.[1] === "translation"
          ? !values[`${field}_id`]?.trim() && !values[`${field}_en`]?.trim()
          : !String(values[field] ?? "").trim();
      })) throw new Error(t("required"));
      if (resource === "educations" && values.is_current && values.end_date) throw new Error(t("eduCurrentEndDate"));
      if (resource === "educations" && values.start_date && values.end_date && values.end_date < values.start_date) throw new Error(t("eduInvalidDates"));
      const client = requireSupabase();
      const payload = {};
      for (const [key, type] of config.fields) {
        if (type === "translation") {
          payload[key] = Object.fromEntries(["id", "en"]
            .map((language) => [language, values[`${key}_${language}`]?.trim() || ""])
            .filter(([, text]) => text));
        } else if (type === "list") {
          payload[key] = String(values[key] || "").split(/\r?\n/).map((entry) => {
            const [id, en] = entry.split(" || ").map((part) => part.trim());
            if (en !== undefined) return Object.fromEntries([["id", id], ["en", en]].filter(([, text]) => text));
            return id;
          }).filter(Boolean);
        } else if (type === "images") {
          payload[key] = Array.isArray(values[key]) ? [...values[key]] : [];
        } else if (type === "image") {
          payload[key] = values[key] || "";
        } else {
          payload[key] = toDbValue(values[key], type);
        }
      }
      if (resource === "profiles") {
        const visibility = payload.section_visibility && typeof payload.section_visibility === "object" && !Array.isArray(payload.section_visibility)
          ? payload.section_visibility : {};
        payload.section_visibility = { ...visibility, education: Boolean(values.education_visible) };
      }
      const storage = client.storage.from(imageBuckets[resource] || "project-images");
      for (const [field, staged] of Object.entries(stagedMedia)) {
        const urls = [];
        for (const { file } of staged) {
          const path = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
          const { error: uploadError } = await storage.upload(path, file, { contentType: file.type, upsert: false });
          if (uploadError) throw uploadError;
          uploadedPaths.push(path);
          urls.push(storage.getPublicUrl(path).data.publicUrl);
        }
        if (field === "gallery_urls") payload[field] = [...(payload[field] || []), ...urls];
        else if (urls.length) payload[field] = urls[urls.length - 1];
      }
      const request = client.from(resource);
      if (isMessages) {
        const { error: updateError } = await client.from(resource).update({ read_at: payload.read_at || new Date().toISOString() }).eq("id", editing.id);
        if (updateError) throw updateError;
      } else if (editing.id) {
        const { error: updateError } = await request.update(payload).eq("id", editing.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await request.insert(payload);
        if (insertError) throw insertError;
      }
      persisted = true;
      setEditing(null); clearStagedMedia(); await load(); setToast(t("saveSuccess"));
    } catch (saveError) {
      if (uploadedPaths.length && !persisted) {
        const { error: cleanupError } = await requireSupabase().storage.from(imageBuckets[resource] || "project-images").remove(uploadedPaths);
        if (cleanupError) console.error("Unable to clean up uploaded media after its content save failed", cleanupError);
      }
      console.error(`Unable to save ${resource}`, saveError);
      setError([t("required"), t("eduCurrentEndDate"), t("eduInvalidDates")].includes(saveError.message) || saveError.message?.includes("JSON") ? saveError.message : t("genericError"));
    }
    finally { setSaving(false); }
  }
  async function remove(item) {
    if (!window.confirm(t("confirmDelete"))) return;
    try {
      const { error: deleteError } = await requireSupabase().from(resource).delete().eq("id", item.id);
      if (deleteError) throw deleteError;
      await load(); setToast(t("deleteSuccess"));
    } catch (deleteError) { console.error(`Unable to delete ${resource}`, deleteError); setError(t("genericError")); }
  }
  async function markRead(item) {
    try {
      const { error: updateError } = await requireSupabase().from(resource).update({ read_at: item.read_at ? null : new Date().toISOString() }).eq("id", item.id);
      if (updateError) throw updateError;
      await load(); setToast(t("statusUpdated"));
    } catch (updateError) { console.error("Unable to update message read status", updateError); setError(t("genericError")); }
  }
  const filtered = items.filter((item) => JSON.stringify(item).toLowerCase().includes(search.toLowerCase()));
  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visibleItems = filtered.slice(page * pageSize, (page + 1) * pageSize);
  return <main className="admin-content">
    <div className="admin-title-row"><div><span className="eyebrow">{t("admin")}</span><h1>{t(config.title)}</h1></div>{!isMessages && !(resource === "profiles" && items.length > 0) && <button className="button button-primary" onClick={() => openEditor()}><Plus size={15} />{t("add")}</button>}</div>
    <label className="field search-field" style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}><Search size={16} /><input className="field" style={{ border: 0, padding: 0 }} value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} placeholder={t("search")} /></label>
    {error && <div role="alert" className="error-state" style={{ marginBottom: 15 }}>{error}<div style={{ marginTop: 10 }}><button className="button" onClick={load}>{t("retry")}</button></div></div>}
    {toast && <div className="toast" role="status">{toast}<button className="small-button" style={{ marginLeft: 12 }} onClick={() => setToast("")}>×</button></div>}
    {editing && <section className="admin-panel" style={{ marginBottom: 20 }}>
      <form className="admin-form" onSubmit={form.handleSubmit(save)}>
        <p className="admin-form-help wide">{t("adminInputHelp")}</p>
        {config.fields.map(([name, type, wide]) => {
          const value = form.watch(name);
          if (resource === "educations" && name === "end_date" && form.watch("is_current")) return null;
          const isWide = wide || ["textarea", "json", "translation", "list", "image", "images"].includes(type);
          const props = { ...form.register(name), className: type === "textarea" || type === "json" || type === "list" ? "textarea-field" : "field", ...(type === "tel" ? { maxLength: 32 } : {}) };
          if (type === "translation") return <fieldset key={name} className={`admin-field-group${isWide ? " wide" : ""}`}>
            <legend>{fieldLabel(name, t)}</legend><p className="admin-field-hint">{t("translationInputHelp")}</p>
            <div className="admin-translation-fields">
              {["id", "en"].map((language) => <label key={language}>{t(language === "id" ? "indonesian" : "english")}
                <textarea {...form.register(`${name}_${language}`)} className="textarea-field" rows={name === "bio" || name === "description" ? 4 : 2} />
              </label>)}
            </div>
          </fieldset>;
          if (type === "image" || type === "images") {
            const currentImages = type === "images" ? (Array.isArray(value) ? value : []) : (value ? [value] : []);
            const pendingImages = stagedMedia[name] || [];
            return <div key={name} className={`admin-field-group media-field${isWide ? " wide" : ""}`}>
              <span className="admin-field-label">{fieldLabel(name, t)}</span>
              <p className="admin-field-hint">{t(type === "images" ? "galleryInputHelp" : "imageInputHelp").replace("{size}", String(imageLimits[imageBuckets[resource]] || 10))}</p>
              <label className="button media-picker"><Upload size={15} />{t("choosePhotos")}
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple={type === "images"} onChange={(event) => {
                  selectImages(name, event.target.files, type === "images");
                  event.target.value = "";
                }} />
              </label>
              {(currentImages.length > 0 || pendingImages.length > 0) && <div className="media-preview-grid">
                {currentImages.map((url, index) => <figure key={`${url}-${index}`} className="media-preview-item">
                  <img src={url} alt="" loading="lazy" />
                  <button type="button" className="small-button" aria-label={t("removePhoto")} onClick={() => {
                    if (type === "images") form.setValue(name, currentImages.filter((_, imageIndex) => imageIndex !== index), { shouldDirty: true });
                    else form.setValue(name, "", { shouldDirty: true });
                  }}><Trash2 size={14} /></button>
                </figure>)}
                {pendingImages.map(({ file, preview }, index) => <figure key={`${file.name}-${index}`} className="media-preview-item">
                  <img src={preview} alt={file.name} />
                  <button type="button" className="small-button" aria-label={t("removePhoto")} onClick={() => removeStagedImage(name, index)}><Trash2 size={14} /></button>
                </figure>)}
              </div>}
            </div>;
          }
          if (type === "list") return <label key={name} className={isWide ? "wide admin-field-with-hint" : "admin-field-with-hint"}>{fieldLabel(name, t)}
            <span className="admin-field-hint">{t("listInputHelp")}</span><textarea {...props} rows={4} placeholder={t("listInputPlaceholder")} />
          </label>;
          return <label key={name} className={isWide ? "wide" : ""}>{fieldLabel(name, t)}
            {type === "boolean" ? <input type="checkbox" checked={Boolean(value)} onChange={(event) => form.setValue(name, event.target.checked)} /> :
              type === "textarea" || type === "json" ? <><textarea {...props} rows={type === "json" ? 4 : 5} placeholder={type === "json" ? t("jsonHint") : ""} />{type === "json" && <span className="admin-field-hint">{t("advancedJsonHelp")}</span>}</> :
                <input {...props} type={type} required={requiredFields[resource]?.includes(name)} />}
          </label>;
        })}
        {resource === "profiles" && <label className="wide visibility-toggle"><input type="checkbox" checked={Boolean(form.watch("education_visible"))} onChange={(event) => form.setValue("education_visible", event.target.checked)} />{t("educationVisibility")}</label>}
        <div className="form-actions"><button type="button" className="button button-quiet" onClick={() => { setEditing(null); clearStagedMedia(); }}>{t("cancel")}</button><button disabled={saving} className="button button-primary">{saving ? t("sending") : t("save")}</button></div>
      </form>
    </section>}
    <section className="admin-panel">
      {loading ? <div className="empty-state">{t("loadingData")}</div> : !filtered.length ? <div className="empty-state">{isMessages ? t("noMessages") : t("empty")}</div> :
        <div className="table-wrap"><table className="admin-table"><thead><tr><th>{t("title")}</th><th>{t("status")}</th><th>{t("updated_at")}</th><th>{t("actions")}</th></tr></thead><tbody>{visibleItems.map((item) => {
          const heading = item.title?.id || item.title?.en || item.name?.id || item.name?.en || item.full_name || item.institution || item.platform || item.key || item.organization || item.email || item.slug || item.id;
          return <tr key={item.id}><td><strong>{heading}</strong>{isMessages && <div className="muted">{item.message}</div>}</td><td>{isMessages ? item.read_at ? t("published") : t("draft") : item.published === false ? t("draft") : t("published")}</td><td>{item.updated_at || item.created_at ? new Date(item.updated_at || item.created_at).toLocaleDateString() : "—"}</td><td><div className="table-actions">{isMessages ? <button className="small-button" title={t("status")} onClick={() => markRead(item)}>{item.read_at ? <EyeOff size={15} /> : <Eye size={15} />}</button> : <button className="small-button" title={t("edit")} onClick={() => openEditor(item)}><Pencil size={15} /></button>}{resource !== "profiles" && <button className="small-button" title={t("delete")} onClick={() => remove(item)}><Trash2 size={15} /></button>}</div></td></tr>;
        })}</tbody></table></div>}
      {!loading && pages > 1 && <div style={{ display: "flex", justifyContent: "center", gap: 10, padding: 14 }}><button className="button" disabled={page === 0} onClick={() => setPage((current) => current - 1)}>←</button><span className="muted" style={{ alignSelf: "center" }}>{page + 1} / {pages}</span><button className="button" disabled={page + 1 >= pages} onClick={() => setPage((current) => current + 1)}>→</button></div>}
    </section>
  </main>;
}

function cvDownloadName(value) {
  const safeStem = String(value || "CV")
    .trim()
    .replace(/\.pdf$/i, "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/[^A-Za-z0-9 _.-]/g, "-")
    .replace(/[. ]+$/g, "")
    .slice(0, 116) || "CV";
  return `${safeStem}.pdf`;
}

export function CVManagementPage() {
  const { language, t } = usePreferences();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [downloadFilename, setDownloadFilename] = useState("CV.pdf");
  const [labelId, setLabelId] = useState("Unduh CV");
  const [labelEn, setLabelEn] = useState("Download CV");
  const [buttonEnabled, setButtonEnabled] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [data] = await getAdminContent("cv_settings");
      setRecord(data || null);
      setDownloadFilename(data?.download_filename || "CV.pdf");
      setLabelId(data?.button_label?.id || "Unduh CV");
      setLabelEn(data?.button_label?.en || "Download CV");
      setButtonEnabled(Boolean(data?.button_enabled));
    } catch (loadError) {
      console.error("Unable to load CV settings", loadError);
      setError(t("genericError"));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  function metadataPayload(next = {}) {
    return {
      singleton: true,
      original_filename: record?.original_filename || "",
      download_filename: cvDownloadName(downloadFilename),
      storage_path: record?.storage_path || "",
      uploaded_at: record?.uploaded_at || null,
      file_size: record?.file_size || null,
      button_enabled: buttonEnabled,
      button_label: { id: labelId.trim() || "Unduh CV", en: labelEn.trim() || "Download CV" },
      is_active: Boolean(record?.is_active && record?.storage_path),
      ...next,
    };
  }

  async function saveSettings(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (buttonEnabled && (!record?.is_active || !record?.storage_path)) throw new Error(t("cvRequired"));
      const { error: saveError } = await requireSupabase().from("cv_settings").upsert(metadataPayload(), { onConflict: "singleton" });
      if (saveError) throw saveError;
      await load();
      setToast(t("saveSuccess"));
    } catch (saveError) {
      console.error("Unable to save CV settings", saveError);
      setError(saveError.message === t("cvRequired") ? saveError.message : t("genericError"));
    } finally {
      setBusy(false);
    }
  }

  async function uploadCV(event) {
    event.preventDefault();
    if (!selectedFile) return;
    const currentFile = selectedFile;
    const oldPath = record?.storage_path;
    const newPath = `${crypto.randomUUID()}-${currentFile.name.replace(/[^A-Za-z0-9._-]/g, "-")}`;
    const downloadName = cvDownloadName(downloadFilename || currentFile.name);
    setBusy(true);
    setError("");
    setProgress(0);
    try {
      await uploadFileWithProgress("portfolio-cv", newPath, currentFile, setProgress);
      const nextMetadata = metadataPayload({
        original_filename: currentFile.name.slice(0, 255),
        download_filename: downloadName,
        storage_path: newPath,
        uploaded_at: new Date().toISOString(),
        file_size: currentFile.size,
        button_enabled: buttonEnabled,
        is_active: true,
      });
      const { error: updateError } = await requireSupabase().from("cv_settings").upsert(nextMetadata, { onConflict: "singleton" });
      if (updateError) {
        const { error: cleanupError } = await requireSupabase().storage.from("portfolio-cv").remove([newPath]);
        if (cleanupError) console.error("Unable to remove a newly uploaded CV after its metadata update failed", cleanupError);
        throw updateError;
      }
      setSelectedFile(null);
      setDownloadFilename(downloadName);
      await load();
      if (oldPath && oldPath !== newPath) {
        const { error: cleanupError } = await requireSupabase().storage.from("portfolio-cv").remove([oldPath]);
        if (cleanupError) {
          console.error("New CV is active but the previous file could not be removed", cleanupError);
          setToast(t("oldCvCleanupWarning"));
          return;
        }
      }
      setToast(t("cvUpdated"));
    } catch (uploadError) {
      console.error("CV upload failed", uploadError);
      setError(t("cvUploadFailed"));
    } finally {
      setBusy(false);
      setProgress(0);
    }
  }

  async function deleteCV() {
    if (!record?.storage_path || !window.confirm(t("deleteCvConfirm"))) return;
    setBusy(true);
    setError("");
    const oldPath = record.storage_path;
    try {
      const { error: updateError } = await requireSupabase().from("cv_settings").upsert(metadataPayload({
        original_filename: "",
        storage_path: "",
        uploaded_at: null,
        file_size: null,
        button_enabled: false,
        is_active: false,
      }), { onConflict: "singleton" });
      if (updateError) throw updateError;
      setButtonEnabled(false);
      await load();
      const { error: removeError } = await requireSupabase().storage.from("portfolio-cv").remove([oldPath]);
      if (removeError) {
        console.error("CV was deactivated, but its Storage object could not be removed", removeError);
        setError(t("oldCvCleanupWarning"));
      } else {
        setToast(t("cvRemoved"));
      }
    } catch (deleteError) {
      console.error("Unable to delete CV", deleteError);
      setError(t("genericError"));
    } finally {
      setBusy(false);
    }
  }

  const previewUrl = record?.storage_path
    ? requireSupabase().storage.from("portfolio-cv").getPublicUrl(record.storage_path).data.publicUrl
    : "";

  return <main className="admin-content">
    <div className="admin-title-row"><div><span className="eyebrow">{t("admin")}</span><h1>{t("cvManagement")}</h1></div></div>
    {error && <div role="alert" className="error-state" style={{ marginBottom: 16 }}>{error}<div style={{ marginTop: 10 }}><button className="button" onClick={load}>{t("retry")}</button></div></div>}
    {toast && <div className="toast" role="status">{toast}<button className="small-button" style={{ marginLeft: 12 }} onClick={() => setToast("")}>×</button></div>}
    {loading ? <div className="empty-state">{t("loadingData")}</div> : <>
      <section className="admin-panel cv-panel">
        <div className="cv-panel-heading"><div><span className="eyebrow">{t("activeCv")}</span><h2>{record?.is_active && record.storage_path ? record.original_filename : t("noCvUploaded")}</h2>
          {record?.is_active && record.storage_path && <p className="muted">{record.file_size ? `${(record.file_size / (1024 * 1024)).toFixed(2)} MB` : ""}{record.uploaded_at && ` · ${new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(record.uploaded_at))}`}</p>}
        </div>
        {previewUrl && <a className="button" href={previewUrl} target="_blank" rel="noreferrer">{t("previewCv")} <ArrowUpRight size={14} /></a>}</div>
        {previewUrl && <iframe className="cv-preview" title={t("previewCv")} src={`${previewUrl}#toolbar=0`} loading="lazy" />}
      </section>
      <form className="admin-panel cv-settings-form" onSubmit={saveSettings}>
        <h2>{t("cvSettings")}</h2>
        <div className="cv-fields">
          <label>{t("downloadFilename")}<input className="field" value={downloadFilename} maxLength={120} pattern="[A-Za-z0-9][A-Za-z0-9 _.-]{0,115}\.pdf" onChange={(event) => setDownloadFilename(event.target.value)} required /></label>
          <label>{t("cvLabelId")}<input className="field" value={labelId} maxLength={80} onChange={(event) => setLabelId(event.target.value)} required /></label>
          <label>{t("cvLabelEn")}<input className="field" value={labelEn} maxLength={80} onChange={(event) => setLabelEn(event.target.value)} required /></label>
        </div>
        <label className="visibility-toggle"><input type="checkbox" checked={buttonEnabled} onChange={(event) => setButtonEnabled(event.target.checked)} />{t("cvButtonEnabled")}</label>
        <div className="form-actions"><button className="button button-primary" disabled={busy}>{busy ? t("sending") : t("save")}</button></div>
      </form>
      <form className="admin-panel cv-upload-form" onSubmit={uploadCV}>
        <h2>{record?.storage_path ? t("replaceCv") : t("uploadCv")}</h2>
        <label className="cv-file-picker">{t("uploadCv")}<input type="file" accept="application/pdf,.pdf" disabled={busy} onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          if (file.type !== "application/pdf" || !/\.pdf$/i.test(file.name) || file.size < 1 || file.size > 5 * 1024 * 1024) {
            setError(t("cvUploadLimit")); setSelectedFile(null); event.target.value = ""; return;
          }
          setError(""); setSelectedFile(file); setDownloadFilename(cvDownloadName(downloadFilename || file.name)); event.target.value = "";
        }} /></label>
        {selectedFile && <p className="muted">{selectedFile.name} · {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>}
        {busy && <div className="upload-progress"><label htmlFor="cv-upload-progress">{t("uploadingProgress")} — {progress}%</label><progress id="cv-upload-progress" max="100" value={progress} /></div>}
        <div className="form-actions"><button className="button button-primary" disabled={busy || !selectedFile}>{busy ? t("sending") : record?.storage_path ? t("replaceCv") : t("upload")}</button>{record?.storage_path && <button type="button" className="button button-quiet" disabled={busy} onClick={deleteCV}>{t("delete")}</button>}</div>
      </form>
    </>}
  </main>;
}

export function MediaManagerPage() {
  const { t } = usePreferences();
  const [bucket, setBucket] = useState("project-images");
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  async function load() {
    setLoading(true); setError("");
    try {
      const { data, error: listError } = await requireSupabase().storage.from(bucket).list("", { limit: 100, sortBy: { column: "created_at", order: "desc" } });
      if (listError) throw listError;
      setFiles(data || []);
    } catch (loadError) { console.error("Unable to list storage files", loadError); setError(t("genericError")); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [bucket]);
  useEffect(() => {
    if (!selectedFile) { setPreview(""); return undefined; }
    const url = URL.createObjectURL(selectedFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);
  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowed = bucket === "profile-images" || bucket === "project-images"
      ? ["image/jpeg", "image/png", "image/webp"]
      : bucket === "documents" ? ["application/pdf"] : ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    const extensions = { "image/jpeg": /\.(jpe?g)$/i, "image/png": /\.png$/i, "image/webp": /\.webp$/i, "application/pdf": /\.pdf$/i };
    if (!allowed.includes(file.type) || !extensions[file.type]?.test(file.name) || file.size > 10 * 1024 * 1024) { setError(t("invalidUpload")); return; }
    setSelectedFile(file);
    event.target.value = "";
  }
  async function uploadSelected() {
    const file = selectedFile;
    if (!file) return;
    setBusy(true); setError("");
    const safeName = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    try {
      const { error: uploadError } = await requireSupabase().storage.from(bucket).upload(safeName, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      setSelectedFile(null);
      await load(); setToast(t("uploadSuccess"));
    } catch (uploadError) { console.error("Media upload failed", uploadError); setError(t("genericError")); }
    finally { setBusy(false); }
  }
  async function remove(name) {
    if (!window.confirm(t("confirmDelete"))) return;
    try {
      const client = requireSupabase();
      const checks = await Promise.all([
        client.from("profiles").select("avatar_url,cv_url"),
        client.from("projects").select("thumbnail_url,gallery_urls"),
        client.from("certificates").select("preview_url,pdf_url"),
        client.from("experiences").select("logo_url"),
        client.from("site_settings").select("value"),
      ]);
      const failedCheck = checks.find((result) => result.error);
      if (failedCheck) throw failedCheck.error;
      if (checks.some(({ data }) => JSON.stringify(data || []).includes(name))) {
        setError(t("fileInUse"));
        return;
      }
      const { error: removeError } = await client.storage.from(bucket).remove([name]);
      if (removeError) throw removeError;
      await load(); setToast(t("deleteSuccess"));
    } catch (removeError) { console.error("Media deletion failed", removeError); setError(t("genericError")); }
  }
  async function copyUrl(file) {
    try {
      const storage = requireSupabase().storage.from(bucket);
      const { data, error: urlError } = bucket === "documents"
        ? await storage.createSignedUrl(file.name, 120)
        : { data: storage.getPublicUrl(file.name).data, error: null };
      if (urlError) throw urlError;
      const url = data?.signedUrl || data?.publicUrl;
      if (!url) throw new Error("Storage did not return a file URL");
      await navigator.clipboard.writeText(url);
      setToast(t("copyUrl"));
    } catch (copyError) { console.error("Unable to copy storage URL", copyError); setError(t("genericError")); }
  }
  return <main className="admin-content"><div className="admin-title-row"><div><span className="eyebrow">{t("admin")}</span><h1>{t("media")}</h1></div><label className="button button-primary"><Upload size={15} />{busy ? t("sending") : t("add")}<input hidden type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={upload} disabled={busy} /></label></div>
    <p className="muted">{t("mediaHelp")}</p>
    <select className="select-field" style={{ width: "auto", marginBottom: 16 }} value={bucket} onChange={(event) => setBucket(event.target.value)}><option value="profile-images">profile-images</option><option value="project-images">project-images</option><option value="certificates">certificates</option><option value="documents">documents</option></select>
    {selectedFile && <section className="admin-panel" style={{ padding: 18, marginBottom: 16 }}><h3>{t("previewUpload")}</h3>{selectedFile.type.startsWith("image/") ? <img src={preview} alt={t("imagePreview")} style={{ maxWidth: 260, maxHeight: 180, objectFit: "contain" }} /> : <p>{selectedFile.name}</p>}<p className="muted">{selectedFile.name} · {Math.ceil(selectedFile.size / 1024)} KB</p><div className="card-actions"><button className="button button-primary" disabled={busy} onClick={uploadSelected}>{t("upload")}</button><button className="button" onClick={() => setSelectedFile(null)}>{t("cancel")}</button></div></section>}
    {error && <div className="error-state">{error}<div style={{ marginTop: 10 }}><button className="button" onClick={load}>{t("retry")}</button></div></div>}
    {toast && <div className="toast" role="status">{toast}<button className="small-button" style={{ marginLeft: 12 }} onClick={() => setToast("")}>×</button></div>}
    {loading ? <div className="empty-state">{t("loadingData")}</div> : <div className="grid-cards">{files.map((file) => {
      const publicData = bucket === "documents" ? null : requireSupabase().storage.from(bucket).getPublicUrl(file.name).data;
      return <article key={file.name} className="card card-body">{file.metadata?.mimetype?.startsWith("image/") && publicData?.publicUrl && <img className="project-image" src={publicData.publicUrl} alt="" loading="lazy" />}<h3>{file.name}</h3><p>{file.metadata?.mimetype || "File"} · {Math.round((file.metadata?.size || 0) / 1024)} KB</p><div className="card-actions"><button className="button" onClick={() => copyUrl(file)}>{t("copyUrl")}</button><button className="button button-quiet" onClick={() => remove(file.name)}>{t("delete")}</button></div></article>;
    })}</div>}
    {!loading && !files.length && <div className="empty-state">{t("empty")}</div>}
  </main>;
}
