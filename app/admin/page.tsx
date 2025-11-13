'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminPanel() {
  const [users, setUsers] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'users' | 'companies' | 'invite'  | 'overview'>('users')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const [inviteEmail, setInviteEmail] = useState('')
const [inviteCompany, setInviteCompany] = useState('')
const [inviteRole, setInviteRole] = useState('staff')
const [inviting, setInviting] = useState(false)
const [pendingInvites, setPendingInvites] = useState<any[]>([])
const [selectedCompanyFilter, setSelectedCompanyFilter] = useState('all')
const [companyStats, setCompanyStats] = useState<any[]>([]);

  useEffect(() => {
    checkAdminAccess()
    fetchUsers()
    fetchCompanies()
    fetchPendingInvites()
    fetchCompanyStats();
  }, [])

const fetchPendingInvites = async () => {
  const { data } = await supabase
    .from('user_invites')
    .select(`
      *,
      companies (name),
      profiles:invited_by (full_name)
    `)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
  
  setPendingInvites(data || [])
}
  
// Add this invitation function
const sendInvitation = async () => {
  if (!inviteEmail || !inviteCompany) {
    alert('Please fill in email and company')
    return
  }

  setInviting(true)
  try {
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36)
    
    const { error } = await supabase
      .from('user_invites')
      .insert([{
        email: inviteEmail,
        company_id: inviteCompany,
        role: inviteRole,
        invited_by: user.id,
        token: token,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }])

    if (error) throw error

    const invitationLink = `${window.location.origin}/invite/${token}`
    
    // ✅ FIXED: Better clipboard handling for mobile
    try {
      await navigator.clipboard.writeText(invitationLink)
      
      // Show success message with copy option
      alert(`✅ Invitation created for ${inviteEmail}!\n\nLink copied to clipboard.`)
      
    } catch (clipboardError) {
      console.warn('Clipboard failed, showing link for manual copy:', clipboardError)
      
      // Mobile fallback - show the link and instructions
      const shouldCopy = confirm(
        `✅ Invitation created for ${inviteEmail}!\n\n` +
        `Invitation Link:\n${invitationLink}\n\n` +
        `Please copy this link manually and send it to the user.`
      )
      
      // Optional: Try to select the text for easier copying on mobile
      if (shouldCopy) {
        // Create a temporary input to help with copying on mobile
        const tempInput = document.createElement('input')
        tempInput.value = invitationLink
        document.body.appendChild(tempInput)
        tempInput.select()
        tempInput.setSelectionRange(0, 99999) // For mobile devices
        document.execCommand('copy')
        document.body.removeChild(tempInput)
        
        alert('Link selected! Please paste it to share with the user.')
      }
    }
        // ⬇️⬇️ ADD THIS - Refresh the pending invites list ⬇️⬇️
    fetchPendingInvites()
    
    setInviteEmail('')
    setInviteCompany('')
    setInviteRole('staff')
    
  } catch (error) {
    console.error('Error sending invitation:', error)
    alert('Failed to send invitation')
  } finally {
    setInviting(false)
  }
}

const resendInvitation = async (invite: any) => {
  try {
    const invitationLink = `${window.location.origin}/invite/${invite.token}`
    
    // Try to copy to clipboard
    await navigator.clipboard.writeText(invitationLink)
    
    // Also show it in alert so user can manually copy if needed
    alert(`Invitation link for ${invite.email}:\n\n${invitationLink}\n\n(Link copied to clipboard!)`)
    
  } catch (error) {
    console.error('Error copying invitation:', error)
    
    // Fallback: just show the link if clipboard fails
    const invitationLink = `${window.location.origin}/invite/${invite.token}`
    alert(`📋 Invitation link for ${invite.email}:\n\n${invitationLink}\n\n(Please copy this link manually)`)
  }
}




  const checkAdminAccess = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authUser.id)
      .single()

    if (profile?.role !== 'super_admin') {
      alert('Access denied. Admin only.')
      router.push('/dashboard')
      return
    }

    setUser(authUser)
  }

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        companies (name)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
      return
    }
    setUsers(data || [])
    setLoading(false)
  }

  const fetchCompanies = async () => {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching companies:', error)
      return
    }
    setCompanies(data || [])
  }

const updateUserRole = async (userId: string, newRole: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId)
    .select() // Add this to see the actual response

  if (error) {
    alert('Error updating user role: ' + error.message)
    console.error(error)
    return
  }
  
  console.log('Update response:', data) // Check what comes back
  alert('User role updated successfully')
  fetchUsers()
}


const updateUserCompany = async (userId: string, companyId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ company_id: companyId })
    .eq('id', userId)
    .select() // Add this to see the actual response

  if (error) {
    alert('Error updating user company: ' + error.message)
    console.error(error)
    return
  }
  
  console.log('Update response:', data) // Check what comes back
  alert('User company updated successfully')
  fetchUsers()
}




const fetchCompanyStats = async () => {
  const { data, error } = await supabase
    .from('companies')
    .select(`
      id,
      name,
      complaints:complaints (
        id,
        status
      )
    `);

  if (error) {
    console.error("Error fetching company stats:", error);
    return;
  }

  const mapped = data.map(company => {
    const complaints = company.complaints || [];

    return {
      id: company.id,
      name: company.name,
      total: complaints.length,
      pending: complaints.filter(c => c.status === 'pending').length,
      in_progress: complaints.filter(c => c.status === 'in_progress').length,
      draft: complaints.filter(c => c.status === 'draft' || c.status === 'draft_in_progress').length,
      completed: complaints.filter(c => c.status === 'completed').length,
    };
  });

  setCompanyStats(mapped);
};


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading Admin Panel...</div>
      </div>
    )
  }

    const handleLogout = async () => {
      await supabase.auth.signOut()
      router.push('/login')
    }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Admin Panel</h1>
      <button
        onClick={handleLogout}
        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
      >
        Logout
      </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              User Management ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('companies')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'companies'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Companies ({companies.length})
            </button>
            <button
  onClick={() => setActiveTab('overview')}
  className={`px-4 py-2 border-b-2 ${activeTab === 'overview' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-600'}`}
>
  Overview
</button>

              <button
    onClick={() => setActiveTab('invite')}
    className={`py-2 px-1 border-b-2 font-medium text-sm ${
      activeTab === 'invite'
        ? 'border-purple-500 text-purple-600'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`}
  >
    Invite New User
  </button>
          </nav>
        </div>

        {activeTab === 'overview' && (
  <div className="bg-white shadow rounded-lg p-6">
    <h2 className="text-lg font-semibold mb-4">Company Work Progress</h2>

    {companyStats.length === 0 && (
      <p className="text-gray-500">No data available.</p>
    )}

    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {companyStats.map(stat => (
        <div key={stat.id} className="border rounded-lg p-5 shadow-sm bg-white">
          <h3 className="text-base font-bold text-gray-800">
            {stat.name}
          </h3>

          <div className="mt-3 space-y-1 text-sm">
            <p>Total Aduan: <b>{stat.total}</b></p>
            <p className="text-yellow-600">Pending: {stat.pending}</p>
            <p className="text-blue-600">In Progress: {stat.in_progress}</p>
            <p className="text-gray-600">Draft: {stat.draft}</p>
            <p className="text-green-600 font-medium">Completed: {stat.completed}</p>
          </div>

          <button
            onClick={() => router.push(`/admin/company/${stat.id}`)}
            className="mt-4 w-full bg-blue-400 text-white py-2 rounded hover:bg-blue-700"
          >
            View Complaints
          </button>
        </div>
      ))}
    </div>
  </div>
)}


 {/* Users Tab */}
{activeTab === 'users' && (() => {
  // ⬇️⬇️ MOVE FILTERED USERS LOGIC HERE ⬇️⬇️
  const filteredUsers = selectedCompanyFilter === 'all' 
    ? users 
    : users.filter(user => user.company_id === selectedCompanyFilter)
  
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Manage Users</h2>
        
        {/* Company Filter Dropdown */}
        <div className="flex items-center gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mr-2">Filter by Company:</label>
            <select
              value={selectedCompanyFilter}
              onChange={(e) => setSelectedCompanyFilter(e.target.value)}
              className="border rounded px-1 py-1 text-sm"
            >
              <option value="all">All Companies</option>
              {companies.map(company => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
          <div className="text-sm text-gray-600">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>

            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {user.full_name || 'No name'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {user.email}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <select
                    value={user.company_id || ''}
                    onChange={(e) => updateUserCompany(user.id, e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="">No Company</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <select
                    value={user.role}
                    onChange={(e) => updateUserRole(user.id, e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="staff">Staff</option>
                    <option value="company_admin">Company Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    user.status === 'active' 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {user.status || 'active'}
                  </span>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Show empty state if no users */}
        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {selectedCompanyFilter === 'all' 
              ? 'No users found' 
              : 'No users in this company'
            }
          </div>
        )}
      </div>
    </div>
  )
})()}

        

{/* Invite User Tab */}
{activeTab === 'invite' && (
  <div className="bg-white shadow rounded-lg p-6">
    <h2 className="text-lg font-semibold mb-4">Invite New User</h2>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          type="email"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm"
          placeholder="user@gmail.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Company
        </label>
        <select
          value={inviteCompany}
          onChange={(e) => setInviteCompany(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm"
        >
          <option value="">Select Company</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Role
        </label>
        <select
          value={inviteRole}
          onChange={(e) => setInviteRole(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm"
        >
          <option value="staff">Staff</option>        </select>
      </div>
      <div className="flex items-end">
        <button
          onClick={sendInvitation}
          disabled={inviting}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
        >
          {inviting ? 'Sending...' : 'Send Invitation'}
        </button>
      </div>
    </div>
    {/* Pending Invitations Section */}
{pendingInvites.length > 0 && (
  <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
    <h3 className="text-lg font-semibold mb-4">Pending Invitations</h3>
    <div className="space-y-3">
      {pendingInvites.map((invite) => (
        <div key={invite.id} className="flex justify-between items-center p-3 bg-white rounded border">
          <div>
            <div className="font-medium">{invite.email}</div>
            <div className="text-sm text-gray-600">
              {invite.companies.name} • {invite.role} • 
              Expires: {new Date(invite.expires_at).toLocaleDateString()}
            </div>
          </div>
<button
  onClick={() => resendInvitation(invite)}  // ⬅️ Pass the whole invite object
  className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm"
>
  Copy Link
</button>
        </div>
      ))}
    </div>
  </div>
)}
  </div>
  
)}


        {/* Companies Tab */}
        {activeTab === 'companies' && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Companies</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Users
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {companies.map((company) => (
                    <tr key={company.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {company.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {company.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {users.filter(u => u.company_id === company.id).length} users
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}