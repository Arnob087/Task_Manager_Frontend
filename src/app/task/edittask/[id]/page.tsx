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
  AssignedTo: string;
}

interface IEmployee {
  Id: string;
  Name: string;
  Email: string;
  PhoneNumber: string;
  Role: string;
  ScreenTime: string | null;
  Increment: string | null;
}

export default function EditTask() {
  const router = useRouter();
  const params = useParams();
  const  id  = params.id as string ;
  const [task, setTask] = useState<ITask | null>(null);
  const [loading, setLoading] = useState(true);
  const token: string = Cookies.get("token") || "";

  const [formData, setFormData] = useState<ITask | null>(null);
  const [employees, setEmployees] = useState<IEmployee[]>([]);

  // Fetch task details
  useEffect(() => {
    if (!id) return;
    const fetchTask = async () => {
      try {
        const res = await axios.get<ITask>(
          `https://localhost:44323/api/task/${id}`,
          { headers: { Authorization: `${token}` } }
        );
        if (res.status === 200) {
          setTask(res.data);
          setFormData(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch task:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTask();
  }, [id, token]);

  // Fetch all employees for assignment
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await axios.get<IEmployee[]>(
          `https://localhost:44323/api/user`,
          { headers: { Authorization: `${token}` } }
        );
        if (res.status === 200) {
          setEmployees(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch employees:", err);
      }
    };
    fetchEmployees();
  }, [token]);

  const handleChange = (field: keyof ITask, value: any) => {
    if (!formData) return;
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    const updatedTask = {
      ...formData,
      UpdatedDate: new Date().toISOString(),
      Deadline: new Date(formData.Deadline).toISOString(),
      StartedAt: formData.StartedAt || null,
    };

    try {
      const res = await axios.put(
        `https://localhost:44323/api/task/update/${formData.Id}`,
        updatedTask,
        { headers: { Authorization: `${token}` } }
      );
      if (res.status === 200) {
        alert("Task updated successfully!");
        router.push(`/admin/dashboard`); // go back to task list
      }
    } catch (err) {
      console.error("Failed to update task:", err);
      alert("Failed to update task.");
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "1": return "Pending";
      case "2": return "In Progress";
      case "3": return "Completed";
      case "4": return "Cancelled";
      default: return "Unknown";
    }
  };

  if (loading) return <p className="text-center p-10">Loading task...</p>;
  if (!task) return <p className="text-center p-10">Task not found</p>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-pink-50 to-yellow-50">
      {/* Header */}
      <header className="bg-white shadow-md h-24 flex items-center justify-between px-8">
        <a href="/"><Image src="/logo.png" alt="Logo" width={180} height={70} /></a>
        <div className="text-gray-800 font-extrabold text-3xl">Edit Task</div>
      </header>

      <main className="p-8 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Task Details (Left side) */}
        <section className="bg-white p-6 rounded-xl shadow-xl text-gray-700 space-y-3">
          <h2 className="text-2xl font-extrabold text-gray-800 border-b-2 border-indigo-400 pb-2 mb-4">
            Task Details
          </h2>
          <p><span className="font-bold">Title:</span> {task.Title}</p>
          <p><span className="font-bold">Description:</span> {task.Description}</p>
          <p><span className="font-bold">Created At:</span> {new Date(task.CreatedAt).toLocaleString()}</p>
          <p><span className="font-bold">Updated At:</span> {new Date(task.UpdatedDate).toLocaleString()}</p>
          <p><span className="font-bold">Deadline:</span> {task.Deadline?.slice(0, 10)}</p>
          <p><span className="font-bold">Status:</span> {statusLabel(task.Status)}</p>
          <p><span className="font-bold">Started At:</span> {task.StartedAt ? new Date(task.StartedAt).toLocaleString() : "Not started"}</p>
          <p><span className="font-bold">Last Updated:</span> {task.LastUpdated}</p>
          <p><span className="font-bold">File Uploaded:</span> {task.FileUploaded ? "Yes" : "No"}</p>
          <p><span className="font-bold">Assigned To:</span> 
            {employees.find(emp => emp.Id === task.AssignedTo)?.Name || "Unknown"}
          </p>
        </section>

        {/* Edit Form (Right side) */}
        <section className="bg-white p-6 rounded-xl shadow-xl">
          <h2 className="text-2xl font-extrabold text-gray-800 border-b-2 border-pink-400 pb-2 mb-4">
            Edit Task
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              value={formData?.Title || ""}
              onChange={(e) => handleChange("Title", e.target.value)}
              className="input input-bordered w-full border-blue-400 text-lg font-semibold"
              required
            />
            <textarea
              value={formData?.Description || ""}
              onChange={(e) => handleChange("Description", e.target.value)}
              className="textarea textarea-bordered w-full border-blue-400 text-lg font-medium"
              required
            />
            <input
              type="date"
              value={formData?.Deadline?.slice(0, 10) || ""}
              onChange={(e) => handleChange("Deadline", e.target.value)}
              className="input input-bordered w-full border-blue-400 text-lg font-medium"
              required
            />
            <select
              value={formData?.Status || "1"}
              onChange={(e) => handleChange("Status", e.target.value)}
              className="select select-bordered w-full border-blue-400 text-lg font-medium"
            >
              <option value="1">Pending</option>
              <option value="2">In Progress</option>
              <option value="3">Completed</option>
              <option value="4">Cancelled</option>
            </select>

            {/* Employee selector */}
            <select
              value={formData?.AssignedTo || ""}
              onChange={(e) => handleChange("AssignedTo", e.target.value)}
              className="select select-bordered w-full border-blue-400 text-lg font-medium"
              required
            >
              <option value="">-- Select Employee --</option>
              {employees.map(emp => (
                <option key={emp.Id} value={emp.Id}>
                  {emp.Name} ({emp.Email})
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="btn bg-indigo-500 hover:bg-indigo-600 text-white w-full mt-2 text-lg font-bold py-3"
            >
              Save Changes
            </button>
          </form>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-black text-white text-center p-6 mt-8 text-lg font-semibold">
        © {new Date().getFullYear()} E-Group BD. All rights reserved.
      </footer>
    </div>
  );
}
