import { createContext, useContext, useMemo, useState } from 'react';
import type {
  BuilderAutosaveState,
  BuilderState,
  BuilderStepKey,
  BuilderEntityType,
} from '@/types/builder';
import { LANGUAGES, type LangCode } from '@/types/builder';

type BuilderUpdate =
  | BuilderState
  | ((previous: BuilderState) => BuilderState);

interface BuilderContextValue {
  state: BuilderState;
  updateState: (update: BuilderUpdate) => void;
  activeStep: BuilderStepKey;
  setActiveStep: (step: BuilderStepKey) => void;
  steps: { key: BuilderStepKey; label: string }[];
  previewMode: 'desktop' | 'mobile';
  setPreviewMode: (mode: 'desktop' | 'mobile') => void;
  previewData: BuilderState;
  setPreviewData: (data: BuilderState) => void;
  autosaveState: BuilderAutosaveState;
  setAutosaveState: (state: BuilderAutosaveState) => void;
  entityType: BuilderEntityType;
  activeLanguage: LangCode;
  setActiveLanguage: (lang: LangCode) => void;
}

const BuilderContext = createContext<BuilderContextValue | null>(null);

interface BuilderProviderProps {
  initialState: BuilderState;
  initialStep?: BuilderStepKey;
  children: React.ReactNode;
}

export function BuilderProvider({
  initialState,
  initialStep = 'basics',
  children,
}: BuilderProviderProps) {
  const [state, setState] = useState<BuilderState>(initialState);
  const [activeStep, setActiveStep] =
    useState<BuilderStepKey>(initialStep);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>(
    'desktop',
  );
  const [previewData, setPreviewData] =
    useState<BuilderState>(initialState);
  const [autosaveState, setAutosaveState] =
    useState<BuilderAutosaveState>({
      status: 'idle',
      lastSavedAt: undefined,
    });
  const [activeLanguage, setActiveLanguageState] = useState<LangCode>(() => {
    if (typeof window !== 'undefined') {
      const stored = window.sessionStorage.getItem(
        'builder-active-language',
      );
      if (
        stored &&
        LANGUAGES.some((lang) => lang.code === stored)
      ) {
        return stored as LangCode;
      }
    }
    return LANGUAGES[0].code as LangCode;
  });

  const setActiveLanguage = (lang: LangCode) => {
    setActiveLanguageState(lang);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('builder-active-language', lang);
    }
  };

  const steps = useMemo(() => {
    if (state.entityType === 'course') {
      return [
        { key: 'basics', label: 'Basics' },
        { key: 'curriculum', label: 'Curriculum' },
        { key: 'additional', label: 'Additional' },
      ] as const;
    }

    return [
      { key: 'basics', label: 'Basics' },
      { key: 'content', label: 'Content' },
      { key: 'additional', label: 'Additional' },
    ] as const;
  }, [state.entityType]);

  const updateState = (update: BuilderUpdate) => {
    setState((prev) => {
      const next =
        typeof update === 'function'
          ? (update as (previous: BuilderState) => BuilderState)(
              prev,
            )
          : update;
      return next;
    });
  };

  const value: BuilderContextValue = {
    state,
    updateState,
    activeStep,
    setActiveStep,
    steps: steps as unknown as { key: BuilderStepKey; label: string }[],
    previewMode,
    setPreviewMode,
    previewData,
    setPreviewData,
    autosaveState,
    setAutosaveState,
    entityType: state.entityType,
    activeLanguage,
    setActiveLanguage,
  };

  return (
    <BuilderContext.Provider value={value}>
      {children}
    </BuilderContext.Provider>
  );
}

export function useBuilderContext() {
  const ctx = useContext(BuilderContext);
  if (!ctx) {
    throw new Error(
      'useBuilderContext must be used within a BuilderProvider',
    );
  }
  return ctx;
}
