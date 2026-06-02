import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';
import type { UserAccount } from '../types';
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  ShieldAlert,
  UserPlus,
  RefreshCw,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import './UsersManagement.css';

const ROLES = [
  'super_admin',
  'sp',
  'dsp',
  'nagercoil_admin',
  'thuckalay_admin',
  'colachel_admin',
  'kanyakumari_admin',
  'marthandam_admin',
  'inspector',
  'sub_inspector',
  'operator',
  'viewer',
  'developer'
];

const SUBDIVISIONS = [
  'Nagercoil',
  'Thuckalay',
  'Colachel',
  'Kanyakumari',
  'Marthandam',
];

const UsersManagement = () => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [subFilter, setSubFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'reset' | 'status'>('create');
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<UserAccount>>({});
  const [reason, setReason] = useState('');
  const [tempPassword, setTempPassword] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/users`);
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenModal = (mode: 'create' | 'edit' | 'reset' | 'status', user?: UserAccount) => {
    setModalMode(mode);
    setSelectedUser(user || null);
    setReason('');
    setTempPassword('');
    if (mode === 'create') {
      setFormData({
        username: '',
        fullName: '',
        designation: '',
        role: 'viewer',
        subdivision: '',
        phoneNumber: '',
        email: ''
      });
    } else if (user) {
      setFormData({
        fullName: user.fullName,
        designation: user.designation,
        role: user.role,
        subdivision: user.subdivision,
        phoneNumber: user.phoneNumber,
        email: user.email
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTempPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modalMode === 'create') {
        const res = await axios.post(`${API_BASE}/users`, formData);
        setTempPassword(res.data.temporaryPassword);
        fetchUsers();
      } else if (modalMode === 'edit' && selectedUser) {
        if (!reason && formData.role !== selectedUser.role) {
            alert('Reason is required for role changes');
            return;
        }
        await axios.patch(`${API_BASE}/users/${selectedUser.id}`, { ...formData, reason });
        handleCloseModal();
        fetchUsers();
      } else if (modalMode === 'status' && selectedUser) {
        if (!reason) {
            alert('Reason is required to change status');
            return;
        }
        await axios.patch(`${API_BASE}/users/${selectedUser.id}/status`, { isActive: !selectedUser.isActive, reason });
        handleCloseModal();
        fetchUsers();
      } else if (modalMode === 'reset' && selectedUser) {
        if (!reason) {
            alert('Reason is required to reset password');
            return;
        }
        const res = await axios.post(`${API_BASE}/users/${selectedUser.id}/reset-password`, { reason });
        setTempPassword(res.data.temporaryPassword);
        fetchUsers();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Action failed');
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.username.toLowerCase().includes(search.toLowerCase()) || 
                          u.fullName.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter ? u.role === roleFilter : true;
    const matchesSub = subFilter ? u.subdivision === subFilter : true;
    const matchesStatus = statusFilter === 'active' ? u.isActive : statusFilter === 'inactive' ? !u.isActive : true;
    return matchesSearch && matchesRole && matchesSub && matchesStatus;
  });

  return (
    <div className="users-page">
      <div className="users-header">
        <h2><Users size={22} /> User Management</h2>
        <button className="btn-primary" onClick={() => handleOpenModal('create')}>
          <UserPlus size={16} /> Create User
        </button>
      </div>

      <div className="users-filters">
        <div className="search-box">
          <Search size={16} />
          <input 
            type="text" 
            placeholder="Search username or name..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={16} />
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
          </select>
          <select value={subFilter} onChange={(e) => setSubFilter(e.target.value)}>
            <option value="">All Subdivisions</option>
            {SUBDIVISIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <button className="btn-secondary" onClick={fetchUsers}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="users-table-container">
        {loading ? (
          <div className="users-loading">Loading accounts...</div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Name / Designation</th>
                <th>Role / Subdivision</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center">No users found.</td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isLocked = user.lockedUntil && new Date(user.lockedUntil) > new Date();
                  return (
                    <tr key={user.id} className={!user.isActive ? 'inactive-row' : ''}>
                      <td>
                        <strong>{user.username}</strong>
                        {user.requiresPasswordChange && <span className="badge-warning" title="Requires Password Change"><ShieldAlert size={12}/></span>}
                      </td>
                      <td>
                        <div className="td-stack">
                          <span>{user.fullName}</span>
                          <span className="text-muted">{user.designation || '—'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="td-stack">
                          <span className="role-badge">{user.role.toUpperCase()}</span>
                          <span className="text-muted">{user.subdivision || '—'}</span>
                        </div>
                      </td>
                      <td>
                        {isLocked ? (
                            <span className="status-badge error"><Lock size={12}/> Locked</span>
                        ) : user.isActive ? (
                            <span className="status-badge ok"><CheckCircle size={12}/> Active</span>
                        ) : (
                            <span className="status-badge error"><XCircle size={12}/> Inactive</span>
                        )}
                      </td>
                      <td className="text-muted text-sm">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button onClick={() => handleOpenModal('edit', user)} title="Edit Details">Edit</button>
                          <button onClick={() => handleOpenModal('reset', user)} title="Reset Password">Reset</button>
                          <button 
                            className={user.isActive ? 'btn-danger' : 'btn-success'} 
                            onClick={() => handleOpenModal('status', user)}
                            title={user.isActive ? 'Deactivate Account' : 'Activate Account'}
                          >
                            {user.isActive ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-backdrop" onClick={tempPassword ? undefined : handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {modalMode === 'create' ? 'Create New User' : 
                 modalMode === 'edit' ? `Edit User: ${selectedUser?.username}` :
                 modalMode === 'reset' ? `Reset Password: ${selectedUser?.username}` :
                 `${selectedUser?.isActive ? 'Deactivate' : 'Activate'} User: ${selectedUser?.username}`}
              </h3>
              {!tempPassword && <button className="btn-close" onClick={handleCloseModal}><XCircle size={24}/></button>}
            </div>
            
            {tempPassword ? (
              <div className="temp-password-screen">
                <AlertTriangle size={48} className="warning-icon"/>
                <h4>Save this Temporary Password</h4>
                <p>This password is only shown once. The officer must use it to log in and will be forced to change it immediately.</p>
                <div className="temp-password-box">{tempPassword}</div>
                <button className="btn-primary" onClick={handleCloseModal}>I have copied the password</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="user-form">
                {(modalMode === 'create' || modalMode === 'edit') && (
                  <>
                    {modalMode === 'create' && (
                      <div className="form-group">
                        <label>Username</label>
                        <input type="text" required value={formData.username || ''} onChange={e => setFormData({...formData, username: e.target.value})} />
                      </div>
                    )}
                    <div className="form-group">
                      <label>Full Name</label>
                      <input type="text" required value={formData.fullName || ''} onChange={e => setFormData({...formData, fullName: e.target.value})} />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Role</label>
                        <select required value={formData.role || ''} onChange={e => setFormData({...formData, role: e.target.value})}>
                          {ROLES.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Subdivision</label>
                        <select value={formData.subdivision || ''} onChange={e => setFormData({...formData, subdivision: e.target.value})}>
                          <option value="">None</option>
                          {SUBDIVISIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Designation</label>
                            <input type="text" value={formData.designation || ''} onChange={e => setFormData({...formData, designation: e.target.value})} />
                        </div>
                        <div className="form-group">
                            <label>Phone Number</label>
                            <input type="text" value={formData.phoneNumber || ''} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} />
                        </div>
                    </div>
                    
                    {modalMode === 'edit' && formData.role !== selectedUser?.role && (
                        <div className="form-group">
                            <label>Reason for Role Change (Mandatory)</label>
                            <input type="text" required value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Promoted to DSP" />
                        </div>
                    )}
                  </>
                )}

                {(modalMode === 'status' || modalMode === 'reset') && (
                  <div className="form-group">
                    <label>Reason for Action (Mandatory)</label>
                    <input type="text" required value={reason} onChange={e => setReason(e.target.value)} placeholder={`e.g. ${modalMode === 'status' ? 'Transferred out of district' : 'User forgot password'}`} />
                  </div>
                )}

                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={handleCloseModal}>Cancel</button>
                  <button type="submit" className={modalMode === 'status' && selectedUser?.isActive ? 'btn-danger' : 'btn-primary'}>
                    {modalMode === 'create' ? 'Create Account' : 
                     modalMode === 'edit' ? 'Save Changes' : 
                     modalMode === 'reset' ? 'Generate Password' : 
                     selectedUser?.isActive ? 'Deactivate Account' : 'Activate Account'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManagement;
