import React from "react";
import { SlidersHorizontal, RotateCcw } from "lucide-react";

interface FilterPanelProps {
  selectedDifficulty: string;
  onChangeDifficulty: (difficulty: string) => void;
  selectedLanguage: string;
  onChangeLanguage: (language: string) => void;
  selectedLabel: string;
  onChangeLabel: (label: string) => void;
  onClearFilters: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  selectedDifficulty,
  onChangeDifficulty,
  selectedLanguage,
  onChangeLanguage,
  selectedLabel,
  onChangeLabel,
  onClearFilters,
}) => {
  const difficulties = [
    { value: "", label: "All Difficulties" },
    { value: "Beginner", label: "Beginner" },
    { value: "Intermediate", label: "Intermediate" },
    { value: "Advanced", label: "Advanced" },
  ];

  const languages = [
    { value: "", label: "All Languages" },
    { value: "TypeScript", label: "TypeScript" },
    { value: "JavaScript", label: "JavaScript" },
    { value: "Python", label: "Python" },
    { value: "Go", label: "Go" },
    { value: "Rust", label: "Rust" },
    { value: "C++", label: "C++" },
    { value: "Java", label: "Java" },
  ];

  const labels = [
    { value: "", label: "All Labels" },
    { value: "good first issue", label: "Good First Issue" },
    { value: "help wanted", label: "Help Wanted" },
    { value: "bug", label: "Bug" },
    { value: "documentation", label: "Documentation" },
    { value: "enhancement", label: "Enhancement" },
    { value: "first-timers-only", label: "First Timers Only" },
  ];

  const hasActiveFilters = selectedDifficulty || selectedLanguage || selectedLabel;

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-5 flex flex-col gap-5 text-left h-fit">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-neutral-800" />
          <h2 className="text-sm font-semibold text-neutral-900">Filters</h2>
        </div>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-900 font-medium transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>

      {/* Difficulty Filter */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Difficulty
        </label>
        <div className="flex flex-col gap-1">
          {difficulties.map((diff) => (
            <button
              key={diff.value}
              onClick={() => onChangeDifficulty(diff.value)}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                selectedDifficulty === diff.value
                  ? "bg-black text-white font-medium"
                  : "text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              {diff.label}
            </button>
          ))}
        </div>
      </div>

      {/* Language Filter */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Language
        </label>
        <div className="flex flex-col gap-1">
          {languages.map((lang) => (
            <button
              key={lang.value}
              onClick={() => onChangeLanguage(lang.value)}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                selectedLanguage === lang.value
                  ? "bg-black text-white font-medium"
                  : "text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Label Filter */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Labels
        </label>
        <div className="flex flex-col gap-1">
          {labels.map((lbl) => (
            <button
              key={lbl.value}
              onClick={() => onChangeLabel(lbl.value)}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                selectedLabel === lbl.value
                  ? "bg-black text-white font-medium"
                  : "text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              {lbl.label}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};
export default FilterPanel;
