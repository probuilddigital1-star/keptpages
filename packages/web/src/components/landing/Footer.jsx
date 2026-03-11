import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-walnut border-t border-cream/[0.06] py-7 pb-[90px] lg:pb-7">
      <div className="mx-auto max-w-container-sm md:max-w-container-md lg:max-w-container-lg px-6">
        <div className="flex flex-col items-center gap-3">
          <Link to="/" className="font-display font-[800] text-lg text-cream/60 no-underline">
            Kept<span className="text-terracotta opacity-70">Pages</span>
          </Link>
          <div className="flex gap-5">
            <Link to="/between-the-pages" className="font-ui text-[13px] text-cream/35 transition-colors duration-200 hover:text-cream/70 no-underline">
              Between the Pages
            </Link>
            <a href="#" className="font-ui text-[13px] text-cream/35 transition-colors duration-200 hover:text-cream/70">
              Privacy
            </a>
            <a href="#" className="font-ui text-[13px] text-cream/35 transition-colors duration-200 hover:text-cream/70">
              Terms
            </a>
            <a href="#" className="font-ui text-[13px] text-cream/35 transition-colors duration-200 hover:text-cream/70">
              Contact
            </a>
          </div>
          <div className="font-ui text-xs text-cream/20">
            &copy; 2026 KeptPages. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
