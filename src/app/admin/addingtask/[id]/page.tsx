'use client';
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { useEffect, useState } from "react";
import axios from "axios";

interface ITask {
  Id: string;
  Title: string;
  Description: string;
  CreatedAt: string;
  UpdatedDate: string;
  Deadline: string;
  Status: string;
  StartedAt: string | null;
  LastUpdated: string;
  FileUploaded: boolean;
}

interface INewTask {
  Title: string;
  Description: string;
  CreatedAt: string;
  UpdatedDate: string;
  Deadline: string;
  Status: string;
  FileUploaded: boolean;
  AssignedTo?: string; 
}

interface IEmployee {
  Tasks: ITask[];
  Id: string;
  Name: string;
  Email: string;
  PhoneNumber: string;
  Role: string;
  ScreenTime: string | null;
  Increment: string | null;
  ProfileImagePath: string;
}

export default function AddingTask() {
  const router = useRouter();
  const { id } = useParams();
  const [employee, setEmployee] = useState<IEmployee | null>(null);
  const [loadingEmployee, setLoadingEmployee] = useState(true);
  const [selectedTask, setSelectedTask] = useState<ITask | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const token: string = Cookies.get("token") || "";

  const [newtask, setnewtask] = useState<INewTask>({
    Title: '',
    Description: '',
    CreatedAt: '',
    UpdatedDate: '',
    Deadline: '',
    Status: '',
    FileUploaded: false,
    AssignedTo: '', 
  });

  // Current time state for live countdown
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchEmployee = async () => {
    try {
      const res = await axios.get<IEmployee>(`https://localhost:44323/api/user/${id}/task`, {
        headers: { Authorization: `${token}` },
      });
      if (res.status === 200) setEmployee(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingEmployee(false);
    }
  };

  useEffect(() => { fetchEmployee(); }, [id]);

  // Sort tasks: nearest deadline first, expired tasks last
  const sortedTasks = (employee?.Tasks ?? []).slice().sort((a, b) => {
    const now = new Date().getTime();
    const deadlineA = new Date(a.Deadline).getTime();
    const deadlineB = new Date(b.Deadline).getTime();

    const diffA = deadlineA - now;
    const diffB = deadlineB - now;

    if (diffA <= 0 && diffB <= 0) return 0; // both expired
    if (diffA <= 0) return 1; // a expired, move down
    if (diffB <= 0) return -1; // b expired, move down

    return diffA - diffB; // both active, closest first
  });

  // Compute remaining time per task
  const getRemainingTime = (deadline: string) => {
    if (!deadline) return "No deadline set";

    const deadlineDate = new Date(deadline);
    const diff = deadlineDate.getTime() - currentTime.getTime();

    if (diff < 0) return "Expired";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    } else {
      // Deadline is today → show hours, minutes, seconds
      return `${hours}h ${minutes}m ${seconds}s`;
    }
  };

  const addnewtask = async () => {
    if (!newtask.Title || !newtask.Description || !newtask.Deadline) return;
    const task: INewTask = {
      ...newtask,
      CreatedAt: new Date().toISOString(),
      UpdatedDate: new Date().toISOString(),
      Status: "1",
      FileUploaded: false,
      AssignedTo: employee?.Id || "",
    };
    try {
      const res = await axios.post(`https://localhost:44323/api/task/create`, task, {
        headers: { Authorization: `${token}` },
      });
      if (res.status === 200) {
        setnewtask({ Title:'', Description:'', CreatedAt:'', UpdatedDate:'', Deadline:'', Status:'', FileUploaded:false });
        fetchEmployee();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openEditModal = (task: ITask) => { setSelectedTask(task); setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); setSelectedTask(null); };
  const handleEditChange = (field: keyof ITask, value: any) => { if (!selectedTask) return; setSelectedTask({ ...selectedTask, [field]: value }); };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    const updatedTask = { 
      ...selectedTask, 
      UpdatedDate: new Date().toISOString(), 
      Deadline: new Date(selectedTask.Deadline).toISOString(), 
      StartedAt: selectedTask.StartedAt || null 
    };
    try {
      const res = await axios.put(`https://localhost:44323/api/task/update/${selectedTask.Id}`, updatedTask, { headers: { Authorization: `${token}` } });
      if (res.status === 200) fetchEmployee();
    } catch (err) { console.error(err); }
    closeModal();
  };

  const statusColor = (status: string) => {
    switch(status) {
      case "1": return "bg-yellow-100 text-yellow-900 border-yellow-400"; // Pending
      case "2": return "bg-blue-100 text-blue-900 border-blue-400"; // In Progress
      case "3": return "bg-green-100 text-green-900 border-green-400"; // Completed
      case "4": return "bg-red-100 text-red-900 border-red-400"; // Cancelled
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-pink-50 to-yellow-50">
      {/* Header */}
      <header className="bg-white shadow-md h-24 flex items-center justify-between px-8">
        <a href="/"><Image src="/logo.png" alt="Logo" width={180} height={70} /></a>
        <div className="text-gray-800 font-extrabold text-3xl">Employee Task Dashboard</div>
      </header>

      <main className="p-8 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Tasks List */}
        <section className="md:col-span-2">
          <h2 className="text-3xl font-extrabold mb-6 text-gray-800 border-b-4 border-indigo-300 pb-3">Assigned Tasks</h2>
          {sortedTasks.length > 0 ? (
            <ul className="space-y-6">
              {sortedTasks.map((task, index) => (
                <li key={index} className={`p-6 border-l-8 ${statusColor(task.Status)} bg-white rounded-xl shadow-xl hover:scale-105 transition transform flex flex-col md:flex-row md:justify-between items-start md:items-center`}>
                  <div>
                    <p className="text-2xl font-bold">{task.Title}</p>
                    <p className="text-lg text-gray-700 mt-1">{task.Description}</p>
                    <p className="text-sm mt-2">Due: <span className="font-semibold">{task.Deadline?.slice(0,10) || 'No date'}</span></p>
                    <p className="text-base mt-1 font-bold text-purple-700">Remaining: {getRemainingTime(task.Deadline)}</p>
                  </div>
                  <div className="flex gap-3 mt-4 md:mt-0">
                    <button className="btn btn-md bg-indigo-500 hover:bg-indigo-600 text-white font-bold px-6 py-2" onClick={() => openEditModal(task)}>Edit</button>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="text-gray-600 text-lg">No tasks assigned yet.</p>}
        </section>

        {/* Assign New Task Form */}
        <section className="bg-white shadow-xl rounded-xl p-8">
          <h2 className="text-3xl font-extrabold mb-6 text-gray-800 border-b-4 border-pink-300 pb-3">Assign New Task</h2>
          <form onSubmit={(e)=>{e.preventDefault(); addnewtask()}} className="space-y-6">
            <input type="text" placeholder="Task Title" value={newtask.Title} onChange={(e)=>setnewtask({...newtask, Title:e.target.value})} className="input input-bordered w-full border-purple-400 focus:ring-2 focus:ring-purple-500 text-lg font-semibold" required />
            <textarea placeholder="Description" value={newtask.Description} onChange={(e)=>setnewtask({...newtask, Description:e.target.value})} className="textarea textarea-bordered w-full border-purple-400 focus:ring-2 focus:ring-purple-500 text-lg font-medium" required />
            <input type="date" value={newtask.Deadline.slice(0,10)} onChange={(e)=>setnewtask({...newtask, Deadline: new Date(e.target.value).toISOString()})} className="input input-bordered w-full border-purple-400 focus:ring-2 focus:ring-purple-500 text-lg font-medium" required />
            <input type="text" value={employee?.Name ?? ''} readOnly className="input input-bordered w-full bg-gray-100 text-gray-700 text-lg font-medium" />
            <button type="submit" className="btn bg-pink-500 hover:bg-pink-600 text-white w-full mt-2 text-lg font-bold py-3">Assign Task</button>
          </form>
        </section>
      </main>

      {/* Edit Modal */}
      {isModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8 animate-fadeIn">
            <h2 className="text-2xl font-extrabold mb-6 text-gray-800">Edit Task</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <input type="text" value={selectedTask.Title} onChange={(e)=>handleEditChange('Title', e.target.value)} className="input input-bordered w-full border-blue-400 focus:ring-2 focus:ring-blue-500 text-lg font-semibold" />
              <textarea value={selectedTask.Description} onChange={(e)=>handleEditChange('Description', e.target.value)} className="textarea textarea-bordered w-full border-blue-400 focus:ring-2 focus:ring-blue-500 text-lg font-medium" />
              <input type="date" value={selectedTask.Deadline?.slice(0,10)} onChange={(e)=>handleEditChange('Deadline', e.target.value)} className="input input-bordered w-full border-blue-400 focus:ring-2 focus:ring-blue-500 text-lg font-medium" />
              <div className="flex justify-end gap-4 mt-4">
                <button type="button" onClick={closeModal} className="btn btn-outline text-lg font-semibold text-gray-800">Cancel</button>
                <button type="submit" className="btn bg-indigo-500 hover:bg-indigo-600 text-white text-lg font-bold">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-black text-white text-center p-6 mt-8 text-lg font-semibold">
        © {new Date().getFullYear()} E-Group BD. All rights reserved.
      </footer>
    </div>
  );
}
