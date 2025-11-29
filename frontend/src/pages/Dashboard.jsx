import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Data State
  const [entries, setEntries] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  
  // UI State
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [viewingUserId, setViewingUserId] = useState(''); // Empty = Me
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ date: '', hours: '', description: '' });

  // 1. Initial Load (Auth & Team Members)
  useEffect(() => {
    const init = async () => {
      try {
        const userRes = await fetch('http://localhost:3000/api/current_user', { credentials: 'include' });
        if (!userRes.ok) throw new Error('Auth failed');
        const userData = await userRes.json();
        
        if (userData.role === 'admin') {
          navigate('/admin');
          return;
        }
        setUser(userData);
        setViewingUserId(userData._id); // Default to viewing self

        // If Team Lead, fetch members
        if (userData.role === 'team_lead') {
          const membersRes = await fetch('http://localhost:3000/api/timesheets/members', { credentials: 'include' });
          if (membersRes.ok) setTeamMembers(await membersRes.json());
        }
      } catch (err) {
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [navigate]);

  // 2. Fetch Timesheets when Month or Viewed User changes
  useEffect(() => {
    if (!user) return;
    const fetchTimesheets = async () => {
      const targetId = viewingUserId || user._id;
      const res = await fetch(`http://localhost:3000/api/timesheets?month=${selectedMonth}&userId=${targetId}`, { 
        credentials: 'include' 
      });
      if (res.ok) setEntries(await res.json());
    };
    fetchTimesheets();
  }, [selectedMonth, viewingUserId, user]);

  const handleLogout = () => {
    window.location.href = "http://localhost:3000/auth/logout";
  };

  // --- FORM HANDLERS ---

  const handleEditClick = (entry) => {
    setFormData({
      date: entry.date.slice(0, 10),
      hours: entry.hours,
      description: entry.description || ''
    });
    setIsEditing(true);
  };

  const handleAddNewClick = () => {
    // Default to today (if in current month) or 1st of selected month
    const today = new Date().toISOString().slice(0, 10);
    const firstOfMonth = `${selectedMonth}-01`;
    setFormData({
      date: today.startsWith(selectedMonth) ? today : firstOfMonth,
      hours: '',
      description: ''
    });
    setIsEditing(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const res = await fetch('http://localhost:3000/api/timesheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        userId: viewingUserId,
        ...formData
      })
    });

    if (res.ok) {
      setIsEditing(false);
      // Refresh list
      const targetId = viewingUserId;
      const refreshRes = await fetch(`http://localhost:3000/api/timesheets?month=${selectedMonth}&userId=${targetId}`, { 
        credentials: 'include' 
      });
      if (refreshRes.ok) setEntries(await refreshRes.json());
    } else {
      alert('Failed to save entry');
    }
  };

  // Stats Calculation
  const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold">T</div>
            <h1 className="text-xl font-bold text-gray-800">Timesheets</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <img src={user.image} alt="" className="h-8 w-8 rounded-full bg-gray-200" />
              <div className="text-sm">
                <p className="font-medium text-gray-700">{user.displayName}</p>
                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="text-sm text-red-600 hover:text-red-800 font-medium">Logout</button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto py-8 px-4">
        
        {/* --- CONTROLS BAR --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          
          <div className="flex items-center gap-4">
            {/* Month Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Period</label>
              <input 
                type="month" 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Team Lead Context Switcher */}
            {user.role === 'team_lead' && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Viewing</label>
                <select 
                  value={viewingUserId} 
                  onChange={(e) => setViewingUserId(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-w-[200px]"
                >
                  <option value={user._id}>My Timesheet</option>
                  <optgroup label="Team Members">
                    {teamMembers.map(m => (
                      <option key={m._id} value={m._id}>{m.displayName}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            )}
          </div>

          {/* Stats Card */}
          <div className="bg-white px-6 py-3 rounded-lg shadow-sm border border-gray-200 flex items-center gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Total Hours</p>
              <p className="text-2xl font-bold text-blue-600">{totalHours}</p>
            </div>
            <button 
              onClick={handleAddNewClick}
              className="ml-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
            >
              + Add Entry
            </button>
          </div>
        </div>

        {/* --- TIMESHEET LIST --- */}
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          {entries.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              No entries found for {selectedMonth}. Click "Add Entry" to start.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entries.map((entry) => (
                  <tr key={entry._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {new Date(entry.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', weekday: 'short' })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {entry.description || <span className="italic text-gray-400">No description</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                      {entry.hours}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => handleEditClick(entry)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </main>

      {/* --- MODAL --- */}
      {isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {viewingUserId !== user._id ? `Edit Entry for Member` : 'Edit Entry'}
            </h3>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input 
                  type="date" 
                  required
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Hours Worked</label>
                <input 
                  type="number" 
                  required
                  min="0.5"
                  max="24"
                  step="0.5"
                  value={formData.hours}
                  onChange={e => setFormData({...formData, hours: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea 
                  rows="3"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="What did you work on?"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;