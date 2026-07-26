'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Leaf, Library, PlusCircle, Tag, Info, Menu, X, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  const navItems = [
    { name: 'Library', href: '/library', icon: Library },
    { name: 'Submit', href: '/submit', icon: PlusCircle },
    { name: 'Categories', href: '/categories', icon: Tag },
    { name: 'About', href: '/about', icon: Info },
  ];

  return (
    <div className="min-h-screen bg-[#F9F8F6] font-sans text-[#4A4A4A]">
      {/* Disclaimer Banner */}
      <div className="bg-[#E8E6E1] text-[#6B6B6B] text-xs md:text-sm py-2 px-4 text-center font-medium tracking-wide">
        For professional resources only. Never post client-identifying information.
      </div>

      {/* Top Bar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#E8E6E1] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/library" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#F0EFEA] rounded-full flex items-center justify-center">
                <Leaf className="w-4 h-4 text-[#8F9F8A]" />
              </div>
              <span className="font-serif text-lg font-medium text-[#4A4A4A]">Therapy Collective Hub</span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex space-x-8">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-1 text-sm font-medium transition-colors ${isActive ? 'text-[#8F9F8A]' : 'text-[#8C8C8C] hover:text-[#4A4A4A]'
                      }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 text-sm font-medium text-[#8C8C8C] hover:text-red-500 transition-colors ml-2"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </nav>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-[#8C8C8C]"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden bg-white border-b border-[#E8E6E1] overflow-hidden"
            >
              <div className="px-4 pt-2 pb-4 space-y-1">
                {navItems.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-3 py-3 rounded-xl text-base font-medium ${isActive ? 'bg-[#F0EFEA] text-[#8F9F8A]' : 'text-[#6B6B6B] hover:bg-[#F9F8F6]'
                        }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
                <button
                  onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }}
                  className="flex items-center space-x-3 px-3 py-3 rounded-xl text-base font-medium text-[#6B6B6B] hover:bg-red-50 hover:text-red-500 transition-colors mt-2 border-t border-[#E8E6E1] pt-3 w-full"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Log Out</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
