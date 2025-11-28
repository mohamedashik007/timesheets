import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Form States
  const [newUser, setNewUser] = useState({ email: '', name: '', role: 'user', company: '' });
  const [newTeam, setNewTeam] = useState({ name: '', leadId: '' });
  
  // UI States
  const [activeTab, setActiveTab] = useState('users');
  const [editUser, setEditUser] = useState(null); // If not null, show edit modal
  const [editTeam, setEditTeam] = useState(null); // If not null, show edit modal

  useEffect(() => {
    fetchInitialData();
  }, [navigate]);

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

  // --- HANDLERS: ADD ---

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
      setNewUser({ email: '', name: '', role: 'user', company: '' });
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

  // --- HANDLERS: DELETE ---

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Are you sure? This user will be deleted permanently.")) return;
    await fetch(`http://localhost:3000/api/users/${id}`, { method: 'DELETE', credentials: 'include' });
    refreshData();
  };

  const handleDeleteTeam = async (id) => {
    if (!window.confirm("Are you sure? Members will be unassigned.")) return;
    await fetch(`http://localhost:3000/api/teams/${id}`, { method: 'DELETE', credentials: 'include' });
    refreshData();
  };

  // --- HANDLERS: EDIT ---

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    const res = await fetch(`http://localhost:3000/api/users/${editUser._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        displayName: editUser.displayName,
        role: editUser.role,
        company: editUser.company
      })
    });
    if (res.ok) {
      setEditUser(null);
      refreshData();
    }
  };

  const handleUpdateTeam = async (e) => {
    e.preventDefault();
    const res = await fetch(`http://localhost:3000/api/teams/${editTeam._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: editTeam.name,
        leadId: editTeam.lead?._id || editTeam.lead // Handle object or ID string
      })
    });
    if (res.ok) {
      setEditTeam(null);
      refreshData();
    }
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
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
        <div className="flex space-x-4 mb-8 border-b border-gray-200 pb-2">
          <button onClick={() => setActiveTab('users')} className={`pb-2 px-4 ${activeTab === 'users' ? 'border-b-2 border-blue-500 text-blue-600 font-bold' : 'text-gray-500'}`}>Manage Users</button>
          <button onClick={() => setActiveTab('teams')} className={`pb-2 px-4 ${activeTab === 'teams' ? 'border-b-2 border-blue-500 text-blue-600 font-bold' : 'text-gray-500'}`}>Manage Teams</button>
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
                  <input type="email" required className="mt-1 w-full border border-gray-300 rounded p-2" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Display Name</label>
                  <input type="text" required className="mt-1 w-full border border-gray-300 rounded p-2" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Company</label>
                  <input type="text" className="mt-1 w-full border border-gray-300 rounded p-2" value={newUser.company} onChange={e => setNewUser({...newUser, company: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select className="mt-1 w-full border border-gray-300 rounded p-2" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
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
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map(u => (
                      <tr key={u._id}>
                        <td className="px-3 py-2">
                          <div className="text-sm font-medium text-gray-900">{u.displayName}</div>
                          <div className="text-xs text-gray-500">{u.email}</div>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-600">{u.role}</td>
                        <td className="px-3 py-2 text-sm text-gray-600">{u.company || '-'}</td>
                        <td className="px-3 py-2 text-right space-x-2">
                          <button onClick={() => setEditUser(u)} className="text-blue-600 hover:text-blue-900 text-sm">Edit</button>
                          {u.role !== 'admin' && (
                             <button onClick={() => handleDeleteUser(u._id)} className="text-red-600 hover:text-red-900 text-sm">Delete</button>
                          )}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow h-fit">
              <h3 className="text-lg font-bold mb-4">Create Team</h3>
              <form onSubmit={handleCreateTeam} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Team Name</label>
                  <input type="text" required className="mt-1 w-full border border-gray-300 rounded p-2" value={newTeam.name} onChange={e => setNewTeam({...newTeam, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Assign Lead</label>
                  <select className="mt-1 w-full border border-gray-300 rounded p-2" value={newTeam.leadId} onChange={e => setNewTeam({...newTeam, leadId: e.target.value})}>
                    <option value="">Select a User</option>
                    {users.filter(u => u.role !== 'admin').map(u => (
                      <option key={u._id} value={u._id}>{u.displayName}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">Create Team</button>
              </form>
            </div>

            <div className="md:col-span-2 bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-bold mb-4">All Teams</h3>
              <div className="grid gap-4">
                {teams.map(team => (
                  <div key={team._id} className="border p-4 rounded bg-gray-50 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-gray-800">{team.name}</h4>
                      <p className="text-sm text-gray-600">Lead: {team.lead?.displayName || 'Unassigned'}</p>
                    </div>
                    <div className="space-x-2">
                      <button onClick={() => setEditTeam(team)} className="text-blue-600 text-sm hover:underline">Edit</button>
                      <button onClick={() => handleDeleteTeam(team._id)} className="text-red-600 text-sm hover:underline">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- EDIT USER MODAL --- */}
        {editUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
              <h3 className="text-xl font-bold mb-4">Edit User</h3>
              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700">Display Name</label>
                  <input type="text" className="w-full border p-2 rounded" value={editUser.displayName} onChange={e => setEditUser({...editUser, displayName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm text-gray-700">Company</label>
                  <input type="text" className="w-full border p-2 rounded" value={editUser.company || ''} onChange={e => setEditUser({...editUser, company: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm text-gray-700">Role</label>
                  <select className="w-full border p-2 rounded" value={editUser.role} onChange={e => setEditUser({...editUser, role: e.target.value})}>
                    <option value="user">User</option>
                    <option value="team_lead">Team Lead</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button type="button" onClick={() => setEditUser(null)} className="px-4 py-2 text-gray-600">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- EDIT TEAM MODAL --- */}
        {editTeam && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
              <h3 className="text-xl font-bold mb-4">Edit Team</h3>
              <form onSubmit={handleUpdateTeam} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700">Team Name</label>
                  <input type="text" className="w-full border p-2 rounded" value={editTeam.name} onChange={e => setEditTeam({...editTeam, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm text-gray-700">Lead</label>
                  <select 
                    className="w-full border p-2 rounded" 
                    value={editTeam.lead?._id || editTeam.lead || ''} 
                    onChange={e => setEditTeam({...editTeam, lead: e.target.value})}
                  >
                    <option value="">No Lead</option>
                    {users.filter(u => u.role !== 'admin').map(u => (
                      <option key={u._id} value={u._id}>{u.displayName}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button type="button" onClick={() => setEditTeam(null)} className="px-4 py-2 text-gray-600">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default AdminDashboard;