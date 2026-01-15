'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import axios from 'axios';
import ChatWidget from '@/app/Components/ChatWidget';

interface IUser {
  Id: string;
  Name: string;
  Email: string;
  Uname: string;
  Role: string;
  ProfileImagePath: string;
}

interface ITask {
  Id: string;
  Title: string;
  Description: string;
  Deadline: string;
  Status: number;
  StartedAt: string | null;
  LastUpdated: string;
  FileUploaded: boolean;
}

interface IEmployee {
  Tasks: ITask[];
  Id: string;
  Name: string;
  Email: string;
  Role: string;
  ProfileImagePath: string;
}

interface IConversation {
  Id: number;
  Title: null | string;
  CreatedAt: string;
}

export default function EmployeeDashboard() {
  const router = useRouter();
  const token = Cookies.get('token') || '';
  const user: IUser = Cookies.get('user')
    ? JSON.parse(Cookies.get('user') || '{}')
    : { Id: '', Name: '', Email: '', Uname: '', Role: '', ProfileImagePath: '' };

  const [employee, setEmployee] = useState<IEmployee | null>(null);
  const [employees, setEmployees] = useState<IEmployee[]>([]);
  const [selectedUser, setSelectedUser] = useState<IEmployee | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [photoVersions, setPhotoVersions] = useState<{ [key: string]: string }>({});

  // ================= SignalR for live profile photo =================
  const connectionRef = useRef<any>(null);
  const [photoVersion, setPhotoVersion] = useState<string>(Date.now().toString());
  const [signalReady, setSignalReady] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<IEmployee | null>(null);

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
      if (payload.employeeId.toString() === user.Id) {
        setPhotoVersion(payload.version.toString());
      }
    });

    connection.start()
      .done(() => console.log("✅ Connected to SignalR hub"))
      .fail((err: any) => console.error("❌ SignalR connection failed:", err));

    return () => connection.stop();
  }, [signalReady, user.Id]);

  // ================= Fetch Tasks =================
  const fetchTasks = async () => {
    if (!user.Id || !token) return;
    try {
      const res = await axios.get<IEmployee>(
        `https://localhost:44323/api/user/${user.Id}/task`,
        { headers: { Authorization: token } }
      );
      if (res.status === 200) setEmployee(res.data);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  };

  // ================= Fetch All Employees =================
  const fetchEmployees = async () => {
    try {
      const res = await axios.get<IEmployee[]>(
        `https://localhost:44323/api/user`,
        { headers: { Authorization: token } }
      );
      if (res.status === 200) setEmployees(res.data.filter(emp => emp.Id !== user.Id)); 
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  // ================= Get or Create Conversation =================
  function GettingOrCreatingConversation(userId: string, targetUserId: string) {
    interface IConversation { Id: number; Title: null | string; CreatedAt: string; }
    const dto = { MeUserId: Number(userId), OtherUserId: Number(targetUserId) };
    axios
      .post<IConversation>("https://localhost:44323/api/chat/conversation/or-create", dto, { headers: { Authorization: token } })
      .then((res) => setConversationId(res.data.Id))
      .catch((err) => console.error("Error creating/fetching conversation:", err));
  }

  useEffect(() => {
    fetchTasks();
    fetchEmployees();
  }, [user.Id, token]);

  // ================= ProfilePicInline Component =================
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

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-indigo-200 via-pink-200 to-yellow-200 flex flex-col">
      {/* ================= Header ================= */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Image src="/logo.png" width={180} height={70} alt="Logo" />
          <h1 className="text-3xl font-bold">Employee Dashboard</h1>
        </div>

        {/* ================= Top Right Profile ================= */}
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => router.push(`../profileedit/${user.Id}`)}
        >
          <ProfilePicInline userId={user.Id} size={50} version={photoVersion} />
          <span className="font-medium text-gray-700 hover:underline">{user.Name}</span>
        </div>
      </header>

      <div className="flex gap-8 flex-1">
        {/* ================= Main Content: Tasks ================= */}
        <main className="flex-1">
          <section>
            <h2 className="text-2xl font-bold mb-4">Assigned Tasks</h2>
            {employee?.Tasks?.length ? (
              <div className="grid gap-4 md:grid-cols-2 text-gray-800">
                {employee.Tasks.map((task, idx) => (
                  <a href={`../employee/taskdetails/${task.Id}`}>
                  <div key={task.Id} className="bg-white p-4 rounded shadow">
                    <h3 className="font-semibold">{idx + 1}. {task.Title}</h3>
                    <p>{task.Description}</p>
                    <p>Status: {['Not started', 'Pending', 'In Progress', 'Completed', 'Cancelled'][task.Status]}</p>
                    <p>Deadline: {new Date(task.Deadline).toLocaleDateString()}</p>
                  </div>
                  </a>
                ))}
              </div>
            ) : (
              <p>No tasks assigned</p>
            )}
          </section>
        </main>

        {/* ================= Chat Widget ================= */}
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
    </div>
  );
}
