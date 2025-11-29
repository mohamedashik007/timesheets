import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [entries, setEntries] = useState({});
  const [modifiedDates, setModifiedDates] = useState(new Set());
  const [teamMembers, setTeamMembers] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [viewingUserId, setViewingUserId] = useState('');

  // --- LOGIC: ALLOW CURRENT & PREVIOUS MONTH ---
  const isMonthEditable = () => {
    // We compare strings "YYYY-MM" to avoid timezone headaches
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    // 1. Calculate Previous Month
    let prevYear = currentYear;
    let prevMonth = currentMonth - 1;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }
    
    // 2. Create String "YYYY-MM" (e.g., "2023-10")
    const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
    
    // 3. Allow if Selected Month >= Previous Month
    return selectedMonth >= prevMonthStr;
  };

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

  const fetchTimesheets = useCallback(async () => {
    const targetId = viewingUserId || user?._id;
    if (!targetId) return;
    
    try {
      const res = await fetch(`http://localhost:3000/api/timesheets?month=${selectedMonth}&userId=${targetId}`, { 
        credentials: 'include' 
      });
      
      if (res.ok) {
        const dbData = await res.json();
        const entryMap = {};
        
        // Handle "Monthly Document" Structure
        if (dbData.entries && Array.isArray(dbData.entries)) {
          dbData.entries.forEach(item => {
            // item.date is stored as string "YYYY-MM-DD"
            const dateKey = typeof item.date === 'string' ? item.date.slice(0, 10) : new Date(item.date).toISOString().slice(0, 10);
            entryMap[dateKey] = item.hours;
          });
        }

        // Apply Defaults (8 hours weekdays)
        const [year, month] = selectedMonth.split('-').map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();

        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const dayOfWeek = new Date(dateStr).getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

          if (entryMap[dateStr] === undefined) {
            entryMap[dateStr] = isWeekend ? 0 : 8;
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

  const updateLocalEntry = (dateStr, val) => {
    if (!isMonthEditable()) return;

    if (val === '') {
      setEntries(prev => ({ ...prev, [dateStr]: '' }));
      return; 
    }

    let numVal = parseFloat(val);
    if (isNaN(numVal)) numVal = 0;
    if (numVal < 0) numVal = 0;
    if (numVal > 24) numVal = 24;

    setEntries(prev => ({ ...prev, [dateStr]: numVal }));
    setModifiedDates(prev => new Set(prev).add(dateStr));
    setHasUnsavedChanges(true);
  };

  const handleIncrement = (dateStr, currentVal) => {
    if (!isMonthEditable()) return;
    const val = currentVal === '' ? 0 : parseFloat(currentVal);
    updateLocalEntry(dateStr, val + 0.5);
  };

  const handleDecrement = (dateStr, currentVal) => {
    if (!isMonthEditable()) return;
    const val = currentVal === '' ? 0 : parseFloat(currentVal);
    updateLocalEntry(dateStr, val - 0.5);
  };

  const handleSave = async () => {
    if (!isMonthEditable()) return;
    setIsSaving(true);

    try {
      const updates = Object.keys(entries).map(date => ({
        date,
        hours: entries[date] === '' ? 0 : entries[date]
      }));

      const res = await fetch('http://localhost:3000/api/timesheets/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: viewingUserId || user._id,
          month: selectedMonth, 
          entries: updates
        })
      });

      if (res.ok) {
        setModifiedDates(new Set());
        setHasUnsavedChanges(false);
        // Refresh to ensure sync
        fetchTimesheets(); 
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

  const renderCalendar = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const startDay = new Date(year, month - 1, 1).getDay(); 
    
    const cells = [];
    const isEditable = isMonthEditable(); 
    
    for (let i = 0; i < startDay; i++) {
      cells.push(<div key={`empty-${i}`} className="h-32 bg-transparent hidden md:block"></div>);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dateObj = new Date(dateStr);
      const hours = entries[dateStr] ?? 0;
      const isModified = modifiedDates.has(dateStr);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

      cells.push(
        <div key={dateStr} className={`h-32 rounded-lg p-2 flex flex-col justify-between relative shadow-sm border transition-colors ${
          isModified ? 'bg-blue-50 border-blue-300' : 'bg-gray-100 border-gray-200 hover:border-gray-300'
        } ${!isEditable ? 'opacity-75 bg-gray-200 cursor-not-allowed' : ''}`}>
          
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-500 uppercase md:hidden">{dayName}</span>
              <div className="text-xs text-blue-500 font-bold h-4">
                {isModified && '●'}
              </div>
            </div>
            <div className="text-lg font-bold text-gray-700">{d}</div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className={`flex items-center justify-center bg-white rounded border w-20 ${!isEditable ? 'bg-gray-100 border-gray-300' : 'border-gray-300'}`}>
              <input 
                type="number"
                value={hours}
                onChange={(e) => updateLocalEntry(dateStr, e.target.value)}
                onFocus={(e) => e.target.select()}
                step="0.5"
                min="0"
                max="24"
                disabled={!isEditable}
                className="w-full h-10 text-center text-xl font-bold bg-transparent outline-none disabled:text-gray-500"
              />
            </div>

            <div className={`flex gap-2 w-full justify-center transition-opacity ${!isEditable ? 'hidden' : 'opacity-100'}`}>
              <button 
                onClick={() => handleDecrement(dateStr, hours)}
                disabled={!isEditable}
                className="w-8 h-8 flex items-center justify-center bg-red-200 hover:bg-red-300 text-red-800 rounded font-bold transition-colors disabled:opacity-50"
                tabIndex="-1"
              >
                -
              </button>
              <button 
                onClick={() => handleIncrement(dateStr, hours)}
                disabled={!isEditable}
                className="w-8 h-8 flex items-center justify-center bg-green-200 hover:bg-green-300 text-green-800 rounded font-bold transition-colors disabled:opacity-50"
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
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-800">Timesheets</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {user.image && <img src={user.image} alt="" className="h-8 w-8 rounded-full bg-gray-200" />}
              <div className="text-sm hidden sm:block">
                <p className="font-medium text-gray-700">{user.displayName}</p>
                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="text-sm text-red-600 hover:text-red-800 font-medium">Logout</button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto py-8 px-4">
        
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

          <div className="flex items-center gap-4">
            {!isMonthEditable() && (
              <span className="text-xs font-bold text-red-500 uppercase bg-red-100 px-2 py-1 rounded">
                Read Only (Older than 1 Month)
              </span>
            )}
            <div className="bg-blue-50 px-4 py-2 rounded border border-blue-100 text-blue-800">
              <span className="text-xs font-bold uppercase mr-2">Total:</span>
              <span className="text-xl font-bold">{totalHours}</span>
            </div>
            
            {isMonthEditable() && (
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className={`px-6 py-2 rounded font-bold text-white shadow-sm transition-all ${
                  hasUnsavedChanges ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 hover:bg-gray-500'
                }`}
              >
                {isSaving ? 'Saving...' : (hasUnsavedChanges ? 'Save Changes' : 'Save')}
              </button>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="hidden md:grid grid-cols-7 gap-4 mb-4 text-center">
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
              <div key={day} className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-7 gap-2 sm:gap-4">
            {renderCalendar()}
          </div>
        </div>

      </main>
    </div>
  );
};

export default Dashboard;