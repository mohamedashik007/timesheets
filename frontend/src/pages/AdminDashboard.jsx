import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Form States
  const [newUser, setNewUser] = useState({ email: '', name: '', role: 'user' });
  const [newTeam, setNewTeam] = useState({ name: '', leadId: '' });
  const [activeTab, setActiveTab] = useState('users');

  useEffect(() => {
    fetchInitialData();
  }, [navigate]);

  const fetchInitialData = async () => {
    try {
      // 1. Check Auth
      const authRes = await fetch('http://localhost:3000/api/current_user', { credentials: 'include' });
      if (!authRes.ok) throw new Error('Auth failed');
      const userData = await authRes.json();
      if (userData.role !== 'admin') {
        navigate('/dashboard');
        return;
      }
      setCurrentUser(userData);

      // 2. Fetch Users & Teams
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

  const handleAddUser = async (e) => {
    e.preventDefault();
    const res = await fetch('http://localhost:3000/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(newUser)
    });
    if (res.ok) {
      alert('User added successfully');
      setNewUser({ email: '', name: '', role: 'user' });
      refreshData();
    } else {
      alert('Failed to add user');
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
      alert('Team created successfully');
      setNewTeam({ name: '', leadId: '' });
      refreshData();
    } else {
      alert('Failed to create team');
    }
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-gray-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="font-bold text-xl">Admin Console</span>
          <div className="flex items-center gap-4">
             <span className="text-gray-300 text-sm">{currentUser.email}</span>
             <a href="http://localhost:3000/logout" className="text-red-400 hover:text-white text-sm">Logout</a>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4">
        
        {/* Tabs */}
        <div className="flex space-x-4 mb-8 border-b border-gray-200 pb-2">
          <button 
            onClick={() => setActiveTab('users')}
            className={`pb-2 px-4 ${activeTab === 'users' ? 'border-b-2 border-blue-500 text-blue-600 font-bold' : 'text-gray-500'}`}
          >
            Manage Users
          </button>
          <button 
            onClick={() => setActiveTab('teams')}
            className={`pb-2 px-4 ${activeTab === 'teams' ? 'border-b-2 border-blue-500 text-blue-600 font-bold' : 'text-gray-500'}`}
          >
            Manage Teams
          </button>
        </div>

        {/* --- USERS TAB --- */}
        {activeTab === 'users' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Add User Form */}
            <div className="bg-white p-6 rounded-lg shadow h-fit">
              <h3 className="text-lg font-bold mb-4">Add New User</h3>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input 
                    type="email" required 
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                    value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Display Name</label>
                  <input 
                    type="text" required 
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                    value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select 
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                    value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}
                  >
                    <option value="user">User</option>
                    <option value="team_lead">Team Lead</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Add User</button>
              </form>
            </div>

            {/* User List */}
            <div className="md:col-span-2 bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-bold mb-4">All Users</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Team</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map(u => (
                      <tr key={u._id}>
                        <td className="px-3 py-2 text-sm">{u.displayName}</td>
                        <td className="px-3 py-2 text-sm text-gray-500">{u.email}</td>
                        <td className="px-3 py-2 text-sm">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            u.role === 'admin' ? 'bg-red-100 text-red-800' : 
                            u.role === 'team_lead' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500">{u.team?.name || '-'}</td>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Create Team Form */}
            <div className="bg-white p-6 rounded-lg shadow h-fit">
              <h3 className="text-lg font-bold mb-4">Create Team</h3>
              <form onSubmit={handleCreateTeam} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Team Name</label>
                  <input 
                    type="text" required 
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                    value={newTeam.name} onChange={e => setNewTeam({...newTeam, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Assign Lead (Optional)</label>
                  <select 
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                    value={newTeam.leadId} onChange={e => setNewTeam({...newTeam, leadId: e.target.value})}
                  >
                    <option value="">Select a User</option>
                    {users.filter(u => u.role !== 'admin').map(u => (
                      <option key={u._id} value={u._id}>{u.displayName} ({u.email})</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">User will be promoted to Team Lead role.</p>
                </div>
                <button type="submit" className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">Create Team</button>
              </form>
            </div>

            {/* Team List */}
            <div className="md:col-span-2 bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-bold mb-4">All Teams</h3>
              <div className="grid grid-cols-1 gap-4">
                {teams.map(team => (
                  <div key={team._id} className="border p-4 rounded bg-gray-50 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-gray-800">{team.name}</h4>
                      <p className="text-sm text-gray-600">Lead: {team.lead?.displayName || 'Unassigned'}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {team.members?.length || 0} Members
                      </span>
                    </div>
                  </div>
                ))}
                {teams.length === 0 && <p className="text-gray-500 italic">No teams created yet.</p>}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default AdminDashboard;