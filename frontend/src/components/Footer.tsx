import React from "react";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-neutral-100 bg-white py-8 mt-auto">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-neutral-400">
        <div>
          &copy; {new Date().getFullYear()} OpenScout. Discovering open-source contributions.
        </div>
        <div className="flex gap-4">
          <a href="#" className="hover:text-neutral-600 transition-colors">Documentation</a>
          <a href="#" className="hover:text-neutral-600 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-neutral-600 transition-colors">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
