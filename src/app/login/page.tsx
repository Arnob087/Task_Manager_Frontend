'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Cookies from 'js-cookie';
import axios from 'axios';

export default function Login() {
    

    const [formData, setFormData] = useState({
            uname: '',
            password: '',
        });

    interface Itoken {
      TKey: string;
      CreatedAt: string;
      DeletedAt: string;
      Userid: string;
    }

    interface Iuser {
      Id: string;
      Name: string;
      Email: string;
      Uname: string;
      Password : string;
      PhoneNumber: string;
      Role: string;
      ResetCode: string;
      ResetCodeExpire : string;
      ScreenTime : string;
      Increment : string;
    ProfileImagePath : string;
    }

    const [token, setToken] = useState({
      TKey : '',
      CreatedAt : '',
      DeletedAt : '',
      Userid: '',
    });

    const router = useRouter();

        const handleuserinfo = async (e: React.FormEvent) => {
            e.preventDefault();
            try{
            const response = await axios.get<Iuser>('https://localhost:44323/api/user/name', { params: { uname: formData.uname } });
                if(response.status === 200) {
                  if(response.data.Role === 'Admin') {
                    Cookies.set('user', JSON.stringify(response.data));
                    router.push('../admin/dashboard');
                  }
                  else if(response.data.Role === 'Employee') {
                    Cookies.set('user', JSON.stringify(response.data));
                    router.push('../employee/dashboard');
                  }
                }
            }
            catch (error : any) {
                alert(`Error during login: ${error.toString()}`);
            }
          }

        const handleLogin = async (e: React.FormEvent) => {
            e.preventDefault();

            try {
              const response = await axios.post<Itoken>(
                'https://localhost:44323/api/login',
                formData
              );

              if (response.status === 200) {
                const userData = response.data;

                if (!userData.Userid) {
                  console.error('Login failed: User ID is empty');
                  return;
                }

                Cookies.set('token', userData.TKey);  
                setToken(userData);                     
                handleuserinfo(e);                      
              }
            } 
            catch (error : any) {
                alert(`Error during login: ${error.toString()}`);
            }
          };











  
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
                <div className="w-full max-w-md bg-base-100 p-8 rounded-2xl shadow-xl">
                    <h2 className="text-3xl font-bold text-center mb-6 text-primary">Welcome Back</h2>
                    <p className="text-center text-gray-500 mb-6">Log in to your E-Group account</p>

                    <form onSubmit={handleLogin} className="space-y-4">
                    <div className="form-control">
                        <label className="label">
                        <span className="label-text">User Name</span>
                        </label>
                        <input
                        type="uname"
                        name="uname"
                        placeholder="abcd1234"
                        className="input input-bordered w-full bg-white text-black"
                        value={formData.uname}
                        onChange={(e) => setFormData({ ...formData, uname: e.target.value })}
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
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary w-full mt-2">
                        Log In
                    </button>
                    </form>

                    <div className="text-sm text-center text-gray-500 mt-6">
                    Don’t have an account?{' '}
                    <a href="/signup" className="text-primary hover:underline">
                        Sign up
                    </a>
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
