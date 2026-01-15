'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function Home() {

  const router = useRouter();

  return (
    <div className="drawer">
      <input id="my-drawer" type="checkbox" className="drawer-toggle" />
        <div className="drawer-content flex flex-col min-h-screen">


          <header className="bg-base-20 shadow-md h-20 flex items-center justify-center relative px-4">
            {/* Hamburger Button (Left) */}
            <label htmlFor="my-drawer" className="btn btn-ghost btn-sm absolute left-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </label>

            {/* Centered Logo */}
            <a href="" className="flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="Company Logo"
                width={160}
                height={60}
                priority
              />
            </a>
          </header>




          <main className="flex-grow flex items-center justify-center px-4">
            <div className="text-center max-w-xl">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
                Welcome to <span className="text-primary">E-Group</span>!
              </h1>
              <p className="text-xl text-gray-600 mb-2">
                Your Task Management Solution
              </p>
              <p className="text-lg text-gray-500">
                Manage your tasks efficiently
              </p>
              <p className="text-lg text-gray-500">
                Stay organized and productive
              </p>
              <p className="text-lg text-gray-500 mb-6">
                Get started today!
              </p>

              <div className="flex justify-center gap-4">
                <button className="btn btn-primary" onClick={() => router.push("/signup")}>Sign Up</button>
                <button className="btn btn-link" onClick={() => router.push("/login")}>Login</button>
              </div>
            </div>
          </main>






          {/* Footer (always at the bottom) */}
          <footer className="bg-base-200 text-center p-4 text-sm text-gray-500">
            © {new Date().getFullYear()} E-Group BD. All rights reserved.
          </footer>
      </div>
      




      <div className="drawer-side z-50">
        <label htmlFor="my-drawer" aria-label="close sidebar" className="drawer-overlay"></label>
        <ul className="menu p-4 w-80 min-h-full bg-base-200 text-base-content">
          <li><a>Home</a></li>
          <li><a>About</a></li>
          <li><a>Services</a></li>
          <li><a>Contact</a></li>
        </ul>
      </div>
    </div>
  );
}
