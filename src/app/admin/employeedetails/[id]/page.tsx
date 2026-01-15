"use client";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import Script from "next/script";

interface IEmployee {
  Id: string;
  Name: string;
  Email: string;
  PhoneNumber: string;
  Role: string;
  ScreenTime: string | null;
  Increment: string | null;
  ProfileImagePath: string;
}

export default function EmployeeDetails() {
  const router = useRouter();
  const { id } = useParams();
  const token: string = Cookies.get("token") || "";
  const [employee, setEmployee] = useState<IEmployee | null>(null);
  const [loadingEmployee, setLoadingEmployee] = useState(true);
  const [photoVersion, setPhotoVersion] = useState<string>(Date.now().toString());
  const [signalReady, setSignalReady] = useState(false);
  const [signalError, setSignalError] = useState<string | null>(null);
  const connectionRef = useRef<any>(null);

  // Fetch employee once
  useEffect(() => {
    if (!id) {
      console.error("No employee ID provided");
      setLoadingEmployee(false);
      return;
    }

    const fetchEmployee = async () => {
      try {
        const res = await axios.get<IEmployee>(
          `https://localhost:44323/api/user/${id}`,
          {
            headers: {
              Authorization: `${token}`,
            },
          }
        );
        if (res.status === 200) {
          setEmployee(res.data);
        } else {
          console.error("Failed to fetch employee", res.status);
        }
      } catch (err) {
        console.error("Error fetching employee:", err);
      } finally {
        setLoadingEmployee(false);
      }
    };

    fetchEmployee();
  }, [id, token]);

  // Wait for SignalR script
  useEffect(() => {
    if ((window as any).$ && (window as any).$.hubConnection) {
      setSignalReady(true);
    }
  }, []);

  // Setup SignalR connection
  useEffect(() => {
    if (!signalReady || !id) return;

    const $ = (window as any).$;
    const connection = $.hubConnection("https://localhost:44323/");
    const hubProxy = connection.createHubProxy("ProfileHub");

    connectionRef.current = connection;

    hubProxy.on("photoUpdated", (payload: { employeeId: number; version: number }) => {
      if (payload.employeeId.toString() === id) {
        setPhotoVersion(payload.version.toString());
      }
    });

    connection.start()
      .done(() => console.log("✅ Connected to SignalR hub"))
      .fail((err: any) => {
        console.error("❌ SignalR connection failed:", err);
        setSignalError("Real-time updates unavailable.");
      });

    return () => connection.stop();
  }, [signalReady, id]);

  // Fallback polling
  useEffect(() => {
    if (!signalError || !employee) return;

    const interval = setInterval(async () => {
      try {
        const res = await axios.head(
          `https://localhost:44323/api/user/profilepic/${employee.Id}`,
          {
            headers: {
              Authorization: `${token}`,
            },
          }
        );
        const newETag = res.headers["etag"] || "";
        if (newETag && newETag !== photoVersion) {
          setPhotoVersion(Date.now().toString());
        }
      } catch {}
    }, 15000);

    return () => clearInterval(interval);
  }, [signalError, employee, token, photoVersion]);

  function toDataURL(url: string): Promise<string> {
  return fetch(url)
    .then(response => response.blob())
    .then(blob => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    }));
}

function addDetails(doc: jsPDF, details: {label: string, value: string}[], startX: number, startY: number, lineHeight: number) {
  let y = startY;
  details.forEach(({ label, value }) => {
    doc.setFont("", "bold");
    doc.text(`${label}:`, startX, y);
    doc.setFont("", "normal");
    const splitText = doc.splitTextToSize(value, 140);
    doc.text(splitText, startX + 40, y);
    y += lineHeight * splitText.length;
  });
  return y;
}





  async function downloadPDF() {
  if (!employee) return;

  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();

  // ---- HEADER ----
  doc.setFillColor(88, 80, 141); // indigo-purple
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("EMPLOYEE BIO-DATA", pageWidth / 2, 25, { align: "center" });

  // ---- PROFILE IMAGE ----
  let imgData = null;
  try {
    const url = `https://localhost:44323/api/user/profilepic/${employee.Id}?v=${photoVersion}`;
    const res = await axios.get(url, { responseType: "blob" });
    const reader = new FileReader();
    imgData = await new Promise<string>((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(res.data as Blob);
    });
  } catch (err) {
    console.error("Failed to load profile image for PDF", err);
  }

  if (imgData) {
    const imgSize = 40;
    doc.addImage(imgData, "JPEG", pageWidth / 2 - imgSize / 2, 50, imgSize, imgSize);
  }

  // ---- NAME & ROLE ----
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "bold");
  doc.text(employee.Name, pageWidth / 2, 105, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100);
  doc.text(employee.Role, pageWidth / 2, 112, { align: "center" });

  // ---- INFO TABLE ----
  const employeeDetails = [
    { label: "Employee ID", value: employee.Id },
    { label: "Email", value: employee.Email },
    { label: "Phone Number", value: employee.PhoneNumber },
    { label: "Screen Time", value: employee.ScreenTime ?? "-" },
    { label: "Increment", value: employee.Increment ?? "-" },
  ];

  let y = 130;
  const startX = 20;
  const labelWidth = 50;
  const rowHeight = 12;

  employeeDetails.forEach((item, index) => {
    // Alternate row background
    if (index % 2 === 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(startX - 5, y - 8, pageWidth - 40, rowHeight, "F");
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text(`${item.label}:`, startX, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    const splitValue = doc.splitTextToSize(item.value, pageWidth - startX - labelWidth - 20);
    doc.text(splitValue, startX + labelWidth, y);

    y += rowHeight;
  });

  // ---- FOOTER ----
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setDrawColor(200, 200, 200);
  doc.line(20, footerY - 5, pageWidth - 20, footerY - 5);

  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.setFont("helvetica", "italic");
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, 20, footerY);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(88, 80, 141);
  doc.text("© E-Group BD", pageWidth - 20, footerY, { align: "right" });

  // ---- SAVE ----
  doc.save(`${employee.Name}_Details.pdf`);
}




  function ProfilePicInline({ userId, token, size = 120, version }: { userId: string | number; token?: string; size?: number; version?: string | number }) {
    const [src, setSrc] = useState<string>("/logo.png");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
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

      return () => {
        cancelled = true;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      };
    }, [userId, token, version]);

    return (
      <div className="flex flex-col items-center">
        <div
          style={{ width: size, height: size }}
          className="relative rounded-full overflow-hidden border border-gray-300"
        >
          {loading ? (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-xs text-gray-500">Loading...</span>
            </div>
          ) : (
            <img
              src={src}
              alt="Profile"
              width={size}
              height={size}
              className="object-cover w-full h-full rounded-full"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/logo.png";
              }}
            />
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
      
      {/* HEADER */}
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

      {/* MAIN */}
      <main className="flex-grow flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-3xl bg-white/70 backdrop-blur-lg p-10 rounded-2xl shadow-2xl border border-gray-100 transition hover:shadow-indigo-200 hover:scale-[1.01]">
          
          <h1 className="text-4xl font-extrabold text-gray-800 mb-8 text-center bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Employee Bio-data
          </h1>

          {loadingEmployee ? (
            <p className="text-center mt-6 text-gray-500 animate-pulse">Loading...</p>
          ) : employee ? (
            <>
              {/* PROFILE */}
              <div className="flex flex-col items-center mb-8">
                <ProfilePicInline userId={employee.Id} token={token} size={130} version={photoVersion} />
                <h2 className="text-3xl font-semibold mt-4 text-gray-800">{employee.Name}</h2>
                <p className="text-lg text-gray-500 italic">{employee.Role}</p>
              </div>

              {/* DETAILS GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 text-gray-700 text-lg">
                <div className="p-4 rounded-lg bg-gray-50 shadow-sm hover:bg-indigo-50 hover:shadow-md transition">
                  <span className="font-semibold text-gray-900">Employee ID:</span> {employee.Id}
                </div>
                <div className="p-4 rounded-lg bg-gray-50 shadow-sm hover:bg-indigo-50 hover:shadow-md transition">
                  <span className="font-semibold text-gray-900">Email:</span> {employee.Email}
                </div>
                <div className="p-4 rounded-lg bg-gray-50 shadow-sm hover:bg-indigo-50 hover:shadow-md transition">
                  <span className="font-semibold text-gray-900">Phone:</span> {employee.PhoneNumber}
                </div>
                <div className="p-4 rounded-lg bg-gray-50 shadow-sm hover:bg-indigo-50 hover:shadow-md transition">
                  <span className="font-semibold text-gray-900">Screen Time:</span> {employee.ScreenTime ?? "-"}
                </div>
                <div className="p-4 rounded-lg bg-gray-50 shadow-sm hover:bg-indigo-50 hover:shadow-md transition">
                  <span className="font-semibold text-gray-900">Increment:</span> {employee.Increment ?? "-"}
                </div>
              </div>

              {/* ACTIONS */}
              <div className="mt-10 flex justify-center">
                <button
                  type="button"
                  onClick={downloadPDF}
                  className="px-8 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition transform hover:-translate-y-0.5"
                >
                  Download PDF
                </button>
              </div>
            </>
          ) : (
            <p className="text-center mt-6 text-red-600 font-medium">Failed to load employee.</p>
          )}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-gray-100 text-center p-5 text-sm text-gray-500 border-t">
        © {new Date().getFullYear()} <span className="font-semibold text-indigo-600">E-Group BD</span>. All rights reserved.
      </footer>
    </div>

    {/* SIDEBAR */}
    <div className="drawer-side z-50">
      <label htmlFor="my-drawer" aria-label="close sidebar" className="drawer-overlay"></label>
      <ul className="menu p-6 w-80 min-h-full bg-gradient-to-b from-indigo-50 to-purple-50 text-gray-800">
        <li><a className="font-medium hover:text-indigo-600">🏠 Home</a></li>
        <li><a className="font-medium hover:text-indigo-600">ℹ️ About</a></li>
        <li><a className="font-medium hover:text-indigo-600">💼 Services</a></li>
        <li><a className="font-medium hover:text-indigo-600">📞 Contact</a></li>
      </ul>
    </div>
  </div>
);

}
