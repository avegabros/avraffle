'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminNav } from '@/components/admin/AdminNav';

interface AdminUser {
  id: string;
  username: string;
  name: string;
  role: string;
  location: string;
  isActive: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // New user state
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('ADMIN');
  const [location, setLocation] = useState('TAYUD');
  const [msg, setMsg] = useState('');

  // Edit user modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState('');
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editRole, setEditRole] = useState('ADMIN');
  const [editLocation, setEditLocation] = useState('TAYUD');
  const [editPassword, setEditPassword] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editMsg, setEditMsg] = useState('');

  const fetchUsers = () => {
    setLoading(true);
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => {
        if (data.users) setUsers(data.users);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, name, password, role, location }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg('User created successfully!');
        setUsername('');
        setName('');
        setPassword('');
        fetchUsers();
      } else {
        setMsg(data.error || 'Failed to create user');
      }
    } catch {
      setMsg('Connection failed');
    }
  };

  const openEditModal = (u: AdminUser) => {
    setEditId(u.id);
    setEditName(u.name);
    setEditUsername(u.username);
    setEditRole(u.role);
    setEditLocation(u.location || 'TAYUD');
    setEditPassword('');
    setEditIsActive(u.isActive);
    setEditMsg('');
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditMsg('');
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editId,
          name: editName,
          username: editUsername,
          role: editRole,
          location: editLocation,
          isActive: editIsActive,
          password: editPassword || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowEditModal(false);
        fetchUsers();
      } else {
        setEditMsg(data.error || 'Failed to update user');
      }
    } catch {
      setEditMsg('Update failed');
    }
  };

  const handleDeleteUser = async (u: AdminUser) => {
    if (!confirm(`Are you sure you want to delete user account "${u.name}" (@${u.username})?`)) {
      return;
    }
    try {
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: u.id }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchUsers();
      } else {
        alert(data.error || 'Failed to delete user');
      }
    } catch {
      alert('Delete failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <AdminNav badgeTitle="User Accounts" />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Admin & Staff Management</h1>
          <p className="text-slate-400 text-sm mt-1">
            Create multi-user logins with custom passwords and role-based permissions
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create User Form */}
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl h-fit">
            <h2 className="text-lg font-bold mb-4">Add User Account</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. jdoe"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="ADMIN">ADMIN (Full Access)</option>
                  <option value="REGISTRATION_STAFF">REGISTRATION_STAFF (Desk Only)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Location Assignment</label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="TAYUD">Tayud Land-Based</option>
                  <option value="MAKATI">Makati Land-Based</option>
                  <option value="ALL">All Locations</option>
                </select>
              </div>

              {msg && (
                <div
                  className={`p-3 rounded-xl text-xs text-center font-bold ${
                    msg.includes('successfully')
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-red-500/20 text-red-300 border border-red-500/40'
                  }`}
                >
                  {msg}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 font-bold rounded-xl text-sm shadow transition text-slate-950 font-black"
              >
                Create Account
              </button>
            </form>
          </div>

          {/* User List Table */}
          <div className="lg:col-span-2 bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-sm uppercase tracking-wider text-slate-300">Registered Users</h3>
              <span className="text-xs text-slate-400">{users.length} Total</span>
            </div>

            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/80 text-xs uppercase font-extrabold text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Role / Location</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500 animate-pulse">
                      Loading users...
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-6 py-4">
                        <div className="font-bold text-white">{u.name}</div>
                        <div className="text-xs text-slate-400 font-mono">@{u.username}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-slate-800 text-amber-400 border border-slate-700">
                            {u.role}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-slate-800 text-blue-300 border border-slate-700">
                            {u.location || 'ALL'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            u.isActive
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {u.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(u)}
                            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg border border-slate-700 text-slate-200 transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="px-2.5 py-1 bg-red-950/60 hover:bg-red-900 text-xs font-bold rounded-lg border border-red-800/60 text-red-300 transition"
                            title="Delete Account"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/20 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Edit User Account</h2>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Reset Password (leave empty to keep unchanged)
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="New password (optional)"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Role</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="REGISTRATION_STAFF">REGISTRATION_STAFF</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Location</label>
                  <select
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="TAYUD">Tayud</option>
                    <option value="MAKATI">Makati</option>
                    <option value="ALL">All Locations</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer rounded"
                />
                <label htmlFor="editIsActive" className="text-xs font-bold uppercase text-emerald-400 cursor-pointer">
                  Account Active & Enabled
                </label>
              </div>

              {editMsg && (
                <div className="p-3 bg-red-500/20 text-red-300 border border-red-500/40 rounded-xl text-xs font-bold text-center">
                  {editMsg}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 font-bold rounded-xl text-sm shadow transition text-slate-950 font-black"
              >
                Save User Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
