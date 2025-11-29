import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Data State
  const [entries, setEntries] = useState({}); // { "2023-11-01": 8, ... }
  const [modifiedDates, setModifiedDates] = useState(new Set()); // Track changed dates
  const [teamMembers, setTeamMembers] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // UI State
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
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

  // --- 2. FETCH & PREPARE DATA ---
  const fetchTimesheets = useCallback(async () => {
    if (!user) return;
    const targetId = viewingUserId || user._id;
    
    try {
      const res = await fetch(`http://localhost:3000/api/timesheets?month=${selectedMonth}&userId=${targetId}`, { 
        credentials: 'include' 
      });
      
      if (res.ok) {
        const dbData = await res.json();
        const entryMap = {};
        
        // 1. Populate from DB
        dbData.forEach(item => {
          const dateKey = item.date.slice(0, 10);
          entryMap[dateKey] = item.hours;
        });

        // 2. Apply Defaults (8 hours for weekdays if empty)
        const [year, month] = selectedMonth.split('-').map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();

        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const dayOfWeek = new Date(dateStr).getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

          // If no data from DB and it's a weekday, set default 8
          if (entryMap[dateStr] === undefined && !isWeekend) {
            entryMap[dateStr] = 8;
          }
        }

        setEntries(entryMap);
        setModifiedDates(new Set());
        setHasUnsavedChanges(false);
      }
    } catch (e) {
      console.error(e);
    }
  }, [selectedMonth, viewingUserId, user]);

  useEffect(() => {
    fetchTimesheets();
  }, [fetchTimesheets]);

  // --- 3. LOCAL UPDATES ---
  
  const updateLocalEntry = (dateStr, newHours) => {
    // Validate range 0-24
    let val = parseFloat(newHours);
    if (isNaN(val)) val = 0;
    if (val < 0) val = 0;
    if (val > 24) val = 24;

    setEntries(prev => ({ ...prev, [dateStr]: val }));
    setModifiedDates(prev => new Set(prev).add(dateStr));
    setHasUnsavedChanges(true);
  };

  const handleIncrement = (dateStr, currentVal) => {
    updateLocalEntry(dateStr, (parseFloat(currentVal || 0) + 0.5));
  };

  const handleDecrement = (dateStr, currentVal) => {
    updateLocalEntry(dateStr, (parseFloat(currentVal || 0) - 0.5));
  };

  // --- 4. BULK SAVE ---
  const handleSave = async () => {
    if (modifiedDates.size === 0) return;
    setIsSaving(true);

    try {
      // Convert map to array for the API
      const updates = Array.from(modifiedDates).map(date => ({
        date,
        hours: entries[date]
      }));

      const res = await fetch('http://localhost:3000/api/timesheets/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: viewingUserId,
          entries: updates
        })
      });

      if (res.ok) {
        setModifiedDates(new Set());
        setHasUnsavedChanges(false);
        // Optional: Re-fetch to ensure sync, but local state is arguably freshest
      } else {
        alert('Failed to save changes');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    window.location.href = "http://localhost:3000/auth/logout";
  };

  // --- RENDER HELPERS ---
  const renderCalendar = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const startDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
    
    const cells = [];
    
    // Empty spacers
    for (let i = 0; i < startDay; i++) {
      cells.push(<div key={`empty-${i}`} className="h-32 bg-transparent"></div>);
    }

    // Day Cells
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const hours = entries[dateStr] ?? 0; // Use nullish coalescing
      const isModified = modifiedDates.has(dateStr);

      cells.push(
        <div key={dateStr} className={`h-32 rounded-lg p-2 flex flex-col justify-between relative shadow-sm border ${isModified ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-100 border-gray-200'}`}>
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="text-xs text-gray-400">
              {isModified && '●'}
            </div>
            <div className="text-lg font-bold text-gray-700">{d}</div>
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center gap-2">
            
            <div className="flex items-center gap-2">
               {/* Input Field */}
              <input 
                type="number"
                value={hours}
                onChange={(e) => updateLocalEntry(dateStr, e.target.value)}
                onFocus={(e) => e.target.select()}
                step="0.5"
                min="0"
                max="24"
                className="w-16 h-10 text-center text-xl font-bold rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex gap-2 w-full justify-center">
              <button 
                onClick={() => handleDecrement(dateStr, hours)}
                className="w-8 h-8 flex items-center justify-center bg-green-300 hover:bg-green-400 rounded text-xl font-bold pb-1 transition-colors"
                tabIndex="-1"
              >
                -
              </button>
              <button 
                onClick={() => handleIncrement(dateStr, hours)}
                className="w-8 h-8 flex items-center justify-center bg-red-300 hover:bg-red-400 rounded text-xl font-bold pb-1 transition-colors"
                tabIndex="-1"
              >
                +
              </button>
            </div>
          </div>
        </div>
      );
    }
    return cells;
  };

  const totalHours = Object.values(entries).reduce((sum, h) => sum + (parseFloat(h) || 0), 0);

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-800">Timesheets</h1>
          </div>
          <div className="flex items-center gap-4">
            {/* Added optional chaining here to fix crash */}
            <div className="flex items-center gap-2">
              {user?.image && <img src={user.image} alt="" className="h-8 w-8 rounded-full bg-gray-200" />}
              <div className="text-sm hidden sm:block">
                <p className="font-medium text-gray-700">{user?.displayName}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="text-sm text-red-600 hover:text-red-800 font-medium">Logout</button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto py-8 px-4">
        
        {/* Controls */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4 sticky top-20 z-10 bg-gray-50 py-2">
          <div className="flex gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Period</label>
              <input 
                type="month" 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            {user?.role === 'team_lead' && (
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

          <div className="flex items-center gap-4">
            <div className="bg-blue-50 px-4 py-2 rounded border border-blue-100 text-blue-800">
              <span className="text-xs font-bold uppercase mr-2">Total:</span>
              <span className="text-xl font-bold">{totalHours}</span>
            </div>
            
            <button 
              onClick={handleSave}
              disabled={!hasUnsavedChanges || isSaving}
              className={`px-6 py-2 rounded font-bold text-white shadow-sm transition-all ${
                hasUnsavedChanges 
                  ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-md' 
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="grid grid-cols-7 gap-4 mb-4 text-center">
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
              <div key={day} className="text-sm font-semibold text-gray-500 uppercase tracking-wider hidden sm:block">
                {day}
              </div>
            ))}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-sm font-semibold text-gray-500 uppercase tracking-wider sm:hidden">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2 sm:gap-4">
            {renderCalendar()}
          </div>
        </div>

      </main>
    </div>
  );
};

export default Dashboard;