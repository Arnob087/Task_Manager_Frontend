'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { AlertTriangle } from 'lucide-react';
import ChatWidget from '@/app/Components/ChatWidget';

export default function AdminDashboard() {
  const router = useRouter();

  interface Iuser {
    Id: string;
    Name: string;
    Email: string;
    Uname: string;
    Password: string;
    PhoneNumber: string;
    Role: string;
    ResetCode: string;
    ResetCodeExpire: string;
    ScreenTime: string;
    Increment: string;
    ProfileImagePath: string;
  }

  interface IEmployee {
    Id: string;
    Name: string;
    Email: string;
    PhoneNumber: string;
  }

  interface ITask {
    Id: string;
    Title: string;
    Description: string;
    Status: string;
    Deadline: string;
    EmployeeId: string;
    CreatedDate: string;
  }

  const token: string = Cookies.get('token') || '';
  const user: Iuser = Cookies.get('user')
    ? JSON.parse(Cookies.get('user') || '{}')
    : { Id: '', Name: '', Email: '', Uname: '', Password: '', PhoneNumber: '', Role: '', ResetCode: '', ResetCodeExpire: '', ScreenTime: '', Increment: '', ProfileImagePath: '' };

  const [employees, setEmployees] = useState<IEmployee[]>([]);
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const connectionRef = useRef<any>(null);

  // Track admin's profile pic version
  const [photoVersion, setPhotoVersion] = useState<string>(Date.now().toString());
  // Track all employees' photo versions
  const [photoVersions, setPhotoVersions] = useState<{ [key: string]: string }>({});
  const [signalReady, setSignalReady] = useState(false);
  const [signalError, setSignalError] = useState<string | null>(null);

  // Chat Modal State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<IEmployee | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);

  // SignalR setup for live profile picture updates
  useEffect(() => {
    if ((window as any).$ && (window as any).$.hubConnection) setSignalReady(true);
  }, []);

  useEffect(() => {
    if (!signalReady || !user.Id) return;
    const $ = (window as any).$;
    const connection = $.hubConnection("https://localhost:44323/");
    const hubProxy = connection.createHubProxy("ProfileHub");
    connectionRef.current = connection;

    hubProxy.on("photoUpdated", (payload: { employeeId: number; version: number }) => {
      const idStr = payload.employeeId.toString();

      // Update admin photo
      if (idStr === user.Id) {
        setPhotoVersion(payload.version.toString());
      }

      // Update employee photo version
      setPhotoVersions((prev) => ({ ...prev, [idStr]: payload.version.toString() }));
    });

    connection.start()
      .done(() => console.log("✅ Connected to SignalR hub"))
      .fail((err: any) => {
        console.error("❌ SignalR connection failed:", err);
        setSignalError("Real-time updates unavailable.");
      });

    return () => connection.stop();
  }, [signalReady, user.Id]);

  // Fetch Employees
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await axios.get<IEmployee[]>('https://localhost:44323/api/user', { headers: { Authorization: token } });
        setEmployees(res.data.filter(emp => emp.Id !== user.Id)); 
      } catch (err) { console.error('❌ Error fetching employees:', err); }
    };
    fetchEmployees();
  }, [token]);

  // Fetch Tasks
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await axios.get<ITask[]>('https://localhost:44323/api/task', { headers: { Authorization: token } });
        setTasks(res.data);
      } catch (err) { console.error('❌ Error fetching tasks:', err); }
    };
    fetchTasks();
  }, [token]);

  // Task Filtering Logic
  const filteredTasks = tasks.filter((t) => new Date(t.CreatedDate).getMonth() + 1 === selectedMonth);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const normalizeDate = (dateStr: string) => { const d = new Date(dateStr); d.setHours(0, 0, 0, 0); return d; };
  const ongoingTasks = filteredTasks.filter((t) => (normalizeDate(t.Deadline).getTime() >= today.getTime()) && t.Status !== 'Completed');
  const expiredTasks = filteredTasks.filter((t) => normalizeDate(t.Deadline).getTime() < today.getTime() && t.Status !== 'Completed');
  const completedTasks = filteredTasks.filter((t) => t.Status === 'Completed');

  // Profile Picture Component (supports live updates)
  function ProfilePicInline({ userId, token, size = 40, version }: { userId: string; token?: string; size?: number; version?: string }) {
    const [src, setSrc] = useState<string>('/logo.png');

    useEffect(() => {
      let cancelled = false;
      let objectUrl: string | null = null;
      const fetchPic = async () => {
        try {
          const res = await axios.get<Blob>(`https://localhost:44323/api/user/profilepic/${userId}${version ? `?v=${version}` : ''}`, {
            responseType: 'blob', headers: token ? { Authorization: `${token}` } : undefined,
          });
          objectUrl = URL.createObjectURL(res.data);
          if (!cancelled) setSrc(objectUrl);
        } catch { setSrc('/logo.png'); }
      };
      fetchPic();
      return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [userId, token, version]);

    return <img src={src} alt="Profile" width={size} height={size} className="rounded-full border border-gray-300 object-cover" />;
  }

  // Create/Get conversation
  function GettingOrCreatingConversation(userId: string, targetUserId: string) {
    interface IConversation { Id: number; Title: null | string; CreatedAt: string; }
    const dto = { MeUserId: Number(userId), OtherUserId: Number(targetUserId) };
    axios.post<IConversation>("https://localhost:44323/api/chat/conversation/or-create", dto, { headers: { Authorization: token } })
      .then((res) => setConversationId(res.data.Id))
      .catch((err) => console.error("Error creating/fetching conversation:", err));
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <div className="flex flex-col flex-1">
        {/* Header */}
        <header className="bg-white shadow-md h-20 flex items-center justify-between px-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <a href="/"><Image src="/logo.png" alt="Company Logo" width={150} height={60} priority /></a>
            <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <a href={`../profileedit/${user.Id}`} className="flex items-center gap-2 hover:underline">
              <ProfilePicInline userId={user.Id} token={token} size={40} version={photoVersion} />
              <span className="font-medium text-gray-700">{user.Name}</span>
            </a>
          </div>
        </header>

        {/* Main */}
        <main className="flex-grow grid grid-cols-1 lg:grid-cols-2">
          {/* Employees Section */}
          <div className="bg-gray-50 border-r border-gray-200 p-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">This is your employee list</h2>
            <h3 className="text-2xl font-bold text-indigo-700 mb-6">Employees</h3>
            <div className="grid gap-6 md:grid-cols-2">
              {employees.map((employee) => (
                <div key={employee.Id} className="bg-white shadow-md rounded-xl p-5 border border-gray-200 hover:shadow-lg transition flex items-center gap-4">
                  <ProfilePicInline 
                    userId={employee.Id} 
                    token={token} 
                    size={50} 
                    version={photoVersions[employee.Id] || Date.now().toString()} 
                  />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{employee.Name}</h3>
                    <p className="text-sm text-gray-600">Email: {employee.Email}</p>
                    <p className="text-sm text-gray-600">Phone: {employee.PhoneNumber}</p>
                    <div className="mt-3 flex gap-2">
                      <button className="px-3 py-1 text-sm font-medium rounded-md bg-indigo-500 text-white hover:bg-indigo-600" onClick={() => router.push(`../admin/employeedetails/${employee.Id}`)}>Details</button>
                      <button className="px-3 py-1 text-sm font-medium rounded-md bg-green-500 text-white hover:bg-green-600" onClick={() => router.push(`../admin/addingtask/${employee.Id}`)}>Assign Task</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tasks Section */}
          <div className="bg-gray-200 p-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">This is your tasks list of this month</h2>
            <div className="flex items-center justify-between mb-6 text-gray-700">
              <h3 className="text-2xl font-bold text-gray-900">Tasks</h3>
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="border border-gray-300 bg-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString("default", { month: "long" })}</option>)}
              </select>
            </div>

            <div className="space-y-8">
              <section>
                <h4 className="text-lg font-bold text-blue-700 mb-3">Ongoing Tasks</h4>
                {ongoingTasks.map((task) => (
                  <a href={`../task/edittask/${task.Id}`}>
                  <div key={task.Id} className="bg-blue-100 border-l-4 border-blue-500 p-4 rounded-md shadow-sm mb-2">
                    <h5 className="font-semibold text-blue-800">{task.Title}</h5>
                    <p className="text-sm text-gray-700">{task.Description}</p>
                    <p className="text-xs text-gray-500">Deadline: {new Date(task.Deadline).toLocaleDateString()}</p>
                  </div>
                  </a>
                ))}
              </section>

              <section>
                <h4 className="text-lg font-bold text-red-700 mb-3">Expired Tasks</h4>
                {expiredTasks.map((task) => (
                  <a href={`../task/edittask/${task.Id}`}>
                  <div key={task.Id} className="bg-red-100 border-l-4 border-red-500 p-4 rounded-md shadow-sm mb-2">
                    <div className="flex items-center justify-between">
                      <h5 className="font-semibold text-red-800">{task.Title}</h5>
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    </div>
                    <p className="text-sm text-gray-700">{task.Description}</p>
                  </div>
                  </a>
                ))}
              </section>

              <section>
                <h4 className="text-lg font-bold text-green-700 mb-3">Completed Tasks</h4>
                {completedTasks.map((task) => (
                  <a href={`../task/edittask/${task.Id}`}>
                  <div key={task.Id} className="bg-green-100 border-l-4 border-green-500 p-4 rounded-md shadow-sm mb-2">
                    <h5 className="font-semibold text-green-800">{task.Title}</h5>
                    <p className="text-sm text-gray-700">{task.Description}</p>
                  </div>
                  </a>
                ))}
              </section>
            </div>
          </div>
        </main>

        <footer className="bg-gray-900 text-white text-center p-6 text-sm font-medium">
          © {new Date().getFullYear()} E-Group BD. All rights reserved.
        </footer>
      </div>

      {/* Chat Widget */}
      <div className="fixed bottom-6 right-6">
        {!isChatOpen && <button onClick={() => setIsChatOpen(true)} className="px-4 py-2 rounded-full bg-purple-600 text-white shadow-lg hover:bg-purple-700 transition">Chat</button>}
        {isChatOpen && (
          <div className="w-120 h-96 bg-white shadow-lg rounded-lg flex flex-col overflow-hidden">
            <div className="bg-purple-600 text-white p-2 flex justify-between items-center">
              <span>{selectedEmployee ? selectedEmployee.Name : 'Chat'}</span>
              <button onClick={() => setIsChatOpen(false)}>✖</button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              <div className="w-1/3 border-r border-gray-200 overflow-y-auto text-gray-800">
                {employees.map(emp => (
                  <div key={emp.Id} className={`p-2 cursor-pointer flex items-center gap-2 hover:bg-purple-100 ${selectedEmployee?.Id === emp.Id ? 'bg-purple-200 font-semibold' : ''}`}
                    onClick={() => { setSelectedEmployee(emp); GettingOrCreatingConversation(user.Id, emp.Id); }}>
                    <ProfilePicInline userId={emp.Id} token={token} size={30} version={photoVersions[emp.Id]} />
                    <span>{emp.Name}</span>
                  </div>
                ))}
              </div>

              <div className="flex-1 flex flex-col text-gray-800">
                {selectedEmployee && conversationId ? (
                  <ChatWidget userId={user.Id} token={token} conversationId={conversationId} />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-400">
                    Select an employee to start chatting
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
