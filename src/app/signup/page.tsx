'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import axios from 'axios';

export default function signup() {

  interface IFormData {
    Name: string;
    Email: string;
    PhoneNumber: string;
    Role: string;
    Uname: string;
    Password: string;
  }
    

    const [formData, setFormData] = useState<IFormData>(
        {
          Name: '',
          Email: '',
          PhoneNumber: '',
          Role: '',
          Uname: '',
          Password: ''
        }
    );

        const handlesignup = async (e: React.FormEvent) => {
            e.preventDefault();
            try {
              const payload = {
                Name: formData.Name,
                Email: formData.Email,
                Uname: formData.Uname,
                Password: formData.Password,
                PhoneNumber: formData.PhoneNumber,
                Role: formData.Role
              };

              const response = await axios.post(
                'https://localhost:44323/api/user/create',
                payload,
                {
                  headers: {
                    'Content-Type': 'application/json'
                  }
                }
              );

              if (response.status === 200) {
                router.push('../login');
              }
            }
            catch (error : any) {
                alert(`Error during Sign Up: ${error.toString()}`);
            }
        };

  const router = useRouter();





  return (
    <div className="drawer">
      <input id="my-drawer" type="checkbox" className="drawer-toggle" />
        <div className="drawer-content flex flex-col min-h-screen">


          <header className="bg-base-20 shadow-md h-20 flex items-center justify-center relative px-4">
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

            <a href="/" className="flex items-center justify-center">
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
            <div className="w-full max-w-md bg-base-50 p-8 rounded-2xl shadow-lg">
                <h2 className="text-3xl font-bold text-center mb-6 text-primary">Create Your Account</h2>

                <form onSubmit={handlesignup} className="space-y-4">
                <div className="form-control">
                    <label className="label">
                    <span className="label-text">Full Name</span>
                    </label>
                    <input
                    type="text"
                    name="name"
                    placeholder="Enter your name"
                    className="input input-bordered w-full bg-white text-black"
                    value={formData.Name}
                    onChange={(e)=> setFormData({ ...formData, Name: e.target.value })}
                    required
                    />
                </div>

                <div className="form-control">
                    <label className="label">
                    <span className="label-text">Email</span>
                    </label>
                    <input
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    className="input input-bordered w-full bg-white text-black"
                    value={formData.Email}
                    onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
                    required
                    />
                </div>

                <div className="form-control">
                    <label className="label">
                    <span className="label-text">Phone Number</span>
                    </label>
                    <input
                    type="phone"
                    name="phone"
                    placeholder="01*********"
                    className="input input-bordered w-full bg-white text-black"
                    value={formData.PhoneNumber}
                    onChange={(e) => setFormData({ ...formData, PhoneNumber: e.target.value })}
                    required
                    />
                </div>

                <div className="form-control">
                    <label className="label">
                    <span className="label-text">Role</span>
                    </label>
                    <input
                    type="role"
                    name="role"
                    placeholder="User Type (e.g., Admin, Employee)"
                    className="input input-bordered w-full bg-white text-black"
                    value={formData.Role}
                    onChange={(e) => setFormData({ ...formData, Role: e.target.value })}
                    required
                    />
                </div>

                <div className="form-control">
                    <label className="label">
                    <span className="label-text">User Name</span>
                    </label>
                    <input
                    type="text"
                    name="uname"
                    placeholder="Enter your user name"
                    className="input input-bordered w-full bg-white text-black"
                    value={formData.Uname}
                    onChange={(e)=> setFormData({ ...formData, Uname: e.target.value })}
                    required
                    />
                </div>

                <div className="form-control">
                    <label className="label">
                    <span className="label-text">Password</span>
                    </label>
                    <input
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    className="input input-bordered w-full bg-white text-black"
                    value={formData.Password}
                    onChange={(e) => setFormData({ ...formData, Password: e.target.value })}
                    required
                    />
                </div>

                <button type="submit" className="btn btn-primary w-full mt-4">
                    Sign Up
                </button>
                </form>

                <p className="text-sm text-center text-gray-500 mt-6">
                Already have an account? <a className="text-primary hover:underline" href='../login'>Log in</a>
                </p>
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
