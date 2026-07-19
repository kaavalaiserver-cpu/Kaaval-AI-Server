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
  const [junctions, setJunctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [subFilter, setSubFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'reset' | 'status' | 'delete'>('create');
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<UserAccount>>({});
  const [reason, setReason] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [autoGenerate, setAutoGenerate] = useState(true);

  const fetchUsersAndJunctions = async () => {
    setLoading(true);
    try {
      const [usersRes, juncRes] = await Promise.all([
        axios.get(`${API_BASE}/users`),
        axios.get(`${API_BASE}/cameras/junctions`)
      ]);
      setUsers(usersRes.data);
      setJunctions(juncRes.data);
    } catch (err) {
      console.error('Failed to fetch users or junctions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndJunctions();
  }, []);

  const handleOpenModal = (mode: 'create' | 'edit' | 'reset' | 'status' | 'delete', user?: UserAccount) => {
    setModalMode(mode);
    setSelectedUser(user || null);
    setReason('');
    setTempPassword('');
    setCustomPassword('');
    setAutoGenerate(true);
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
        junction: user.junction,
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
        if (res.data.temporaryPassword) {
          setTempPassword(res.data.temporaryPassword);
        } else {
          handleCloseModal();
        }
        fetchUsersAndJunctions();
      } else if (modalMode === 'edit' && selectedUser) {
        if (!reason && formData.role !== selectedUser.role) {
            alert('Reason is required for role changes');
            return;
        }
        const payload = { ...formData, reason };
        if (formData.role === selectedUser.role) {
            delete payload.role;
        }
        await axios.patch(`${API_BASE}/users/${selectedUser.id}`, payload);
        handleCloseModal();
        fetchUsersAndJunctions();
      } else if (modalMode === 'status' && selectedUser) {
        if (!reason) {
            alert('Reason is required to change status');
            return;
        }
        await axios.patch(`${API_BASE}/users/${selectedUser.id}/status`, { isActive: !selectedUser.isActive, reason });
        handleCloseModal();
        fetchUsersAndJunctions();
      } else if (modalMode === 'reset' && selectedUser) {
        if (!reason) {
            alert('Reason is required to reset password');
            return;
        }
        if (!autoGenerate && !customPassword.trim()) {
            alert('Password is required for manual entry');
            return;
        }
        const res = await axios.post(`${API_BASE}/users/${selectedUser.id}/reset-password`, {
          reason,
          customPassword: autoGenerate ? undefined : customPassword.trim()
        });
        setTempPassword(res.data.temporaryPassword);
        fetchUsersAndJunctions();
      } else if (modalMode === 'delete' && selectedUser) {
        if (window.confirm(`Are you SURE you want to completely delete the user ${selectedUser.username}? This cannot be undone.`)) {
          await axios.delete(`${API_BASE}/users/${selectedUser.id}`);
          handleCloseModal();
          fetchUsersAndJunctions();
        }
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Action failed');
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.username.toLowerCase().includes(search.toLowerCase()) || 
                          u.fullName.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter ? (u.role || '').toLowerCase() === roleFilter.toLowerCase() : true;
    const matchesSub = subFilter ? u.subdivision === subFilter : true;
    const matchesStatus = statusFilter === 'active' ? u.isActive : statusFilter === 'inactive' ? !u.isActive : true;
    return matchesSearch && matchesRole && matchesSub && matchesStatus;
  });

  const totalActive   = users.filter(u => u.isActive).length;
  const totalInactive = users.filter(u => !u.isActive).length;
  const totalLocked   = users.filter(u => u.lockedUntil && new Date(u.lockedUntil) > new Date()).length;

  return (
    <div className="users-page">
      <div className="users-header">
        <h2><Users size={22} /> User Management</h2>
        <div className="users-header-right">
          <button className="btn-secondary" onClick={fetchUsersAndJunctions}><RefreshCw size={15} /> Refresh</button>
          <button className="btn-primary" onClick={() => handleOpenModal('create')}><UserPlus size={15} /> Create User</button>
        </div>
      </div>

      {/* Summary chips */}
      <div className="users-summary">
        <div className="summary-chip total">
          <span className="summary-num">{users.length}</span>
          <span className="summary-label">Total Accounts</span>
        </div>
        <div className="summary-chip active">
          <span className="summary-num">{totalActive}</span>
          <span className="summary-label">Active</span>
        </div>
        <div className="summary-chip inactive">
          <span className="summary-num">{totalInactive}</span>
          <span className="summary-label">Inactive</span>
        </div>
        <div className="summary-chip locked">
          <span className="summary-num">{totalLocked}</span>
          <span className="summary-label">Locked</span>
        </div>
      </div>

      <div className="users-filters">
        <div className="search-box">
          <Search size={16} color="var(--text-dim)" />
          <input
            type="text"
            placeholder="Search username or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-selects">
          <select className="filter-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ').toUpperCase()}</option>)}
          </select>
          <select className="filter-select" value={subFilter} onChange={(e) => setSubFilter(e.target.value)}>
            <option value="">All Subdivisions</option>
            {SUBDIVISIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
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
                  <td colSpan={6}>
                    <div className="empty-state">
                      <Users size={40} />
                      <p>No users match your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isLocked = user.lockedUntil && new Date(user.lockedUntil) > new Date();
                  const initials = (user.fullName || user.username || '?')[0].toUpperCase();
                  return (
                    <tr key={user.id} className={!user.isActive ? 'inactive-row' : ''}>
                      <td>
                        <div className="user-cell">
                          <div className={`user-avatar ${!user.isActive ? 'inactive' : ''}`}>{initials}</div>
                          <div>
                            <div className="user-username">
                              {user.username}
                              {user.requiresPasswordChange && <span className="badge-warning" title="Password change required"><ShieldAlert size={11}/></span>}
                            </div>
                            <div className="user-id">#{user.id?.toString().slice(0, 8)}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="td-stack">
                          <span className="td-main">{user.fullName || '—'}</span>
                          <span className="td-sub">{user.designation || 'No designation'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="td-stack">
                          <span className={`role-badge ${(user.role || '').toLowerCase()}`}>{(user.role || 'unknown').replace(/_/g, ' ').toUpperCase()}</span>
                          <span className="td-sub">{user.junction || user.subdivision || 'Full Access'}</span>
                        </div>
                      </td>
                      <td>
                        {isLocked ? (
                          <span className="status-badge warn"><Lock size={11}/> Locked</span>
                        ) : user.isActive ? (
                          <span className="status-badge ok"><CheckCircle size={11}/> Active</span>
                        ) : (
                          <span className="status-badge error"><XCircle size={11}/> Inactive</span>
                        )}
                      </td>
                      <td>
                        <div className="td-stack">
                          <span className="td-main" style={{ fontSize: '0.82rem' }}>
                            {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                          </span>
                          <span className="td-sub">
                            {user.lastLogin ? new Date(user.lastLogin).toLocaleTimeString() : ''}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button onClick={() => handleOpenModal('edit', user)}>Edit</button>
                          <button onClick={() => handleOpenModal('reset', user)}>Reset</button>
                          <button
                            className={user.isActive ? 'btn-danger' : 'btn-success'}
                            onClick={() => handleOpenModal('status', user)}
                          >
                            {user.isActive ? 'Disable' : 'Enable'}
                          </button>
                          {user.username !== 'superadmin' && user.role !== 'SUPER_ADMIN' && (
                            <button
                              style={{ color: '#ef4444', border: '1px solid #ef4444', background: 'transparent' }}
                              onClick={() => handleOpenModal('delete', user)}
                            >
                              Delete
                            </button>
                          )}
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
                 modalMode === 'delete' ? `Delete User: ${selectedUser?.username}` :
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
                      <div className="form-row">
                        <div className="form-group">
                          <label>Username</label>
                          <input type="text" required value={formData.username || ''} onChange={e => setFormData({...formData, username: e.target.value})} />
                        </div>
                        <div className="form-group">
                          <label>Password</label>
                          <input type="text" required value={formData.password || ''} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Custom password" />
                        </div>
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
                        <select 
                          required={['inspector', 'sub_inspector', 'operator', 'nagercoil_admin', 'thuckalay_admin', 'colachel_admin', 'kanyakumari_admin', 'marthandam_admin'].includes(formData.role || '')} 
                          value={formData.subdivision || ''} 
                          onChange={e => setFormData({...formData, subdivision: e.target.value})}
                        >
                          <option value="">None (All Subdivisions)</option>
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

                {modalMode === 'reset' && (
                  <>
                    <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: '4px 0' }}>
                      <input 
                        type="checkbox" 
                        id="autoGenerate" 
                        checked={autoGenerate} 
                        onChange={e => setAutoGenerate(e.target.checked)} 
                        style={{ cursor: 'pointer' }}
                      />
                      <label htmlFor="autoGenerate" style={{ cursor: 'pointer', margin: 0, textTransform: 'none', letterSpacing: 'normal' }}>
                        Auto-generate temporary password
                      </label>
                    </div>

                    {!autoGenerate && (
                      <div className="form-group">
                        <label>Enter New Password</label>
                        <input 
                          type="text" 
                          required 
                          placeholder="Enter new custom password" 
                          value={customPassword} 
                          onChange={e => setCustomPassword(e.target.value)} 
                        />
                      </div>
                    )}
                  </>
                )}

                {modalMode === 'delete' && (
                  <div className="form-group" style={{ textAlign: 'center', margin: '20px 0' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>Are you sure you want to permanently delete this user?</p>
                    <p style={{ color: '#ef4444', fontWeight: 'bold', marginTop: '10px' }}>This action cannot be undone.</p>
                  </div>
                )}

                {(modalMode === 'status' || modalMode === 'reset') && (
                  <div className="form-group">
                    <label>Reason for Action (Mandatory)</label>
                    <input type="text" required value={reason} onChange={e => setReason(e.target.value)} placeholder={`e.g. ${modalMode === 'status' ? 'Transferred out of district' : 'User request / forgot password'}`} />
                  </div>
                )}

                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={handleCloseModal}>Cancel</button>
                  <button type="submit" className={(modalMode === 'status' && selectedUser?.isActive) || modalMode === 'delete' ? 'btn-primary btn-danger' : 'btn-primary'}>
                    {modalMode === 'create' ? 'Create Account' : 
                     modalMode === 'edit' ? 'Save Changes' : 
                     modalMode === 'reset' ? (autoGenerate ? 'Generate Password' : 'Set Password') : 
                     modalMode === 'delete' ? 'Permanently Delete' :
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
