import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [notification, setNotification] = useState(null);
  const [newUser, setNewUser] = useState({ email: '', name: '', role: 'user', company: '' });
  const [newTeam, setNewTeam] = useState({ name: '', leadId: '', memberIds: [] });
  
  const [activeTab, setActiveTab] = useState('users');
  const [editUser, setEditUser] = useState(null);
  const [editTeam, setEditTeam] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [removeMemberConfirm, setRemoveMemberConfirm] = useState(null);

  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [expandedUser, setExpandedUser] = useState(null);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');

  const showNotify = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    fetchInitialData();
  }, [navigate]);

  useEffect(() => {
    if (activeTab === 'reports' && currentUser) {
      fetchReportData();
    }
  }, [activeTab, reportMonth, currentUser]);

  const fetchInitialData = async () => {
    try {
      const authRes = await fetch('http://localhost:3000/api/current_user', { credentials: 'include' });
      if (!authRes.ok) throw new Error('Auth failed');
      const userData = await authRes.json();
      if (userData.role !== 'admin') {
        navigate('/dashboard');
        return;
      }
      setCurrentUser(userData);
      await refreshData();
    } catch (err) {
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    const [usersRes, teamsRes] = await Promise.all([
      fetch('http://localhost:3000/api/users', { credentials: 'include' }),
      fetch('http://localhost:3000/api/teams', { credentials: 'include' })
    ]);
    if (usersRes.ok) setUsers(await usersRes.json());
    if (teamsRes.ok) setTeams(await teamsRes.json());
  };

  const fetchReportData = async () => {
    try {
      const res = await fetch(`http://localhost:3000/api/timesheets/stats?month=${reportMonth}`, { credentials: 'include' });
      if (res.ok) setStats(await res.json());
    } catch (error) {
      console.error("Failed to load reports", error);
    }
  };

  const getFilteredStats = () => {
    return stats.filter(stat => {
      const matchesName = stat.displayName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCompany = filterCompany ? stat.company === filterCompany : true;
      const matchesTeam = filterTeam ? stat.teamName === filterTeam : true;
      return matchesName && matchesCompany && matchesTeam;
    });
  };

  const uniqueCompanies = [...new Set(stats.map(s => s.company).filter(c => c !== 'N/A'))];
  const uniqueTeams = [...new Set(stats.map(s => s.teamName).filter(t => t !== 'Unassigned'))];

  // --- ACTIONS ---
  const handleAddUser = async (e) => {
    e.preventDefault();
    const payload = { ...newUser, role: 'user' };
    const res = await fetch('http://localhost:3000/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      showNotify('User added successfully');
      setNewUser({ email: '', name: '', role: 'user', company: '' });
      refreshData();
    } else {
      const err = await res.json();
      showNotify(err.message || 'Failed to add user', 'error');
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    const res = await fetch('http://localhost:3000/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(newTeam)
    });
    if (res.ok) {
      showNotify('Team created successfully');
      setNewTeam({ name: '', leadId: '', memberIds: [] });
      refreshData();
    } else {
      showNotify('Failed to create team', 'error');
    }
  };

  const toggleNewTeamMember = (userId) => {
    setNewTeam(prev => {
      const exists = prev.memberIds.includes(userId);
      if (exists) return { ...prev, memberIds: prev.memberIds.filter(id => id !== userId) };
      return { ...prev, memberIds: [...prev.memberIds, userId] };
    });
  };

  const promptDeleteUser = (u) => setDeleteConfirm({ type: 'user', id: u._id, name: u.displayName });
  const promptDeleteTeam = (t) => setDeleteConfirm({ type: 'team', id: t._id, name: t.name });

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const endpoint = deleteConfirm.type === 'user' ? 'users' : 'teams';
    const res = await fetch(`http://localhost:3000/api/${endpoint}/${deleteConfirm.id}`, { 
      method: 'DELETE', 
      credentials: 'include' 
    });
    if (res.ok) {
      showNotify(`${deleteConfirm.type === 'user' ? 'User' : 'Team'} deleted`);
      refreshData();
    } else {
      showNotify('Failed to delete', 'error');
    }
    setDeleteConfirm(null);
  };

  const promptRemoveMember = (team, member) => {
    setRemoveMemberConfirm({ team: team, memberId: member._id || member, memberName: member.displayName || 'Unknown' });
  };

  const confirmRemoveMember = async () => {
    if (!removeMemberConfirm) return;
    const { team, memberId } = removeMemberConfirm;
    const newMemberIds = team.members.filter(m => (m._id || m) !== memberId).map(m => m._id || m);
    const res = await fetch(`http://localhost:3000/api/teams/${team._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: team.name, leadId: team.lead?._id || team.lead, memberIds: newMemberIds })
    });
    if (res.ok) {
      showNotify('Member removed');
      refreshData();
    } else {
      showNotify('Failed to remove member', 'error');
    }
    setRemoveMemberConfirm(null);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    const res = await fetch(`http://localhost:3000/api/users/${editUser._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ displayName: editUser.displayName, company: editUser.company })
    });
    if (res.ok) {
      showNotify('User updated');
      setEditUser(null);
      refreshData();
    } else {
      showNotify('Update failed', 'error');
    }
  };

  const handleUpdateTeam = async (e) => {
    e.preventDefault();
    const memberIds = editTeam.members.map(m => m._id || m);
    const res = await fetch(`http://localhost:3000/api/teams/${editTeam._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: editTeam.name, leadId: editTeam.lead?._id || editTeam.lead, memberIds })
    });
    if (res.ok) {
      showNotify('Team updated');
      setEditTeam(null);
      refreshData();
    } else {
      showNotify('Update failed', 'error');
    }
  };

  const toggleEditTeamMember = (userId) => {
    setEditTeam(prev => {
      const currentIds = prev.members.map(m => m._id || m);
      const exists = currentIds.includes(userId);
      let newMembers;
      if (exists) {
        newMembers = prev.members.filter(m => (m._id || m) !== userId);
      } else {
        newMembers = [...prev.members, userId];
      }
      return { ...prev, members: newMembers };
    });
  };

  // --- FILTERS ---
  const unassignedUsers = users.filter(u => u.role !== 'admin' && (u.role === 'user' || u.role === 'team_lead') && !u.team);
  const availableUsersForEditTeam = (teamId) => users.filter(u => u.role !== 'admin' && (u.role === 'user' || u.role === 'team_lead') && (!u.team || u.team._id === teamId));
  const availableLeadsForEdit = (currentLeadId) => users.filter(u => u.role !== 'admin' && (!u.team || u._id === currentLeadId));
  
  const filterBySearch = (list) => {
    if (!memberSearchTerm) return list;
    return list.filter(u => u.displayName.toLowerCase().includes(memberSearchTerm.toLowerCase()));
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 relative pb-10">
      {/* NOTIFICATION */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded shadow-lg text-white ${
          notification.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        } transition-all duration-300`}>
          {notification.message}
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-sm">
            <h3 className="text-lg font-bold text-red-600 mb-2">Confirm Deletion</h3>
            <p className="text-gray-700 mb-6">Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* REMOVE MEMBER MODAL */}
      {removeMemberConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-sm">
            <h3 className="text-lg font-bold text-red-600 mb-2">Remove Member</h3>
            <p className="text-gray-700 mb-6">Remove <strong>{removeMemberConfirm.memberName}</strong> from <strong>{removeMemberConfirm.team.name}</strong>?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setRemoveMemberConfirm(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
              <button onClick={confirmRemoveMember} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* NAVBAR */}
      <nav className="bg-gray-800 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="font-bold text-xl truncate">Admin Console</span>
          <div className="flex items-center gap-4">
             <span className="text-gray-300 text-sm hidden sm:inline">{currentUser.email}</span>
             <a href="http://localhost:3000/auth/logout" className="text-red-400 hover:text-white text-sm whitespace-nowrap">Logout</a>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4">
        {/* TABS - Horizontal Scroll for Mobile */}
        <div className="flex space-x-4 mb-8 border-b border-gray-200 pb-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
          <button onClick={() => setActiveTab('users')} className={`pb-2 px-4 ${activeTab === 'users' ? 'border-b-2 border-blue-500 text-blue-600 font-bold' : 'text-gray-500'}`}>Manage Users</button>
          <button onClick={() => setActiveTab('teams')} className={`pb-2 px-4 ${activeTab === 'teams' ? 'border-b-2 border-blue-500 text-blue-600 font-bold' : 'text-gray-500'}`}>Manage Teams</button>
          <button onClick={() => setActiveTab('reports')} className={`pb-2 px-4 ${activeTab === 'reports' ? 'border-b-2 border-blue-500 text-blue-600 font-bold' : 'text-gray-500'}`}>Reports</button>
        </div>

        {/* --- USERS TAB --- */}
        {activeTab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow h-fit">
              <h3 className="text-lg font-bold mb-4">Add New User</h3>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700">Email</label><input type="email" required className="mt-1 w-full border border-gray-300 rounded p-2" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-gray-700">Display Name</label><input type="text" required className="mt-1 w-full border border-gray-300 rounded p-2" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-gray-700">Company</label><input type="text" className="mt-1 w-full border border-gray-300 rounded p-2" value={newUser.company} onChange={e => setNewUser({...newUser, company: e.target.value})} /></div>
                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Add User</button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow overflow-hidden">
              <h3 className="text-lg font-bold mb-4">All Users</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Role</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Company</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Team</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map(u => (
                      <tr key={u._id}>
                        <td className="px-3 py-2"><div className="text-sm font-medium text-gray-900">{u.displayName}</div><div className="text-xs text-gray-500">{u.email}</div></td>
                        <td className="px-3 py-2 text-sm text-gray-600 hidden sm:table-cell">{u.role}</td>
                        <td className="px-3 py-2 text-sm text-gray-600 hidden md:table-cell">{u.company || '-'}</td>
                        <td className="px-3 py-2 text-sm text-gray-600">{u.team?.name || '-'}</td>
                        <td className="px-3 py-2 text-right space-x-2 whitespace-nowrap">
                          <button onClick={() => setEditUser(u)} className="text-blue-600 hover:text-blue-900 text-sm">Edit</button>
                          {u.role !== 'admin' && <button onClick={() => promptDeleteUser(u)} className="text-red-600 hover:text-red-900 text-sm">Delete</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- TEAMS TAB --- */}
        {activeTab === 'teams' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow h-fit">
              <h3 className="text-lg font-bold mb-4">Create Team</h3>
              <form onSubmit={handleCreateTeam} className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700">Team Name</label><input type="text" required className="mt-1 w-full border border-gray-300 rounded p-2" value={newTeam.name} onChange={e => setNewTeam({...newTeam, name: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-gray-700">Assign Lead</label><select className="mt-1 w-full border border-gray-300 rounded p-2" value={newTeam.leadId} onChange={e => setNewTeam({...newTeam, leadId: e.target.value})}><option value="">Select a User</option>{unassignedUsers.map(u => <option key={u._id} value={u._id}>{u.displayName}</option>)}</select></div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assign Members</label>
                  <input type="text" placeholder="Search users..." className="w-full border border-gray-300 rounded px-2 py-1 mb-2 text-sm" onChange={(e) => setMemberSearchTerm(e.target.value)} />
                  <div className="h-40 overflow-y-auto border border-gray-300 rounded p-2 space-y-2">
                    {filterBySearch(unassignedUsers.filter(u => u._id !== newTeam.leadId)).length > 0 ? (
                      filterBySearch(unassignedUsers.filter(u => u._id !== newTeam.leadId)).map(u => (
                        <div key={u._id} className="flex items-center p-1 hover:bg-gray-50 rounded">
                          <input type="checkbox" id={`new-${u._id}`} checked={newTeam.memberIds.includes(u._id)} onChange={() => toggleNewTeamMember(u._id)} className="mr-3 h-4 w-4" />
                          <label htmlFor={`new-${u._id}`} className="cursor-pointer">
                            <div className="text-base font-semibold text-gray-800">{u.displayName}</div>
                            <div className="text-xs text-gray-500">{u.email}</div>
                          </label>
                        </div>
                      ))
                    ) : <p className="text-xs text-gray-400 italic">No users found.</p>}
                  </div>
                </div>
                <button type="submit" className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">Create Team</button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow overflow-hidden">
              <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-800">Active Teams</h3>
                <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">{teams.length} Teams</span>
              </div>
              <div className="grid gap-4">
                {teams.map(team => (
                  <div key={team._id} className="border p-4 rounded bg-gray-50 flex flex-col md:flex-row justify-between items-start hover:shadow-sm transition-shadow">
                    <div className="flex-1 w-full">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-lg text-gray-900 truncate mr-2">{team.name}</h4>
                        <div className="flex space-x-2 shrink-0">
                          <button onClick={() => { setEditTeam(team); setMemberSearchTerm(''); }} className="text-blue-600 text-xs font-medium hover:underline bg-blue-50 px-2 py-1 rounded border border-blue-100">Edit</button>
                          <button onClick={() => promptDeleteTeam(team)} className="text-red-600 text-xs font-medium hover:underline bg-red-50 px-2 py-1 rounded border border-red-100">Delete</button>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 mb-3 bg-white p-2 rounded border border-gray-100 inline-block max-w-full truncate">
                        <span className="font-semibold text-gray-700">Lead:</span> {team.lead?.displayName || <span className="italic text-gray-400">Unassigned</span>}
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="font-semibold block mb-2 text-gray-700">Members ({team.members?.length || 0}):</span> 
                        {team.members && team.members.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {team.members.map(m => (
                              <span key={m._id} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white border border-gray-200 text-gray-700 shadow-sm max-w-full">
                                <span className="truncate max-w-[150px]">{m.displayName}</span>
                                <button onClick={() => promptRemoveMember(team, m)} className="ml-2 text-gray-400 hover:text-red-500 text-lg leading-none shrink-0" title="Remove">×</button>
                              </span>
                            ))}
                          </div>
                        ) : <span className="text-gray-400 italic text-xs pl-2">No members assigned</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- REPORTS TAB --- */}
        {activeTab === 'reports' && (
          <div className="bg-white p-6 rounded-lg shadow overflow-hidden">
            <div className="flex flex-col gap-4 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="w-full">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Month</label>
                  <input type="month" value={reportMonth} onChange={e => setReportMonth(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </div>
                <div className="w-full">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Search</label>
                  <input type="text" placeholder="Name" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </div>
                <div className="w-full">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Company</label>
                  <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                    <option value="">All Companies</option>
                    {uniqueCompanies.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="w-full">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Team</label>
                  <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                    <option value="">All Teams</option>
                    {uniqueTeams.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap hidden sm:table-cell">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap hidden md:table-cell">Team</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Total Hours</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Details</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getFilteredStats().map((stat) => (
                    <React.Fragment key={stat._id}>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {stat.displayName}
                          {/* Mobile-only sub-info */}
                          <div className="text-xs text-gray-500 sm:hidden">
                            {stat.company} • {stat.teamName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">{stat.company}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">{stat.teamName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-bold">{stat.totalHours}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button onClick={() => setExpandedUser(expandedUser === stat._id ? null : stat._id)} className="text-blue-600 hover:text-blue-900">
                            {expandedUser === stat._id ? 'Hide' : 'View Days'}
                          </button>
                        </td>
                      </tr>
                      {expandedUser === stat._id && (
                        <tr>
                          <td colSpan="5" className="bg-gray-50 px-6 py-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                              {stat.entries.map((entry, idx) => (
                                <div key={idx} className="bg-white p-2 rounded border border-gray-200 text-center">
                                  <div className="text-xs text-gray-500">{entry.date.slice(8, 10)}</div>
                                  <div className="text-sm font-bold text-blue-600">{entry.hours}</div>
                                </div>
                              ))}
                              {stat.entries.length === 0 && <span className="text-gray-500 italic text-sm">No data recorded.</span>}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- EDIT USER MODAL --- */}
        {editUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-40">
            <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
              <h3 className="text-xl font-bold mb-4">Edit User</h3>
              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div><label className="block text-sm text-gray-700">Display Name</label><input type="text" className="w-full border p-2 rounded" value={editUser.displayName} onChange={e => setEditUser({...editUser, displayName: e.target.value})} /></div>
                <div><label className="block text-sm text-gray-700">Company</label><input type="text" className="w-full border p-2 rounded" value={editUser.company || ''} onChange={e => setEditUser({...editUser, company: e.target.value})} /></div>
                <div className="flex justify-end gap-2 mt-4"><button type="button" onClick={() => setEditUser(null)} className="px-4 py-2 text-gray-600">Cancel</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Save Changes</button></div>
              </form>
            </div>
          </div>
        )}

        {/* --- EDIT TEAM MODAL --- */}
        {editTeam && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-40">
            <div className="bg-white p-6 rounded shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4 border-b pb-2">Edit Team: {editTeam.name}</h3>
              <form onSubmit={handleUpdateTeam} className="space-y-4 pt-2">
                <div><label className="block text-sm font-medium text-gray-700">Team Name</label><input type="text" className="w-full border p-2 rounded" value={editTeam.name} onChange={e => setEditTeam({...editTeam, name: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-gray-700">Lead</label><select className="w-full border p-2 rounded" value={editTeam.lead?._id || editTeam.lead || ''} onChange={e => setEditTeam({...editTeam, lead: e.target.value})}><option value="">No Lead</option>{availableLeadsForEdit(editTeam.lead?._id || editTeam.lead).map(u => <option key={u._id} value={u._id}>{u.displayName}</option>)}</select></div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Team Members</label>
                  <input type="text" placeholder="Search members..." className="w-full border border-gray-300 rounded px-2 py-1 mb-2 text-sm" onChange={(e) => setMemberSearchTerm(e.target.value)} />
                  <div className="h-48 overflow-y-auto border border-gray-300 rounded p-2 space-y-2">
                    {filterBySearch(availableUsersForEditTeam(editTeam._id)).length > 0 ? (
                      filterBySearch(availableUsersForEditTeam(editTeam._id))
                        .filter(u => u._id !== (editTeam.lead?._id || editTeam.lead))
                        .map(u => {
                          const isMember = editTeam.members.some(m => (m._id || m) === u._id);
                          return (
                            <div key={u._id} className="flex items-center p-1 hover:bg-gray-50 rounded">
                              <input type="checkbox" id={`edit-${u._id}`} checked={isMember} onChange={() => toggleEditTeamMember(u._id)} className="mr-3 h-4 w-4" />
                              <label htmlFor={`edit-${u._id}`} className="cursor-pointer">
                                <div className="text-base font-semibold text-gray-800">{u.displayName}</div>
                                <div className="text-xs text-gray-500">{u.team && u.team._id !== editTeam._id && !isMember ? `(Moves from ${u.team.name})` : u.email}</div>
                              </label>
                            </div>
                          );
                        })
                    ) : <p className="text-xs text-gray-400 italic">No users found.</p>}
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4"><button type="button" onClick={() => setEditTeam(null)} className="px-4 py-2 text-gray-600">Cancel</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Save Changes</button></div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;