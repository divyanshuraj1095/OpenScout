import React, { useState } from "react";
import { Sparkles, BrainCircuit, Play, AlertCircle, RefreshCw } from "lucide-react";
import { aiService } from "../services/ai.service";
import { Card, CardContent } from "./ui/Card";
import { Button } from "./ui/Button";

interface AiExplanationCardProps {
  issueId: number;
}

export const AiExplanationCard: React.FC<AiExplanationCardProps> = ({ issueId }) => {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExplanation = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await aiService.explainIssue(issueId);
      setExplanation(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to generate explanation");
    } finally {
      setLoading(false);
    }
  };

  // Simple Markdown-to-JSX Parser to render groq markdown beautifully
  const renderFormattedText = (text: string) => {
    return text.split("\n").map((line, idx) => {
      // Bullet list items
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        const content = line.trim().replace(/^[-*]\s+/, "");
        return (
          <li key={idx} className="ml-5 list-disc text-sm text-neutral-600 mb-1">
            {renderInlineStyles(content)}
          </li>
        );
      }

      // Numbered list items
      if (/^\d+\.\s+/.test(line.trim())) {
        const content = line.trim().replace(/^\d+\.\s+/, "");
        return (
          <li key={idx} className="ml-5 list-decimal text-sm text-neutral-600 mb-1">
            {renderInlineStyles(content)}
          </li>
        );
      }

      // Header lines (### or ## or #)
      if (line.trim().startsWith("###")) {
        return (
          <h4 key={idx} className="text-sm font-semibold text-neutral-900 mt-4 mb-2">
            {line.replace(/^###\s+/, "")}
          </h4>
        );
      }
      if (line.trim().startsWith("##") || line.trim().startsWith("#")) {
        return (
          <h3 key={idx} className="text-base font-semibold text-neutral-900 mt-5 mb-2 border-b border-neutral-100 pb-1">
            {line.replace(/^##?\s+/, "")}
          </h3>
        );
      }

      // Plain line
      if (line.trim() === "") return <div key={idx} className="h-2" />;

      return (
        <p key={idx} className="text-sm text-neutral-600 leading-relaxed mb-2">
          {renderInlineStyles(line)}
        </p>
      );
    });
  };

  // Parse bold **text** in lines
  const renderInlineStyles = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="font-semibold text-neutral-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <Card className="w-full border-neutral-900/10 shadow-sm relative overflow-hidden bg-neutral-50/30">
      
      {/* Visual Accent top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-neutral-800 via-neutral-950 to-neutral-800" />
      
      <CardContent className="p-6">
        
        {/* Header Title */}
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-black text-white">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide">
                AI Assistant
              </h3>
              <p className="text-xs text-neutral-400">
                Llama-3 model breakdown & contribution approach
              </p>
            </div>
          </div>
          {explanation && (
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={fetchExplanation}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Regenerate
            </Button>
          )}
        </div>

        {/* Dynamic Display Area */}
        {!explanation && !loading && !error && (
          <div className="text-center py-8 flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="max-w-md">
              <h4 className="text-sm font-semibold text-neutral-900 mb-1">
                Need help getting started?
              </h4>
              <p className="text-xs text-neutral-400 mb-4">
                OpenScout's AI will parse this issue to summarize the bug, outline required skills, explain why the issue exists, and guide your first step.
              </p>
              <Button
                variant="primary"
                onClick={fetchExplanation}
                className="flex items-center gap-2 mx-auto"
              >
                <Play className="w-4 h-4 fill-current" />
                Explain Issue
              </Button>
            </div>
          </div>
        )}

        {/* Loading Spinner Skeleton */}
        {loading && (
          <div className="flex flex-col gap-3 py-4">
            <div className="flex items-center gap-2 animate-pulse-slow">
              <div className="w-3 h-3 rounded-full bg-black shrink-0" />
              <div className="h-4 w-32 bg-neutral-200 rounded" />
            </div>
            <div className="flex flex-col gap-2 mt-2">
              <div className="h-3 w-full bg-neutral-200 rounded animate-pulse-slow" />
              <div className="h-3 w-5/6 bg-neutral-200 rounded animate-pulse-slow" />
              <div className="h-3 w-4/5 bg-neutral-200 rounded animate-pulse-slow" />
              <div className="h-3 w-2/3 bg-neutral-200 rounded animate-pulse-slow" />
            </div>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-1">AI Agent Error</p>
              <p className="text-xs opacity-90">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchExplanation} className="border-red-200 hover:bg-red-100/50">
              Retry
            </Button>
          </div>
        )}

        {/* Result Area */}
        {explanation && !loading && !error && (
          <div className="bg-white border border-neutral-100 rounded-lg p-5 text-left">
            <ul className="list-inside">{renderFormattedText(explanation)}</ul>
          </div>
        )}

      </CardContent>
    </Card>
  );
};
export default AiExplanationCard;
