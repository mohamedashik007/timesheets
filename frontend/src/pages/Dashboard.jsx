import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // We use credentials: 'include' to ensure the session cookie is sent
        const response = await fetch('http://localhost:3000/api/current_user', {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data);
        } else {
          // If 401 Not Authenticated, redirect to Login
          navigate('/');
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [navigate]);

  const handleLogout = () => {
    // Redirect to backend logout route. 
    // This clears the HTTP-only cookie on the server and redirects back to client '/'
    window.location.href = "http://localhost:3000/logout";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-500 text-lg">Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-800">Timesheets</h1>
            </div>
            <div className="flex items-center gap-4">
              {user && (
                <div className="flex items-center gap-2">
                  <img 
                    src={user.image} 
                    alt={user.displayName} 
                    className="h-8 w-8 rounded-full border border-gray-200"
                  />
                  <div className="text-sm">
                    <p className="font-medium text-gray-700">{user.displayName}</p>
                    <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                  </div>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="ml-4 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex flex-col items-center justify-center">
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">Welcome Back!</h2>
            <p className="text-gray-500">
              You are logged in as <span className="font-bold">{user?.email}</span>
            </p>
            {/* Future timesheet content will go here */}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;