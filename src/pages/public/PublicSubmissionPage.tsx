import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProgramStore } from '../../stores/programStore';
import { useFormTemplateStore } from '../../stores/formTemplateStore';
import { useProjectStore } from '../../stores/projectStore';
import { useAuthStore } from '../../stores/authStore';
import { useActivitySectorStore } from '../../stores/activitySectorStore';
import { supabase } from '../../services/supabaseService';
import Button from '../../components/ui/Button';
import {
  FileText,
  Send,
  CheckCircle,
  AlertCircle,
  User,
  Mail,
  Lock,
  Building,
  FolderOpen,
  Phone,
  Calendar,
  Briefcase,
  ChevronRight,
  Upload,
  Info
} from 'lucide-react';
import CurrencyInput from '../../components/ui/CurrencyInput';
import espLogoImage from '../../assets/Logo_senegal-ucad.png';
import { uploadFile, UploadedFile } from '../../utils/fileUpload';

/* ─── Shared input class ─────────────────────────────────────────────────── */
const inputBase =
  'block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm placeholder-gray-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20';
const inputError = 'border-error-400 focus:border-error-500 focus:ring-error-500/20';

/* ─── Section header ─────────────────────────────────────────────────────── */
const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; subtitle?: string; index: number }> = ({
  icon, title, subtitle, index
}) => (
  <div className="flex items-start gap-4 mb-6 pb-5 border-b border-gray-100">
    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-700 flex items-center justify-center shadow-sm">
      <span className="text-white">{icon}</span>
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-primary-600 uppercase tracking-widest">Section {index}</span>
      </div>
      <h2 className="text-base font-semibold text-gray-900 mt-0.5">{title}</h2>
      {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

/* ─── Form field wrapper ─────────────────────────────────────────────────── */
const Field: React.FC<{ label: string; required?: boolean; error?: string; helper?: string; children: React.ReactNode }> = ({
  label, required, error, helper, children
}) => (
  <div className="space-y-1.5">
    <label className="block text-sm font-medium text-gray-700">
      {label}
      {required && <span className="text-error-500 ml-1">*</span>}
    </label>
    {children}
    {error && (
      <p className="flex items-center gap-1 text-xs text-error-600">
        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
        {error}
      </p>
    )}
    {!error && helper && (
      <p className="flex items-start gap-1 text-xs text-gray-500">
        <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
        {helper}
      </p>
    )}
  </div>
);

/* ─── Template section divider ───────────────────────────────────────────── */
const TemplateSectionDivider: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center gap-3 py-2 mt-4 mb-2">
    <div className="h-px flex-1 bg-primary-100" />
    <span className="text-xs font-semibold text-primary-700 uppercase tracking-wider px-2 bg-primary-50 rounded-full py-1">
      {label}
    </span>
    <div className="h-px flex-1 bg-primary-100" />
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════ */

const PublicSubmissionPage: React.FC = () => {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();

  const { programs, fetchPrograms } = useProgramStore();
  const { templates, fetchTemplates } = useFormTemplateStore();
  const { addProject } = useProjectStore();
  const { register, login } = useAuthStore();
  const { sectors, fetchSectors, isLoading: sectorsLoading } = useActivitySectorStore();

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [submitterInfo, setSubmitterInfo] = useState({
    projectName: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    organization: ''
  });

  const [projectInfo, setProjectInfo] = useState({
    description: '',
    ageMonths: '',
    activitySectorId: ''
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchPrograms();
        await fetchTemplates();
        await fetchSectors();
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, []);

  const program = programs.find(p => p.id === programId);
  const template = program?.formTemplateId
    ? templates.find(t => t.id === program.formTemplateId)
    : null;

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmitterInfoChange = (field: string, value: string) => {
    setSubmitterInfo(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => { const e = { ...prev }; delete e[field]; return e; });
    }
  };

  const handleProjectInfoChange = (field: string, value: string) => {
    setProjectInfo(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => { const e = { ...prev }; delete e[field]; return e; });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!submitterInfo.projectName.trim()) newErrors.projectName = 'Le nom du projet est requis';
    if (!submitterInfo.name.trim()) newErrors.name = 'Le nom complet est requis';
    if (!submitterInfo.email.trim()) newErrors.email = "L'email est requis";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitterInfo.email)) newErrors.email = 'Email invalide';
    if (!submitterInfo.password) newErrors.password = 'Le mot de passe est requis';
    else if (submitterInfo.password.length < 6) newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    if (submitterInfo.password !== submitterInfo.confirmPassword) newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    if (!projectInfo.description.trim()) newErrors.description = 'La description du projet est requise';
    if (!projectInfo.activitySectorId) newErrors.activitySectorId = "Le secteur d'activité est requis";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!program) return;
    if (!validateForm()) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }

    setIsSubmitting(true);
    try {
      const cleanEmail = submitterInfo.email.trim().toLowerCase();
      const registered = await register(submitterInfo.name.trim(), cleanEmail, submitterInfo.password, 'submitter', submitterInfo.organization.trim());
      if (!registered) {
        const loggedIn = await login(cleanEmail, submitterInfo.password);
        if (!loggedIn) throw new Error('Impossible de créer ou connecter le compte. Vérifiez votre mot de passe.');
      }

      let sessionUserId: string | undefined;
      if (supabase) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const { data: { session } } = await supabase.auth.getSession();
        sessionUserId = session?.user?.id;
        if (!session) throw new Error("La session n'a pas pu être établie. Veuillez réessayer.");
      }

      const { user: authUser } = useAuthStore.getState();
      const submitterId = authUser?.id;
      if (!submitterId) throw new Error("Impossible d'identifier l'utilisateur");

      const fileStorageFolder = sessionUserId || submitterId;
      const finalFormData = { ...formData };

      for (const [fieldId, file] of Object.entries(pendingFiles)) {
        try {
          const uploadedFile = await uploadFile(fileStorageFolder, file);
          finalFormData[fieldId] = uploadedFile;
        } catch {
          throw new Error(`Erreur lors de l'upload du fichier: ${file.name}`);
        }
      }

      await addProject({
        title: submitterInfo.projectName,
        description: formData.description || formData.probleme || 'Description du projet',
        status: 'submitted',
        budget: 0,
        timeline: '12 mois',
        submitterId,
        submitterName: submitterInfo.name,
        submitterEmail: cleanEmail,
        programId: program.id,
        submissionDate: new Date(),
        tags: [],
        formData: finalFormData,
        submittedAt: new Date(),
        projectDescription: projectInfo.description,
        projectAgeMonths: projectInfo.ageMonths ? parseInt(projectInfo.ageMonths) : undefined,
        activitySectorId: projectInfo.activitySectorId || undefined,
        submitterPhone: submitterInfo.phone || undefined
      });

      setSubmitSuccess(true);
    } catch (error) {
      console.error('Error submitting project:', error);
      if (error instanceof Error) {
        if (error.message.includes('Invalid login credentials')) {
          alert('Ce compte existe déjà mais le mot de passe est incorrect. Veuillez réessayer avec le bon mot de passe.');
        } else if (error.message.includes('invalid format') || error.message.includes('validate email')) {
          alert("Le format de l'email est invalide. Veuillez vérifier l'adresse email saisie.");
        } else {
          alert(`Erreur lors de la soumission: ${error.message}`);
        }
      } else {
        alert('Erreur lors de la soumission du projet. Veuillez réessayer.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Loading ── */
  if (!program) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-secondary-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-4">
            <div className="h-8 w-8 border-[3px] border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">Chargement en cours</h3>
          <p className="text-sm text-gray-500">Récupération des informations du programme…</p>
        </div>
      </div>
    );
  }

  if (programs.length > 0 && !programs.find(p => p.id === programId)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-secondary-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-amber-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">Programme introuvable</h3>
          <p className="text-sm text-gray-500">Le programme demandé n'existe pas ou n'est plus disponible.</p>
        </div>
      </div>
    );
  }

  /* ── Success ── */
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-secondary-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-md w-full">
          <div className="h-2 bg-gradient-to-r from-primary-700 via-primary-600 to-secondary-500" />
          <div className="p-10 text-center">
            <div className="w-20 h-20 rounded-full bg-accent-50 border-4 border-accent-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-accent-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Projet soumis avec succès</h2>
            <p className="text-sm text-gray-600 mb-1">
              Votre projet <strong className="text-gray-800">{submitterInfo.projectName}</strong> a été soumis au programme
            </p>
            <p className="text-sm font-semibold text-primary-700 mb-6">{program.name}</p>
            <div className="bg-primary-50 rounded-xl p-4 mb-6 text-left space-y-2">
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle className="h-4 w-4 text-accent-500 flex-shrink-0 mt-0.5" />
                <span>Compte créé ou connecté avec l'email <strong>{submitterInfo.email}</strong></span>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle className="h-4 w-4 text-accent-500 flex-shrink-0 mt-0.5" />
                <span>Vous recevrez une notification concernant l'état de votre candidature</span>
              </div>
            </div>
            <Button onClick={() => navigate('/')} variant="primary" className="w-full">
              Retour à l'accueil
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Determine deadline display ── */
  const deadline = program.endDate
    ? new Date(program.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const budgetDisplay = program.budget
    ? new Intl.NumberFormat('fr-FR').format(program.budget) + (program.currency === 'XOF' ? ' FCFA' : ` ${program.currency}`)
    : null;

  /* ─────────────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Top banner ── */}
      <div className="bg-gradient-to-r from-primary-800 via-primary-700 to-secondary-600 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="flex items-center gap-4">
              <img src={espLogoImage} alt="ESP – UCAD" className="h-14 w-auto drop-shadow-md" />
            </div>
            <div className="text-center sm:text-left sm:ml-2">
              <p className="text-secondary-300 text-xs font-semibold uppercase tracking-widest mb-0.5">
                École Supérieure Polytechnique – UCAD
              </p>
              <h1 className="text-white text-lg sm:text-xl font-bold leading-tight">
                {program.name}
              </h1>
              {program.description && (
                <p className="text-primary-200 text-sm mt-1 line-clamp-2 max-w-xl">
                  {program.description}
                </p>
              )}
            </div>
          </div>

          {/* Meta pills */}
          {(deadline || budgetDisplay) && (
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-white/10">
              {deadline && (
                <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full border border-white/20">
                  <Calendar className="h-3.5 w-3.5 text-secondary-300" />
                  Date limite : {deadline}
                </span>
              )}
              {budgetDisplay && (
                <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full border border-white/20">
                  <Briefcase className="h-3.5 w-3.5 text-secondary-300" />
                  Budget max : {budgetDisplay}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Breadcrumb ── */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-1.5 text-xs text-gray-500">
          <span>Accueil</span>
          <ChevronRight className="h-3 w-3" />
          <span>Programmes</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-primary-700 font-medium truncate">{program.name}</span>
        </div>
      </div>

      {/* ── Form ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>

          {/* ── Section 1: Informations du candidat ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 pt-6 pb-0">
              <SectionHeader
                icon={<User className="h-5 w-5" />}
                title="Vos Informations"
                subtitle="Un compte sera créé automatiquement pour suivre votre candidature."
                index={1}
              />
            </div>
            <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <Field label="Nom complet" required error={errors.name}>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={submitterInfo.name}
                      onChange={e => handleSubmitterInfoChange('name', e.target.value)}
                      placeholder="Prénom Nom"
                      className={`${inputBase} pl-10 ${errors.name ? inputError : ''}`}
                    />
                  </div>
                </Field>
              </div>

              <Field label="Adresse e-mail" required error={errors.email}>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    type="email"
                    value={submitterInfo.email}
                    onChange={e => handleSubmitterInfoChange('email', e.target.value)}
                    placeholder="prenom.nom@exemple.com"
                    className={`${inputBase} pl-10 ${errors.email ? inputError : ''}`}
                  />
                </div>
              </Field>

              <Field label="Téléphone">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    type="tel"
                    value={submitterInfo.phone}
                    onChange={e => handleSubmitterInfoChange('phone', e.target.value)}
                    placeholder="+221 77 000 00 00"
                    className={`${inputBase} pl-10`}
                  />
                </div>
              </Field>

              <div className="sm:col-span-2">
                <Field label="Organisation / Établissement">
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={submitterInfo.organization}
                      onChange={e => handleSubmitterInfoChange('organization', e.target.value)}
                      placeholder="ESP – UCAD (optionnel)"
                      className={`${inputBase} pl-10`}
                    />
                  </div>
                </Field>
              </div>

              <Field label="Mot de passe" required error={errors.password} helper="Minimum 6 caractères">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    type="password"
                    value={submitterInfo.password}
                    onChange={e => handleSubmitterInfoChange('password', e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                    className={`${inputBase} pl-10 ${errors.password ? inputError : ''}`}
                  />
                </div>
              </Field>

              <Field label="Confirmer le mot de passe" required error={errors.confirmPassword}>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    type="password"
                    value={submitterInfo.confirmPassword}
                    onChange={e => handleSubmitterInfoChange('confirmPassword', e.target.value)}
                    placeholder="••••••••"
                    className={`${inputBase} pl-10 ${errors.confirmPassword ? inputError : ''}`}
                  />
                </div>
              </Field>
            </div>
          </div>

          {/* ── Section 2: Votre Projet ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 pt-6 pb-0">
              <SectionHeader
                icon={<FolderOpen className="h-5 w-5" />}
                title="Votre Projet"
                subtitle="Informations générales sur votre projet de candidature."
                index={2}
              />
            </div>
            <div className="px-6 pb-6 space-y-5">
              <Field label="Titre du projet" required error={errors.projectName}>
                <input
                  type="text"
                  value={submitterInfo.projectName}
                  onChange={e => handleSubmitterInfoChange('projectName', e.target.value)}
                  placeholder="Titre complet du projet"
                  className={`${inputBase} ${errors.projectName ? inputError : ''}`}
                />
              </Field>

              <Field label="Description du projet" required error={errors.description}>
                <textarea
                  value={projectInfo.description}
                  onChange={e => handleProjectInfoChange('description', e.target.value)}
                  rows={4}
                  placeholder="Décrivez votre projet : objectifs, activités principales, impact attendu…"
                  className={`${inputBase} resize-none ${errors.description ? inputError : ''}`}
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Secteur d'activité" required error={errors.activitySectorId}>
                  {sectorsLoading ? (
                    <div className={`${inputBase} flex items-center gap-2 text-gray-400`}>
                      <div className="h-4 w-4 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin" />
                      Chargement des secteurs…
                    </div>
                  ) : sectors.filter(s => s.isActive).length === 0 ? (
                    <div className="block w-full rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-700">
                      Aucun secteur disponible
                    </div>
                  ) : (
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      <select
                        value={projectInfo.activitySectorId}
                        onChange={e => handleProjectInfoChange('activitySectorId', e.target.value)}
                        className={`${inputBase} pl-10 appearance-none ${errors.activitySectorId ? inputError : ''}`}
                      >
                        <option value="">Sélectionnez un secteur</option>
                        {sectors.filter(s => s.isActive).map(sector => (
                          <option key={sector.id} value={sector.id}>{sector.name}</option>
                        ))}
                      </select>
                      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none rotate-90" />
                    </div>
                  )}
                </Field>

                <Field label="Durée d'existence (mois)" helper="Depuis combien de mois existe votre projet ?">
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      type="number"
                      min="0"
                      max="600"
                      value={projectInfo.ageMonths}
                      onChange={e => handleProjectInfoChange('ageMonths', e.target.value)}
                      placeholder="Ex : 12"
                      className={`${inputBase} pl-10`}
                    />
                  </div>
                </Field>
              </div>
            </div>
          </div>

          {/* ── Section 3: Formulaire de candidature ── */}
          {template && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 pt-6 pb-0">
                <SectionHeader
                  icon={<FileText className="h-5 w-5" />}
                  title="Formulaire de Candidature"
                  subtitle={template.name}
                  index={3}
                />
              </div>
              <div className="px-6 pb-6 space-y-5">
                {template.fields.map((field) => {
                  /* Section dividers */
                  if (field.type === 'section') {
                    return <TemplateSectionDivider key={field.id} label={field.label} />;
                  }

                  return (
                    <Field
                      key={field.id}
                      label={field.label}
                      required={field.required}
                      helper={field.helperText}
                    >
                      {field.type === 'text' && (
                        <input
                          type="text"
                          required={field.required}
                          value={formData[field.id] || ''}
                          onChange={e => handleFieldChange(field.id, e.target.value)}
                          placeholder={field.placeholder}
                          className={inputBase}
                        />
                      )}

                      {field.type === 'email' && (
                        <input
                          type="email"
                          required={field.required}
                          value={formData[field.id] || ''}
                          onChange={e => handleFieldChange(field.id, e.target.value)}
                          placeholder={field.placeholder}
                          className={inputBase}
                        />
                      )}

                      {field.type === 'number' && (
                        <input
                          type="number"
                          required={field.required}
                          value={formData[field.id] || ''}
                          onChange={e => handleFieldChange(field.id, e.target.value)}
                          placeholder={field.placeholder}
                          min={field.minValue}
                          max={field.maxValue}
                          className={inputBase}
                        />
                      )}

                      {field.type === 'currency' && (
                        <CurrencyInput
                          id={field.id}
                          name={field.id}
                          value={formData[field.id] || 0}
                          onChange={val => handleFieldChange(field.id, val)}
                          currencySymbol={
                            field.currencyCode === 'EUR' ? '€' :
                            field.currencyCode === 'USD' ? '$' :
                            field.currencyCode === 'GBP' ? '£' :
                            field.currencyCode === 'CHF' ? 'CHF' :
                            field.currencyCode === 'CAD' ? 'C$' :
                            field.currencyCode === 'JPY' ? '¥' :
                            field.currencyCode === 'CNY' ? '¥' :
                            'FCFA'
                          }
                          placeholder={field.placeholder || '0'}
                          required={field.required}
                        />
                      )}

                      {field.type === 'textarea' && (
                        <textarea
                          required={field.required}
                          value={formData[field.id] || ''}
                          onChange={e => handleFieldChange(field.id, e.target.value)}
                          placeholder={field.placeholder}
                          rows={4}
                          className={`${inputBase} resize-none`}
                        />
                      )}

                      {field.type === 'select' && field.options && (
                        <div className="relative">
                          <select
                            required={field.required}
                            value={formData[field.id] || ''}
                            onChange={e => handleFieldChange(field.id, e.target.value)}
                            className={`${inputBase} appearance-none`}
                          >
                            <option value="">Sélectionnez une option</option>
                            {field.options.map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                          <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none rotate-90" />
                        </div>
                      )}

                      {field.type === 'radio' && field.options && (
                        <div className="space-y-2.5 pt-1">
                          {field.options.map(option => (
                            <label key={option} className="flex items-center gap-3 cursor-pointer group">
                              <div className="relative">
                                <input
                                  type="radio"
                                  name={field.id}
                                  value={option}
                                  checked={formData[field.id] === option}
                                  onChange={e => handleFieldChange(field.id, e.target.value)}
                                  required={field.required}
                                  className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                                />
                              </div>
                              <span className="text-sm text-gray-700 group-hover:text-gray-900">{option}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {field.type === 'multiple_select' && field.options && (
                        <div className="space-y-2.5 pt-1">
                          {field.options.map(option => (
                            <label key={option} className="flex items-center gap-3 cursor-pointer group">
                              <input
                                type="checkbox"
                                value={option}
                                checked={(formData[field.id] || []).includes(option)}
                                onChange={e => {
                                  const current = formData[field.id] || [];
                                  handleFieldChange(field.id, e.target.checked
                                    ? [...current, option]
                                    : current.filter((v: string) => v !== option));
                                }}
                                className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                              />
                              <span className="text-sm text-gray-700 group-hover:text-gray-900">{option}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {field.type === 'checkbox_group' && field.options && (
                        <div className="space-y-2.5 pt-1">
                          {field.options.map(option => (
                            <label key={option} className="flex items-center gap-3 cursor-pointer group">
                              <input
                                type="checkbox"
                                value={option}
                                checked={(formData[field.id] || []).includes(option)}
                                onChange={e => {
                                  const current = formData[field.id] || [];
                                  handleFieldChange(field.id, e.target.checked
                                    ? [...current, option]
                                    : current.filter((v: string) => v !== option));
                                }}
                                className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                              />
                              <span className="text-sm text-gray-700 group-hover:text-gray-900">{option}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {field.type === 'checkbox' && (
                        <label className="flex items-center gap-3 cursor-pointer group pt-1">
                          <input
                            type="checkbox"
                            checked={formData[field.id] || false}
                            onChange={e => handleFieldChange(field.id, e.target.checked)}
                            className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700 group-hover:text-gray-900">
                            {field.placeholder || field.label}
                          </span>
                        </label>
                      )}

                      {field.type === 'date' && (
                        <input
                          type="date"
                          required={field.required}
                          value={formData[field.id] || ''}
                          onChange={e => handleFieldChange(field.id, e.target.value)}
                          className={inputBase}
                        />
                      )}

                      {field.type === 'file' && (
                        <div>
                          <label className={`
                            flex items-center gap-3 w-full rounded-lg border-2 border-dashed px-4 py-3 cursor-pointer transition-colors
                            ${pendingFiles[field.id]
                              ? 'border-accent-400 bg-accent-50'
                              : 'border-gray-300 bg-gray-50 hover:border-primary-400 hover:bg-primary-50/40'}
                          `}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${pendingFiles[field.id] ? 'bg-accent-100' : 'bg-white border border-gray-200'}`}>
                              {pendingFiles[field.id]
                                ? <CheckCircle className="h-4 w-4 text-accent-600" />
                                : <Upload className="h-4 w-4 text-gray-400" />
                              }
                            </div>
                            <div className="min-w-0 flex-1">
                              {pendingFiles[field.id] ? (
                                <p className="text-sm font-medium text-accent-700 truncate">{pendingFiles[field.id].name}</p>
                              ) : (
                                <>
                                  <p className="text-sm font-medium text-gray-700">Cliquer pour choisir un fichier</p>
                                  {(field as any).accept && (
                                    <p className="text-xs text-gray-400 mt-0.5">
                                      Formats : {(field as any).accept} – Max {((field as any).maxSize || 10485760) / 1048576} Mo
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                            <input
                              type="file"
                              required={field.required && !pendingFiles[field.id]}
                              accept={(field as any).accept}
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setPendingFiles(prev => ({ ...prev, [field.id]: file }));
                                  handleFieldChange(field.id, file.name);
                                }
                              }}
                              className="sr-only"
                            />
                          </label>
                        </div>
                      )}
                    </Field>
                  );
                })}
              </div>
            </div>
          )}

          {!template && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
              <AlertCircle className="h-10 w-10 text-amber-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600">Aucun formulaire n'est associé à ce programme pour le moment.</p>
            </div>
          )}

          {/* ── Submit ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-gray-500 text-center sm:text-left">
                En soumettant ce formulaire, un compte sera créé ou connecté pour vous permettre de suivre votre candidature.
              </p>
              <Button
                type="submit"
                isLoading={isSubmitting}
                leftIcon={<Send className="h-4 w-4" />}
                size="lg"
                variant="primary"
                className="flex-shrink-0 px-8"
              >
                {isSubmitting ? 'Soumission en cours…' : 'Soumettre le Projet'}
              </Button>
            </div>
          </div>

        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <img src={espLogoImage} alt="ESP – UCAD" className="h-8 w-auto opacity-60" />
          </div>
          <p className="text-xs text-gray-400">
            École Supérieure Polytechnique – Université Cheikh Anta Diop de Dakar
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Plateforme R&D Impulse — Pour toute question : <a href="mailto:recherche@esp.sn" className="text-primary-600 hover:text-primary-700">recherche@esp.sn</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicSubmissionPage;
