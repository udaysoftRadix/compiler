export interface OpenRouterModel {
  model: string;
  supportsVision: boolean;
}

// Tried in order; a model is skipped and the next one attempted whenever a
// request fails (rate-limited, unavailable, non-2xx, etc.) so the feature
// keeps working even when a given free model is temporarily overloaded.
export const OPENROUTER_FALLBACK_MODELS: OpenRouterModel[] = [
  { model: 'inclusionai/ling-3.0-flash-sante:free', supportsVision: false },
  { model: 'nvidia/nemotron-3-super-120b-a12b:free', supportsVision: false },
  { model: 'nvidia/nemotron-3-ultra-550b-a55b:free', supportsVision: false },
  { model: 'nvidia/nemotron-3.5-lightning:free', supportsVision: false },
  { model: 'google/gemma-4-31b-it:free', supportsVision: true },
  { model: 'google/gemma-4-26b-a4b-it:free', supportsVision: true },
  { model: 'inclusionai/ling-3.0-flash-vl:free', supportsVision: true },
  { model: 'dots-studio/dots-3-note-preview:free', supportsVision: true },
  { model: 'thinkingmachines/inkling:free', supportsVision: true },
  { model: 'thinkingmachines/inkling-small:free', supportsVision: true },
  { model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', supportsVision: true },
  { model: 'liquid/lfm-2.5-2.6b:free', supportsVision: false },
];
