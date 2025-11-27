import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/current_user', {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          // Security Check: If not admin, kick them out
          if (data.role !== 'admin') {
            navigate('/dashboard');
            return;
          }
          setUser(data);
        } else {
          navigate('/');
        }
      } catch (error) {
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [navigate]);

  const handleLogout = () => {
    window.location.href = "http://localhost:3000/logout";
  };

  if (loading) return <div className="p-10 text-center">Loading Admin Panel...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-bold text-white">Timesheets Admin</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-300">{user.email} (Admin)</span>
              <button
                onClick={handleLogout}
                className="px-3 py-2 text-sm bg-red-600 hover:bg-red-700 rounded-md text-white transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold mb-6">Admin Control Center</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Placeholder for User Management */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
            <h3 className="text-lg font-semibold mb-2 text-blue-400">User Management</h3>
            <p className="text-gray-400 text-sm mb-4">Add, edit, or remove users and assign roles.</p>
            <button className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition">Manage Users</button>
          </div>

          {/* Placeholder for Reports */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
            <h3 className="text-lg font-semibold mb-2 text-green-400">Time Reports</h3>
            <p className="text-gray-400 text-sm mb-4">View cumulative hours by team or organization.</p>
            <button className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition">View Reports</button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;