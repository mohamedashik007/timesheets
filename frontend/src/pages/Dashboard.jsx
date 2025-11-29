import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Data State
  const [entries, setEntries] = useState({}); // Map: "YYYY-MM-DD" -> hours
  const [teamMembers, setTeamMembers] = useState([]);
  
  // UI State
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [viewingUserId, setViewingUserId] = useState('');

  // --- 1. INITIAL LOAD ---
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
        setViewingUserId(userData._id);

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

  // --- 2. FETCH DATA ---
  const fetchTimesheets = useCallback(async () => {
    if (!user) return;
    const targetId = viewingUserId || user._id;
    try {
      const res = await fetch(`http://localhost:3000/api/timesheets?month=${selectedMonth}&userId=${targetId}`, { 
        credentials: 'include' 
      });
      if (res.ok) {
        const data = await res.json();
        // Convert array to map for easier lookup: { "2023-11-01": 8, ... }
        const entryMap = {};
        data.forEach(item => {
          const dateKey = item.date.slice(0, 10);
          entryMap[dateKey] = item.hours;
        });
        setEntries(entryMap);
      }
    } catch (e) {
      console.error(e);
    }
  }, [selectedMonth, viewingUserId, user]);

  useEffect(() => {
    fetchTimesheets();
  }, [fetchTimesheets]);

  // --- 3. SAVE HANDLER ---
  const saveEntry = async (dateStr, hours) => {
    // Optimistic Update
    setEntries(prev => ({ ...prev, [dateStr]: hours }));

    try {
      await fetch('http://localhost:3000/api/timesheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: viewingUserId,
          date: dateStr,
          hours: hours
        })
      });
    } catch (error) {
      console.error("Failed to save", error);
      // Ideally revert state here on failure
      fetchTimesheets();
    }
  };

  const handleLogout = () => {
    window.location.href = "http://localhost:3000/auth/logout";
  };

  // --- CALENDAR LOGIC ---
  const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month - 1, 1).getDay(); // 0 = Sun, 1 = Mon

  const renderCalendar = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = getDaysInMonth(year, month);
    const startDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    
    // Empty cells for days before the 1st
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-32 bg-transparent"></div>);
    }

    // Day Cells
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const hours = entries[dateStr] || 0;

      days.push(
        <div key={dateStr} className="h-32 bg-gray-200 rounded-lg p-2 flex flex-col justify-between relative shadow-inner">
          {/* Day Number */}
          <div className="text-right text-lg font-bold text-gray-700">{d}</div>

          <div className="flex flex-col items-center gap-2">
            {/* Input Display */}
            <div className="bg-white w-12 h-10 flex items-center justify-center text-xl font-bold rounded shadow-sm">
              {hours}
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              <button 
                onClick={() => saveEntry(dateStr, Math.max(0, hours - 1))}
                className="w-8 h-8 flex items-center justify-center bg-green-300 hover:bg-green-400 active:bg-green-500 rounded text-xl font-bold pb-1 transition-colors"
              >
                -
              </button>
              <button 
                onClick={() => saveEntry(dateStr, Math.min(24, hours + 1))}
                className="w-8 h-8 flex items-center justify-center bg-red-300 hover:bg-red-400 active:bg-red-500 rounded text-xl font-bold pb-1 transition-colors"
              >
                +
              </button>
            </div>
          </div>
        </div>
      );
    }

    return days;
  };

  const totalHours = Object.values(entries).reduce((sum, h) => sum + h, 0);

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
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

      <main className="max-w-6xl mx-auto py-8 px-4">
        
        {/* Controls Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
          <div className="flex gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Month</label>
              <input 
                type="month" 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            {user.role === 'team_lead' && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Viewing</label>
                <select 
                  value={viewingUserId} 
                  onChange={(e) => setViewingUserId(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 min-w-[150px]"
                >
                  <option value={user._id}>My Data</option>
                  {teamMembers.map(m => (
                    <option key={m._id} value={m._id}>{m.displayName}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="bg-blue-50 px-4 py-2 rounded border border-blue-100 text-blue-800">
            <span className="text-xs font-bold uppercase mr-2">Total Hours:</span>
            <span className="text-xl font-bold">{totalHours}</span>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-4 mb-4 text-center">
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
              <div key={day} className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-4">
            {renderCalendar()}
          </div>
        </div>

      </main>
    </div>
  );
};

export default Dashboard;