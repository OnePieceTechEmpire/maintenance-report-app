'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase,getSupabaseServer } from '@/lib/supabase'


export default function AcceptInvitation() {
  const [invite, setInvite] = useState<any>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState('')
  
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  useEffect(() => {
    checkInvitation()
  }, [token])

  const checkInvitation = async () => {
    try {
      const { data, error } = await supabase
        .from('user_invites')
        .select(`
          *,
          companies (name),
          profiles:invited_by (full_name)
        `)
        .eq('token', token)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (error || !data) {
        setError('Invalid or expired invitation link')
        return
      }

      setInvite(data)
    } catch (error) {
      console.error('Error checking invitation:', error)
      setError('Invalid invitation link')
    } finally {
      setLoading(false)
    }
  }

 // Add this debug version temporarily
const acceptInvitation = async (e: React.FormEvent) => {
  e.preventDefault()
  setAccepting(true)
  setError('')

  try {
    console.log('1. Starting invitation acceptance...')
    
    // 1. Create the auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: invite.email,
      password: password,
      
    })

    if (authError) throw authError
    console.log('2. Auth user created:', authData.user?.id)

    if (!authData.user) {
      throw new Error('Failed to create user account')
    }

    // 2. Use API route to create profile (bypasses RLS via service role)
    const response = await fetch('/api/create-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: authData.user.id,
        full_name: fullName,
        email: invite.email,
        company_id: invite.company_id,
        role: invite.role
      })
    })

    const result = await response.json()
    if (!response.ok) {
      throw new Error(result.error || 'Failed to create profile')
    }
    console.log('3. Profile created via API')

    // 3. Mark invitation as used
    const { error: inviteError } = await supabase
      .from('user_invites')
      .update({ used: true })
      .eq('id', invite.id)

    if (inviteError) throw inviteError
    console.log('4. Invitation marked as used')

    alert('Account created successfully! You can now login.')
    router.push('/login')

  } catch (error: any) {
    console.error('Error accepting invitation:', error)
    setError(error.message || 'Failed to create account')
  } finally {
    setAccepting(false)
  }
}

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Checking invitation...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
          <div className="text-red-500 text-lg mb-4">❌</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Invalid Invitation</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
        <div className="text-center mb-6">
          <div className="text-green-500 text-lg mb-2">🎉</div>
          <h1 className="text-2xl font-bold text-gray-800">You're Invited!</h1>
          <p className="text-gray-600 mt-2">
            Join {invite.companies.name} as {invite.role}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Invited by {invite.profiles.full_name}
          </p>
        </div>

        <form onSubmit={acceptInvitation} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={invite.email}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-gray-600"
            />
            <p className="text-xs text-gray-500 mt-1">This email was used for your invitation</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={accepting}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {accepting ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-6">
          By creating an account, you agree to our terms of service.
        </p>
      </div>
    </div>
  )
}