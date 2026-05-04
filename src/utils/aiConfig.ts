export type AIProvider = 'openai' | 'google' | 'anthropic' | 'mistral';
export type AIServiceProvider = 'chatgpt' | 'gemini' | 'claude' | 'mistral' | 'mock';

export const AI_PROVIDER_MAP: Record<string, AIServiceProvider> = {
  'openai': 'chatgpt',
  'google': 'gemini',
  'anthropic': 'claude',
  'mistral': 'mistral',
  'default': 'mock'
};

// OpenAI models — current as of May 2026
export const OPENAI_MODELS: { value: string; label: string; description: string }[] = [
  { value: 'gpt-4.1',        label: 'GPT-4.1 (Recommandé)',         description: 'Le plus capable, contexte 1M tokens' },
  { value: 'gpt-4.1-mini',   label: 'GPT-4.1 Mini (Économique)',    description: 'Rapide et performant, coût réduit' },
  { value: 'gpt-4o',         label: 'GPT-4o',                       description: 'Multimodal, très performant' },
  { value: 'gpt-4o-mini',    label: 'GPT-4o Mini',                  description: 'Léger et économique' },
  { value: 'o3',             label: 'o3 (Raisonnement)',             description: 'Raisonnement avancé, tâches complexes' },
  { value: 'o4-mini',        label: 'o4-mini (Raisonnement rapide)', description: 'Raisonnement efficace, coût optimisé' },
];

// Anthropic Claude models — current as of May 2026
export const ANTHROPIC_MODELS: { value: string; label: string; description: string }[] = [
  { value: 'claude-opus-4-5',   label: 'Claude Opus 4.5 (Le plus puissant)', description: 'Intelligence maximale, analyses complexes' },
  { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5 (Recommandé)',      description: 'Équilibre performance / coût optimal' },
  { value: 'claude-haiku-3-5',  label: 'Claude Haiku 3.5 (Rapide)',           description: 'Réponses rapides, coût minimal' },
];

// Google Gemini models — current as of May 2026
export const GOOGLE_MODELS: { value: string; label: string; description: string }[] = [
  { value: 'gemini-2.5-pro-preview-05-06',    label: 'Gemini 2.5 Pro (Recommandé)',   description: 'Raisonnement avancé, multimodal, contexte 1M' },
  { value: 'gemini-2.5-flash-preview-05-20',  label: 'Gemini 2.5 Flash',              description: 'Rapide et économique, pensée adaptative' },
  { value: 'gemini-2.0-flash',                label: 'Gemini 2.0 Flash',              description: 'Stable, performant, production' },
  { value: 'gemini-1.5-pro',                  label: 'Gemini 1.5 Pro',                description: 'Contexte 2M tokens, stable' },
  { value: 'gemini-1.5-flash',                label: 'Gemini 1.5 Flash',              description: 'Léger et rapide' },
];

// Mistral models — current as of May 2026
export const MISTRAL_MODELS: { value: string; label: string; description: string }[] = [
  { value: 'mistral-large-latest',   label: 'Mistral Large (Recommandé)', description: 'Le plus capable de Mistral' },
  { value: 'mistral-medium-latest',  label: 'Mistral Medium',             description: 'Bon équilibre performance / coût' },
  { value: 'mistral-small-latest',   label: 'Mistral Small',              description: 'Rapide et économique' },
  { value: 'open-mistral-nemo',      label: 'Mistral Nemo',               description: 'Open-source, contexte 128k' },
  { value: 'codestral-latest',       label: 'Codestral',                  description: 'Spécialisé code et analyse technique' },
];

export const OPENAI_MODEL_MAP: Record<string, string> = OPENAI_MODELS.reduce(
  (acc, m) => ({ ...acc, [m.value]: m.value }),
  {}
);

export const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini';
export const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-5';
export const DEFAULT_GOOGLE_MODEL = 'gemini-2.5-flash-preview-05-20';
export const DEFAULT_MISTRAL_MODEL = 'mistral-large-latest';

export const getAIServiceProvider = (provider: string): AIServiceProvider => {
  return AI_PROVIDER_MAP[provider] || AI_PROVIDER_MAP['default'];
};

export const getOpenAIModel = (configuredModel: string): string => {
  return OPENAI_MODEL_MAP[configuredModel] || DEFAULT_OPENAI_MODEL;
};

export const getScoreComment = (score: number, maxScore: number, _criterionName: string): string => {
  const percentage = (score / maxScore) * 100;
  if (percentage >= 75) {
    return `Score élevé (${score}/${maxScore}) - Le projet répond excellemment à ce critère.`;
  } else if (percentage >= 50) {
    return `Score moyen (${score}/${maxScore}) - Le projet répond partiellement à ce critère avec des améliorations possibles.`;
  } else {
    return `Score faible (${score}/${maxScore}) - Le projet présente des lacunes importantes sur ce critère.`;
  }
};
