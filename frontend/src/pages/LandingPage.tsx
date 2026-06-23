import React from "react";
import { Link } from "react-router-dom";
import { Compass, Sparkles, Bookmark, ArrowRight, GitBranch } from "lucide-react";
import { Button } from "../components/ui/Button";

export const LandingPage: React.FC = () => {
  return (
    <div className="bg-white min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 sm:pt-28 sm:pb-20 border-b border-neutral-100">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-50 border border-neutral-200 text-xs font-semibold text-neutral-800 mb-6 tracking-wide select-none animate-pulse-slow">
            <Sparkles className="w-3.5 h-3.5" />
            AI-POWERED CONTRIBUTION PLATFORM
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-6xl font-extrabold text-neutral-900 tracking-tight max-w-4xl mx-auto leading-none mb-6">
            Discover beginner-friendly <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-neutral-600 via-neutral-950 to-neutral-600 bg-clip-text text-transparent">
              open-source issues.
            </span>
          </h1>

          {/* Subtext */}
          <p className="text-neutral-500 text-base sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
            OpenScout indexes repos, classifies issue difficulties, and generates LLM-powered mentor guidance so you can start contributing to open-source in minutes.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup">
              <Button size="lg" className="flex items-center gap-2 w-full sm:w-auto">
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/explore">
              <Button variant="outline" size="lg" className="flex items-center gap-2 w-full sm:w-auto">
                Explore Issues
                <Compass className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Backdrop Visual grid lines */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(#e5e5e5_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      </section>

      {/* Feature Grid */}
      <section className="py-20 bg-neutral-50/50 border-b border-neutral-100">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-neutral-900 mb-4">
              Everything you need to ship your first commit
            </h2>
            <p className="text-neutral-500">
              OpenScout bridges the gap between repositories and junior engineers by parsing, classifying, and explaining codebases.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm hover:border-neutral-400 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center mb-5">
                <GitBranch className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-neutral-900 mb-2">Repository Indexing</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">
                Add any public GitHub repository URL. OpenScout will pull all open issues, analyze their content, and index them.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm hover:border-neutral-400 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center mb-5">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-neutral-900 mb-2">AI Explanations</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">
                Understand the issue in plain language. Get the required skills, a proposed code approach, and a guide for your first file edit.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm hover:border-neutral-400 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center mb-5">
                <Bookmark className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-neutral-900 mb-2">Saved Bookmarks</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">
                Organize your study backlog. Bookmark issues across multiple programming languages and build your personalized contribution list.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Code Showcase Preview */}
      <section className="py-20 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-black text-neutral-100 rounded-2xl p-6 sm:p-12 overflow-hidden shadow-2xl relative">
            <div className="max-w-2xl">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Mentor in your browser
              </span>
              <h2 className="text-2xl sm:text-4xl font-bold text-white mt-2 mb-4">
                "AI, explain how to fix this layout issue in React."
              </h2>
              <p className="text-neutral-400 text-sm sm:text-base leading-relaxed mb-6">
                OpenScout feeds Github issues into a specialized LLM agent. It outputs: problem summaries, files to check, skills needed, and code approach. No more getting lost in large repositories.
              </p>
              <Link to="/explore">
                <Button variant="secondary" size="md">
                  View Demo Explorer
                </Button>
              </Link>
            </div>
            
            {/* Visual absolute decoration */}
            <div className="absolute right-0 bottom-0 top-0 w-1/3 hidden lg:flex items-center justify-center opacity-10">
              <Sparkles className="w-64 h-64 text-white" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
export default LandingPage;
