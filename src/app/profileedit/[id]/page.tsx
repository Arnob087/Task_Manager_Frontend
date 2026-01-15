'use client';
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import Script from "next/script";

interface IEmployee {
  Id: string;
  Name: string;
  Uname: string;
  Password: string;
  Email: string;
  PhoneNumber: string;
  Role: string;
  ScreenTime: string | null;
  Increment: string | null;
  ProfileImagePath: string;
}

export default function Profileedit() {
  const router = useRouter();
  const { id } = useParams();
  const token: string = Cookies.get("token") || "";
  const [employee, setEmployee] = useState<IEmployee | null>(null);
  const [loadingEmployee, setLoadingEmployee] = useState(true);
  const [photoVersion, setPhotoVersion] = useState<string>(Date.now().toString());
  const [signalReady, setSignalReady] = useState(false);
  const [signalError, setSignalError] = useState<string | null>(null);
  const connectionRef = useRef<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<IEmployee>>({});
  const [newProfilePic, setNewProfilePic] = useState<File | null>(null);
  const [previewPic, setPreviewPic] = useState<string | null>(null);

  // Fetch employee once
  useEffect(() => {
    if (!id) return;
    const fetchEmployee = async () => {
      try {
        const res = await axios.get<IEmployee>(
          `https://localhost:44323/api/user/${id}`,
          { headers: { Authorization: `${token}` } }
        );
        setEmployee(res.data);
        setFormData(res.data);
      } catch (err) {
        console.error("Error fetching employee:", err);
      } finally {
        setLoadingEmployee(false);
      }
    };
    fetchEmployee();
  }, [id, token]);

  // SignalR & Photo update handling
  useEffect(() => {
    if ((window as any).$ && (window as any).$.hubConnection) setSignalReady(true);
  }, []);

  useEffect(() => {
    if (!signalReady || !id) return;
    const $ = (window as any).$;
    const connection = $.hubConnection("https://localhost:44323/");
    const hubProxy = connection.createHubProxy("ProfileHub");
    connectionRef.current = connection;

    hubProxy.on("photoUpdated", (payload: { employeeId: number; version: number }) => {
      if (payload.employeeId.toString() === id) setPhotoVersion(payload.version.toString());
    });

    connection.start()
      .done(() => console.log("✅ Connected to SignalR hub"))
      .fail((err: any) => {
        console.error("❌ SignalR connection failed:", err);
        setSignalError("Real-time updates unavailable.");
      });

    return () => connection.stop();
  }, [signalReady, id]);

  // Handle input changes
  const handleChange = (key: keyof IEmployee, value: string) => {
    setFormData({ ...formData, [key]: value });
  };

  // Handle profile pic selection
  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewProfilePic(e.target.files[0]);
      setPreviewPic(URL.createObjectURL(e.target.files[0]));
    }
  };

  // Save changes
  const handleSave = async () => {
    if (!employee) return;
    try {
      // Update info
      /*const res = await axios.put(
        `https://localhost:44323/api/user/${employee.Id}`,
        formData,
        { headers: { Authorization: `${token}` } }
      );*/

      // Upload profile pic if selected
      if (newProfilePic) {
        const form = new FormData();
        form.append("file", newProfilePic);
        await axios.post(
          `https://localhost:44323/api/user/uploadpic/${employee.Id}`,
          form,
          { headers: { Authorization: `${token}`, "Content-Type": "multipart/form-data" } }
        );
        setPhotoVersion(Date.now().toString()); // Refresh pic
      }

      //if (res.status === 200) {
        setEmployee({ ...formData } as IEmployee);
        setIsEditing(false);
        setNewProfilePic(null);
        setPreviewPic(null);
        alert("✅ Employee updated successfully.");
      //}
    } catch (err) {
      console.error("Failed to update employee:", err);
      alert("❌ Update failed.");
    }
  };

  function ProfilePicInline({ userId, token, size = 120, version, preview }: { userId: string | number; token?: string; size?: number; version?: string | number; preview?: string }) {
    const [src, setSrc] = useState<string>(preview || "/logo.png");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      if (preview) {
        setSrc(preview);
        setLoading(false);
        return;
      }
      if (!userId) return;
      let cancelled = false;
      let objectUrl: string | null = null;

      const fetchPic = async () => {
        try {
          const url = `https://localhost:44323/api/user/profilepic/${userId}${version ? `?v=${version}` : ""}`;
          const res = await axios.get<Blob>(url, {
            responseType: "blob",
            headers: token ? { Authorization: `${token}` } : undefined,
          });
          if (cancelled) return;
          objectUrl = URL.createObjectURL(res.data);
          setSrc(objectUrl);
        } catch {
          setSrc("/logo.png");
        } finally {
          if (!cancelled) setLoading(false);
        }
      };
      fetchPic();
      return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [userId, token, version, preview]);

    return (
      <div className="flex flex-col items-center">
        <div style={{ width: size, height: size }} className="relative rounded-full overflow-hidden border border-gray-300">
          {loading ? (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-xs text-gray-500">Loading...</span>
            </div>
          ) : (
            <img src={src} alt="Profile" width={size} height={size} className="object-cover w-full h-full rounded-full" onError={(e) => (e.currentTarget.src = "/logo.png")} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="drawer">
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js" strategy="beforeInteractive" />
      <Script src="https://localhost:44323/signalr/hubs" strategy="beforeInteractive" />

      <input id="my-drawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex flex-col min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <header className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg h-20 flex items-center justify-center relative px-6">
          <label htmlFor="my-drawer" className="btn btn-ghost btn-sm absolute left-4 text-white hover:bg-white/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </label>
          <a href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Company Logo" width={140} height={50} className="drop-shadow-md" />
          </a>
        </header>

        <main className="flex-grow flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-3xl bg-white/70 backdrop-blur-lg p-10 rounded-2xl shadow-2xl border border-gray-100 transition hover:shadow-indigo-200 hover:scale-[1.01]">
            <h1 className="text-4xl font-extrabold text-gray-800 mb-8 text-center bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Your Profile Information</h1>

            {loadingEmployee ? (
              <p className="text-center mt-6 text-gray-500 animate-pulse">Loading...</p>
            ) : employee ? (
              <>
                {/* PROFILE PIC + EDIT */}
                <div className="flex flex-col items-center mb-8">
                  <ProfilePicInline userId={employee.Id} token={token} size={130} version={photoVersion} preview={previewPic || undefined} />
                  {isEditing && (
                    <input type="file" accept="image/*" onChange={handleProfilePicChange} className="mt-4 text-gray-500 border-b" />
                  )}
                  {isEditing ? (
                    <input className="mt-4 text-center text-2xl font-semibold border-b border focus:outline-none text-gray-600" value={formData.Name || ''} onChange={(e) => handleChange("Name", e.target.value)} />
                  ) : (
                    <h2 className="text-3xl font-semibold mt-4 text-gray-800">{employee.Name}</h2>
                  )}
                  {isEditing ? (
                    <input className="text-center text-lg italic border-b border-gray-300 focus:outline-none text-gray-600" value={formData.Role || ''} onChange={(e) => handleChange("Role", e.target.value)} />
                  ) : (
                    <p className="text-lg text-gray-500 italic">{employee.Role}</p>
                  )}
                </div>

                {/* DETAILS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 text-gray-700 text-lg">
                  {["Id","Email","PhoneNumber","ScreenTime","Increment"].map((key) => (
                    <div key={key} className="p-4 rounded-lg bg-gray-50 shadow-sm hover:bg-indigo-50 hover:shadow-md transition">
                      <span className="font-semibold text-gray-900">{key.replace(/([A-Z])/g, ' $1')}:</span>
                      {isEditing && key !== "Id" ? (
                        <input
                          className="ml-2 border-b border-gray-300 focus:outline-none"
                          value={formData[key as keyof IEmployee] || ''}
                          onChange={(e) => handleChange(key as keyof IEmployee, e.target.value)}
                        />
                      ) : (
                        ` ${employee[key as keyof IEmployee] ?? "-"}`
                      )}
                    </div>
                  ))}
                </div>

                {/* ACTION BUTTONS */}
                <div className="mt-10 flex justify-center gap-4">
                  {isEditing ? (
                    <>
                      <button onClick={handleSave} className="px-8 py-3 rounded-xl font-semibold text-white bg-green-500 hover:bg-green-600 shadow-lg">Save</button>
                      <button onClick={() => setIsEditing(false)} className="px-8 py-3 rounded-xl font-semibold text-white bg-gray-400 hover:bg-gray-500 shadow-lg">Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => setIsEditing(true)} className="px-8 py-3 rounded-xl font-semibold text-white bg-indigo-500 hover:bg-indigo-600 shadow-lg">Edit Info</button>
                  )}
                </div>
              </>
            ) : (
              <p className="text-center mt-6 text-red-600 font-medium">Failed to load employee.</p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
