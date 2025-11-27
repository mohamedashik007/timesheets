import React from 'react';

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Dashboard</h1>
        <p className="text-gray-600">Welcome! You have successfully logged in.</p>
        <p className="mt-4 text-sm text-gray-500">
          (We will implement the timesheet logic here next)
        </p>
      </div>
    </div>
  );
};

export default Dashboard;