import React from 'react';
import Link from 'next/link';

// App version for display
const APP_VERSION = "0.6.8";

export function BrandHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 p-4 z-10 flex justify-center">
      <div className="container max-w-2xl mx-auto px-4">
        <div className="flex items-center">
          <Link href="/" className="flex items-center font-medium tracking-tight hover:opacity-80 transition-opacity">
            <span className="zeidgeist-text font-bold text-lg">zeidgeist</span>
            <span className="text-gray-400 font-light">:prompter</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function BrandFooter() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 p-2 text-center text-xs text-gray-400 z-10">
      <p>
        © {new Date().getFullYear()}{' '}
        <a 
          href="https://zeidgeist.vercel.app" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="hover:text-gray-600 transition-colors"
        >
          zeidgeistdotcom
        </a>
        <span className="mx-2">•</span>
        <span className="text-gray-300">v{APP_VERSION}</span>
      </p>
    </footer>
  );
} 