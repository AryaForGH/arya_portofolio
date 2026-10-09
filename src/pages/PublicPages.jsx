import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowDownToLine, ArrowUpRight, Atom, BarChart3, Brain, Braces, Code2, Database, FlaskConical, Github, Instagram, Linkedin, Mail, MapPin, MessageCircle, Music2, Phone, Search, Wind } from "lucide-react";
import { usePreferences } from "../contexts/PreferencesContext.jsx";
import { formatDate, getPublicContent, localized } from "../lib/content.js";
import { requireSupabase } from "../lib/supabase.js";

export function usePublicTable(table, options) {
  const [state, setState] = useState({ data: [], loading: true, error: null, attempt: 0 });
  useEffect(() => {
    let active = true;
    setState((current) => ({ ...current, loading: true, error: null }));
    getPublicContent(table, options).then((data) => {
      if (active) setState((current) => ({ ...current, data, loading: false }));
    }).catch((error) => {
      console.error(`Unable to load public ${table}`, error);
      if (active) setState((current) => ({ ...current, error, loading: false }));
    });
    return () => { active = false; };
  }, [table, options?.limit, options?.orderBy, state.attempt]);
  return { ...state, retry: () => setState((current) => ({ ...current, attempt: current.attempt + 1 })) };
}

function ContentState({ loading, error, retry, empty, children }) {
  const { t } = usePreferences();
  if (loading) return <div className="empty-state">{t("loadingData")}</div>;
  if (error) return <div className="error-state"><h3>{t("errorTitle")}</h3><p>{t("genericError")}</p><button className="button" onClick={retry}>{t("retry")}</button></div>;
  if (empty) return <div className="empty-state">{t("empty")}</div>;
  return children;
}

function getSocialIcon(platform) {
  const name = platform?.toLowerCase() || "";
  if (name.includes("whatsapp")) return <MessageCircle size={17} />;
  if (name.includes("github")) return <Github size={17} />;
  if (name.includes("linkedin")) return <Linkedin size={17} />;
  if (name.includes("instagram")) return <Instagram size={17} />;
  if (name.includes("tiktok")) return <Music2 size={17} />;
  return <ArrowUpRight size={17} />;
}

function ProjectCard({ item }) {
  const { language, t } = usePreferences();
  const title = localized(item.title, language);
  const description = localized(item.short_description || item.description, language);
  const technologies = Array.isArray(item.technologies) ? item.technologies : [];
  return (
    <motion.article className="card" whileHover={{ y: -5 }} transition={{ duration: .2 }}>
      <Link to={`/projects/${item.slug}`} aria-label={title}>
        {item.thumbnail_url ? <img className="project-image" src={item.thumbnail_url} alt={title} loading="lazy" /> : <div className="project-image placeholder-image">{title?.slice(0, 1) || t("projectPlaceholder")}</div>}
      </Link>
      <div className="card-body">
        <div className="eyebrow">{item.featured && <span className="tag">{t("featured")}</span>}{item.category || item.year || ""}</div>
        <h3><Link to={`/projects/${item.slug}`}>{title}</Link></h3>
        <p>{description}</p>
        <div className="tag-row">{technologies.slice(0, 5).map((technology) => <span className="tag" key={technology}>{technology}</span>)}</div>
        <div className="card-actions">
          <Link className="button button-quiet" to={`/projects/${item.slug}`}>{t("readMore")} <ArrowUpRight size={14} /></Link>
          {item.live_url && <a className="button button-primary" href={item.live_url} target="_blank" rel="noreferrer">{t("visit")} <ArrowUpRight size={14} /></a>}
          {item.github_url && <a className="button button-quiet" href={item.github_url} target="_blank" rel="noreferrer"><Github size={14} />{t("github")}</a>}
        </div>
      </div>
    </motion.article>
  );
}

function ProjectsSection() {
  const { t, language } = usePreferences();
  const [limit, setLimit] = useState(24);
  const { data, loading, error, retry } = usePublicTable("projects", { limit });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [technology, setTechnology] = useState("");
  const categories = [...new Set(data.map((project) => project.category).filter(Boolean))];
  const technologies = [...new Set(data.flatMap((project) => project.technologies || []))];
  const filtered = useMemo(() => data.filter((project) => {
    const haystack = [localized(project.title, language), localized(project.short_description || project.description, language), project.category, ...(project.technologies || [])].join(" ").toLowerCase();
    return haystack.includes(search.toLowerCase()) && (!category || project.category === category) && (!technology || (project.technologies || []).includes(technology));
  }), [data, search, category, technology, language]);
  return (
    <section className="section">
      <div className="shell">
        <SectionHeading eyebrow={t("work")} title={t("projectsTitle")} />
        <div className="filters">
          <label className="field search-field" style={{ display: "flex", alignItems: "center", gap: 9 }}><Search size={15} /><input aria-label={t("search")} className="field" style={{ padding: 0, border: 0 }} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("search")} /></label>
          <select className="select-field" style={{ width: "auto", minWidth: 130 }} value={category} onChange={(event) => setCategory(event.target.value)}><option value="">{t("all")}</option>{categories.map((value) => <option key={value}>{value}</option>)}</select>
          <select className="select-field" style={{ width: "auto", minWidth: 150 }} value={technology} onChange={(event) => setTechnology(event.target.value)}><option value="">{t("allTechnologies")}</option>{technologies.map((value) => <option key={value}>{value}</option>)}</select>
        </div>
        {error || loading ? <ContentState loading={loading} error={error} retry={retry} /> : filtered.length ? <><div className="grid-cards">{filtered.map((project) => <ProjectCard key={project.id} item={project} />)}</div>{data.length === limit && <div style={{ textAlign: "center", marginTop: 26 }}><button className="button" onClick={() => setLimit((current) => current + 24)}>{t("loadMore")}</button></div>}</> : <div className="empty-state">{data.length ? t("noResults") : t("empty")}</div>}
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title, description }) {
  return <div className="section-heading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>{description && <p className="section-intro">{description}</p>}</div>;
}

const homeSkills = [
  { name: "Python", level: 90, category: "Programming", icon: Code2 },
  { name: "PHP", level: 85, category: "Programming", icon: Braces },
  { name: "React JS", level: 80, category: "Frontend", icon: Atom },
  { name: "Tailwind CSS", level: 85, category: "Frontend", icon: Wind },
  { name: "Bootstrap", level: 80, category: "Frontend", icon: Braces },
  { name: "MySQL", level: 85, category: "Database", icon: Database },
  { name: "Flask", level: 75, category: "Backend", icon: FlaskConical },
  { name: "CodeIgniter", level: 80, category: "Backend", icon: Braces },
  { name: "Tableau", level: 85, category: "Data", icon: BarChart3 },
  { name: "Machine Learning", level: 75, category: "Data", icon: Brain },
  { name: "Data Analysis", level: 85, category: "Data", icon: BarChart3 },
  { name: "Google Apps Script", level: 80, category: "Tools", icon: Code2 },
];

function HomeSkillsSection() {
  const { t } = usePreferences();
  return <section className="section home-skills"><div className="shell">
    <SectionHeading eyebrow={t("technicalSkills")} title={t("skills")} />
    <div className="skill-grid">{homeSkills.map(({ name, level, category, icon: Icon }) =>
      <article className="skill-card" key={name}>
        <div className="skill-card-top"><span className="skill-icon"><Icon size={23} strokeWidth={2.3} /></span><strong>{level}%</strong></div>
        <h3>{name}</h3>
        <progress className="skill-progress" aria-label={`${name} ${t("proficiency")}`} value={level} max="100" />
        <span className="skill-category">{t(`skillCategory_${category}`)}</span>
      </article>,
    )}</div>
  </div></section>;
}

function CVDownloadButton() {
  const { language, t } = usePreferences();
  const { data, loading, error, retry } = usePublicTable("cv_settings", { limit: 1 });
  if (loading) return <span className="cv-loading" role="status">{t("loadingData")}</span>;
  if (error) return <span className="cv-error" role="status">{t("cvUnavailable")} <button className="button button-quiet" onClick={retry}>{t("retry")}</button></span>;
  const cv = data[0];
  if (!cv?.storage_path || !cv.button_enabled || !cv.is_active) return null;
  const fileUrl = requireSupabase().storage.from("portfolio-cv").getPublicUrl(cv.storage_path).data.publicUrl;
  const separator = fileUrl.includes("?") ? "&" : "?";
  const downloadUrl = `${fileUrl}${separator}download=${encodeURIComponent(cv.download_filename)}`;
  return <a className="button" href={downloadUrl}><ArrowDownToLine size={15} />{localized(cv.button_label, language, t("downloadCv"))}</a>;
}

function HomePage() {
  const { t, language } = usePreferences();
  const profile = usePublicTable("profiles", { limit: 1 });
  const social = usePublicTable("social_links");
  const projects = usePublicTable("projects", { limit: 3 });
  const person = profile.data[0] || {};
  const links = social.data || [];
  return (
    <>
      <main id="top" className="shell hero">
        <div>
          {localized(person.availability_text, language) && <span className="eyebrow"><i className="status-dot" />{localized(person.availability_text, language)}</span>}
          <h1>{localized(person.headline, language, person.full_name ? `${language === "id" ? "Halo, saya" : "Hi, I'm"} ${person.full_name}.` : t("profilePlaceholder"))}</h1>
          <p className="hero-copy">{localized(person.bio, language, localized(person.profession, language, language === "id" ? "Profil dan cerita Anda dapat dikelola dari dashboard admin." : "Manage your profile and story from the admin dashboard."))}</p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/projects">{t("viewProjects")} <ArrowUpRight size={16} /></Link>
            <CVDownloadButton />
            <Link className="button button-quiet" to="/contact">{t("contactMe")}</Link>
          </div>
          <div className="social-row">{links.map((item) => <a className="social-link" key={item.id} href={item.url} aria-label={item.platform} target="_blank" rel="noreferrer">{getSocialIcon(item.platform)}</a>)}{person.email && <a className="social-link" href={`mailto:${person.email}`} aria-label={t("email")}><Mail size={17} /></a>}</div>
        </div>
        <div className="portrait-wrap">
          <div className="portrait-orb">{person.avatar_url ? <img src={person.avatar_url} alt={person.full_name || t("profilePortrait")} fetchPriority="high" /> : <div className="portrait-placeholder">{person.full_name?.[0] || "P"}</div>}</div>
          {person.profession && <div className="float-card glass"><strong>{localized(person.profession, language)}</strong>{person.location || ""}</div>}
        </div>
      </main>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="shell">
          <SectionHeading eyebrow={t("portfolio")} title={t("projectsTitle")} />
          <ContentState loading={projects.loading} error={projects.error} retry={projects.retry} empty={!projects.data.length}>
            <div className="grid-cards">{projects.data.map((item) => <ProjectCard key={item.id} item={item} />)}</div>
            <div style={{ marginTop: 22 }}><Link className="button button-quiet" to="/projects">{t("readMore")} <ArrowUpRight size={14} /></Link></div>
          </ContentState>
        </div>
      </section>
      <HomeSkillsSection />
    </>
  );
}

function AboutPage() {
  const { language, t } = usePreferences();
  const profile = usePublicTable("profiles", { limit: 1 });
  const skills = usePublicTable("skills");
  const person = profile.data[0] || {};
  return <section className="section"><div className="shell">
    <SectionHeading eyebrow={t("navAbout")} title={localized(person.full_name, language, t("navAbout"))} description={localized(person.bio, language)} />
    <ContentState loading={profile.loading || skills.loading} error={profile.error || skills.error} retry={profile.retry}>
      <div className="contact-grid">
        <div className="card">{person.avatar_url ? <img className="project-image" src={person.avatar_url} alt={person.full_name || t("profilePortrait")} loading="lazy" /> : <div className="project-image placeholder-image">P</div>}<div className="card-body"><h3>{localized(person.profession, language, "—")}</h3><p>{[person.location, localized(person.education, language)].filter(Boolean).join(" · ")}</p></div></div>
        <div><p className="section-intro">{localized(person.bio, language, t("empty"))}</p><h3>{t("skills")}</h3><div className="tag-row">{skills.data.map((skill) => <span className="tag" key={skill.id}>{localized(skill.name, language)}{skill.category ? ` · ${skill.category}` : ""}</span>)}</div><div style={{ marginTop: 20 }}><CVDownloadButton /></div></div>
      </div>
    </ContentState>
  </div></section>;
}

export function EducationPage() {
  const { language, t } = usePreferences();
  const { sectionVisibility = {} } = useOutletContext() || {};
  const { data, loading, error, retry } = usePublicTable("educations");
  if (sectionVisibility.education === false) return null;
  return <section className="section"><div className="shell">
    <SectionHeading eyebrow={t("learning")} title={t("educationTitle")} />
    <ContentState loading={loading} error={error} retry={retry} empty={!data.length}>
      <div className="timeline education-timeline">{data.map((item) => <article className="timeline-item education-card" key={item.id}>
        <div className="education-header">
          {item.logo_url && <img className="education-logo" src={item.logo_url} alt="" loading="lazy" />}
          <div><h3>{item.institution}</h3><p className="education-qualification">{localized(item.degree, language)}{localized(item.field_of_study, language) ? ` · ${localized(item.field_of_study, language)}` : ""}</p></div>
          {item.is_current && <span className="tag education-current">{t("currentlyStudying")}</span>}
        </div>
        <div className="education-period">{item.start_date ? formatDate(item.start_date, language, { year: "numeric", month: "short" }) : ""} — {item.is_current ? t("current") : item.end_date ? formatDate(item.end_date, language, { year: "numeric", month: "short" }) : ""}{item.location && ` · ${item.location}`}</div>
        {item.grade && <p className="education-grade">{t("finalGrade")}: {item.grade}</p>}
        {localized(item.description, language) && <p className="education-description">{localized(item.description, language)}</p>}
        {Array.isArray(item.achievements) && item.achievements.length > 0 && <ul className="education-achievements">{item.achievements.map((achievement, index) => <li key={`${item.id}-achievement-${index}`}>{localized(achievement, language)}</li>)}</ul>}
      </article>)}</div>
    </ContentState>
  </div></section>;
}

function CertificatesPage() {
  const { language, t } = usePreferences();
  const { data, loading, error, retry } = usePublicTable("certificates");
  const [selected, setSelected] = useState(null);
  const [zoomed, setZoomed] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const categories = [...new Set(data.map((item) => item.category).filter(Boolean))];
  const filtered = data.filter((item) => `${localized(item.title, language)} ${item.issuer} ${item.category}`.toLowerCase().includes(search.toLowerCase()) && (!category || item.category === category));
  return <section className="section"><div className="shell">
    <SectionHeading eyebrow={t("credentials")} title={t("certificatesTitle")} />
    <div className="filters"><input className="field search-field" placeholder={t("search")} value={search} onChange={(event) => setSearch(event.target.value)} /><select className="select-field" style={{ width: "auto" }} value={category} onChange={(event) => setCategory(event.target.value)}><option value="">{t("all")}</option>{categories.map((value) => <option key={value}>{value}</option>)}</select></div>
    <ContentState loading={loading} error={error} retry={retry} empty={!filtered.length}>
      <div className="grid-cards">{filtered.map((item) => <article className="card" key={item.id}>
        {item.preview_url ? <button style={{ border: 0, padding: 0, width: "100%", background: "transparent", cursor: "zoom-in" }} onClick={() => { setZoomed(false); setSelected(item); }}><img className="certificate-image" src={item.preview_url} alt={localized(item.title, language)} loading="lazy" /></button> : <div className="certificate-image placeholder-image">{item.issuer || t("certificatePlaceholder")}</div>}
        <div className="card-body"><h3>{localized(item.title, language)}</h3><p>{item.issuer} {item.issue_date && `· ${formatDate(item.issue_date, language)}`}</p>{item.expiry_date && <p>{t("expires")}: {formatDate(item.expiry_date, language)}</p>}{item.credential_id && <p>{t("credentialId")}: {item.credential_id}</p>}<p>{localized(item.description, language)}</p><div className="card-actions">{item.verification_url && <a className="button button-quiet" href={item.verification_url} target="_blank" rel="noreferrer">{t("verify")} <ArrowUpRight size={14} /></a>}{item.pdf_url && <a className="button" href={item.pdf_url} target="_blank" rel="noreferrer" download><ArrowDownToLine size={14} />{t("download")}</a>}</div></div>
      </article>)}</div>
    </ContentState>
    {selected && <div role="dialog" aria-modal="true" className="modal-backdrop" onClick={() => setSelected(null)}><button className="icon-button modal-close" aria-label={t("closePreview")} onClick={() => setSelected(null)}>×</button><img className="modal-image" style={{ cursor: zoomed ? "zoom-out" : "zoom-in", transform: zoomed ? "scale(1.5)" : "scale(1)", transition: "transform .2s" }} src={selected.preview_url} alt={localized(selected.title, language)} onClick={(event) => { event.stopPropagation(); setZoomed(!zoomed); }} /></div>}
  </div></section>;
}

function ExperiencePage() {
  const { language, t } = usePreferences();
  const { data, loading, error, retry } = usePublicTable("experiences");
  return <section className="section"><div className="shell"><SectionHeading eyebrow={t("journey")} title={t("experienceTitle")} />
    <ContentState loading={loading} error={error} retry={retry} empty={!data.length}><div className="timeline">{data.map((item) => <article className="timeline-item" key={item.id}><span className="eyebrow">{formatDate(item.start_date, language)} — {item.is_current ? t("current") : formatDate(item.end_date, language)}</span><h3 style={{ margin: "9px 0 4px" }}>{localized(item.position, language)}</h3><p>{item.organization}{item.location ? ` · ${item.location}` : ""}</p><p>{localized(item.description, language)}</p>{Array.isArray(item.responsibilities) && item.responsibilities.length > 0 && <><h4>{t("responsibilitiesLabel")}</h4><ul className="muted">{item.responsibilities.map((responsibility) => <li key={responsibility}>{localized(responsibility, language)}</li>)}</ul></>}{Array.isArray(item.achievements) && item.achievements.length > 0 && <ul className="muted">{item.achievements.map((achievement) => <li key={achievement}>{localized(achievement, language)}</li>)}</ul>}</article>)}</div></ContentState>
  </div></section>;
}

function ServicesPage() {
  const { language, t } = usePreferences();
  const { data, loading, error, retry } = usePublicTable("services");
  const settings = usePublicTable("site_settings");
  const whatsapp = settings.data.find((item) => item.key === "whatsapp_number")?.value || "";
  const template = settings.data.find((item) => item.key === "whatsapp_template")?.value || (language === "id" ? "Halo, saya tertarik dengan layanan {service}." : "Hello, I'm interested in {service}.");
  function orderLink(service) {
    const number = String(whatsapp).replace(/\D/g, "");
    if (!/^\d{8,15}$/.test(number)) return null;
    return `https://wa.me/${number}?text=${encodeURIComponent(template.replace("{service}", localized(service.name, language)))}`;
  }
  return <section className="section"><div className="shell"><SectionHeading eyebrow={t("freelance")} title={t("servicesTitle")} />
    <ContentState loading={loading || settings.loading} error={error || settings.error} retry={retry} empty={!data.length}><div className="grid-cards">{data.map((service) => {
      const amount = (value) => Number(value || 0).toLocaleString(language === "id" ? "id-ID" : "en-US");
      const price = service.price_min == null ? t("contactMe") : service.price_fixed || service.price_max == null
        ? `${service.price_fixed ? "" : `${t("startingAt")} `}${amount(service.price_min)}`
        : `${amount(service.price_min)}–${amount(service.price_max)}`;
      return <article className="card card-body" key={service.id}><div className="eyebrow">{service.category}{service.featured && <span className="tag">{t("featured")}</span>}</div><h3 style={{ marginTop: 12 }}>{localized(service.name, language)}</h3><p>{localized(service.description, language)}</p><div className="service-price">{price}{service.price_min != null && ` ${service.currency || "IDR"}`}{!service.available && <span className="tag" style={{ marginLeft: 8 }}>{t("unavailable")}</span>}</div><p>{service.estimated_duration || ""}{service.revisions != null ? ` · ${service.revisions} ${t("revisionCount")}` : ""}{service.complexity ? ` · ${service.complexity}` : ""}</p><p>{localized(service.terms, language)}</p>{Array.isArray(service.features) && <div className="tag-row">{service.features.map((feature) => <span key={feature} className="tag">{localized(feature, language)}</span>)}</div>}<div className="card-actions">{service.available && orderLink(service) && <a className="button button-primary" href={orderLink(service)} target="_blank" rel="noreferrer">WhatsApp <ArrowUpRight size={14} /></a>}<Link className="button button-quiet" to="/contact">{t("contactMe")}</Link></div></article>;
    })}</div></ContentState>
  </div></section>;
}

function ContactPage() {
  const { language, t } = usePreferences();
  const profile = usePublicTable("profiles", { limit: 1 });
  const social = usePublicTable("social_links");
  const settings = usePublicTable("site_settings");
  const person = profile.data[0] || {};
  const whatsappValue = settings.data.find((item) => item.key === "whatsapp_number")?.value;
  const whatsappNumber = String(whatsappValue || person.phone || "").replace(/\D/g, "");
  const contactSocials = [...social.data];
  if (/^\d{8,15}$/.test(whatsappNumber) && !contactSocials.some((item) => item.platform?.toLowerCase().includes("whatsapp"))) {
    contactSocials.unshift({ id: "whatsapp-contact", platform: "WhatsApp", url: `https://wa.me/${whatsappNumber}` });
  }
  const [form, setForm] = useState({ name: "", email: "", message: "", website: "" });
  const [status, setStatus] = useState({ sending: false, message: "", error: false });
  async function submit(event) {
    event.preventDefault();
    if (!form.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) || !form.message.trim()) {
      setStatus({ sending: false, message: t("genericError"), error: true }); return;
    }
    setStatus({ sending: true, message: "", error: false });
    try {
      const { error } = await requireSupabase().functions.invoke("contact-submit", { body: { ...form, language } });
      if (error) throw error;
      setForm({ name: "", email: "", message: "", website: "" });
      setStatus({ sending: false, message: t("messageSent"), error: false });
    } catch (error) {
      console.error("Contact submission failed", error);
      setStatus({ sending: false, message: t("messageError"), error: true });
    }
  }
  return <section className="section"><div className="shell">
    <SectionHeading eyebrow={t("sayHello")} title={t("contactTitle")} description={t("contactIntro")} />
    <div className="contact-grid"><div className="contact-information">
      <div className="contact-details">
        {person.location && <div className="contact-detail"><MapPin size={17} /><div><span>{t("contactLocation")}</span><strong>{person.location}</strong></div></div>}
        {person.phone && <a className="contact-detail" href={`tel:${person.phone.replace(/[^\d+]/g, "")}`}><Phone size={17} /><div><span>{t("phone")}</span><strong>{person.phone}</strong></div></a>}
        {person.email && <a className="contact-detail" href={`mailto:${person.email}`}><Mail size={17} /><div><span>{t("email")}</span><strong>{person.email}</strong></div></a>}
      </div>
      {contactSocials.length > 0 && <div className="contact-socials">
        <h3>{t("connectOnSocial")}</h3>
        <div className="contact-social-links">{contactSocials.map((item) => <a key={item.id} className="contact-social-link" aria-label={item.platform} href={item.url} target="_blank" rel="noopener noreferrer">{getSocialIcon(item.platform)}<span>{item.platform}</span><ArrowUpRight size={13} /></a>)}</div>
      </div>}
      {settings.loading && <p className="muted">{t("loadingData")}</p>}
    </div>
      <form className="form-stack" onSubmit={submit} noValidate>
        <input className="field" required maxLength={100} placeholder={t("name")} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <input className="field" required type="email" maxLength={254} placeholder={t("email")} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <textarea className="textarea-field" required rows="5" maxLength={5000} placeholder={t("message")} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} />
        <label className="honeypot" aria-hidden="true">Website<input tabIndex="-1" autoComplete="off" value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} /></label>
        <div><button className="button button-primary" disabled={status.sending}>{status.sending ? t("sending") : t("send")}</button>{status.message && <p role="status" className="muted" style={{ marginTop: 12 }}>{status.message}</p>}</div>
      </form>
    </div>
  </div></section>;
}

export function PublicPage({ section }) {
  const { sectionVisibility = {} } = useOutletContext() || {};
  if (sectionVisibility[section] === false) return null;
  if (section === "home") return <HomePage />;
  if (section === "about") return <AboutPage />;
  if (section === "projects") return <ProjectsSection />;
  if (section === "certificates") return <CertificatesPage />;
  if (section === "experience") return <ExperiencePage />;
  if (section === "services") return <ServicesPage />;
  if (section === "contact") return <ContactPage />;
  return null;
}

export function ProjectDetailPage() {
  const { slug } = useParams();
  const { sectionVisibility = {} } = useOutletContext() || {};
  const { language, t } = usePreferences();
  const [state, setState] = useState({ item: null, loading: true, error: null, attempt: 0 });
  useEffect(() => {
    let active = true;
    requireSupabase().from("projects").select("*").eq("slug", slug).eq("published", true).maybeSingle().then(({ data, error }) => {
      if (error) throw error;
      if (active) setState((current) => ({ ...current, item: data, loading: false }));
    }).catch((error) => { console.error("Unable to load project detail", error); if (active) setState((current) => ({ ...current, loading: false, error })); });
    return () => { active = false; };
  }, [slug, state.attempt]);
  if (sectionVisibility.projects === false) return null;
  if (state.loading) return <div className="shell section"><div className="empty-state">{t("loadingData")}</div></div>;
  if (state.error) return <div className="shell section"><div className="error-state"><p>{t("errorTitle")}</p><button className="button" onClick={() => setState((current) => ({ ...current, attempt: current.attempt + 1, loading: true }))}>{t("retry")}</button></div></div>;
  if (!state.item) return <div className="shell section"><div className="empty-state">{t("empty")}</div></div>;
  const item = state.item;
  return <main className="shell detail-layout"><article>
    <span className="eyebrow">{item.category || item.year || t("projectPlaceholder")}</span><h1>{localized(item.title, language)}</h1>
    {item.thumbnail_url && <img src={item.thumbnail_url} alt={localized(item.title, language)} />}
    {Array.isArray(item.gallery_urls) && item.gallery_urls.map((url) => <img key={url} src={url} alt="" loading="lazy" style={{ marginTop: 18 }} />)}
    <p className="section-intro" style={{ marginTop: 22 }}>{localized(item.description, language)}</p>
    <div className="tag-row">{(item.technologies || []).map((technology) => <span className="tag" key={technology}>{technology}</span>)}</div>
    <div className="card-actions">{item.live_url && <a className="button button-primary" href={item.live_url} target="_blank" rel="noreferrer">{t("visit")} <ArrowUpRight size={14} /></a>}{item.github_url && <a className="button" href={item.github_url} target="_blank" rel="noreferrer"><Github size={14} />{t("github")}</a>}</div>
  </article><aside><h3>{localized(item.title, language)}</h3><p>{item.year || ""}</p><p>{item.status || ""}</p></aside></main>;
}
