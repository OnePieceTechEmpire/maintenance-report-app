// app/login/page.tsx
'use client'

import Image from 'next/image'
import { useState } from 'react'
import { signIn, signUp } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase' // Add this import

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
   if (isSignUp) {
      await signUp(email, password, fullName)
      alert('Registration successful! Please check your email for verification.')
    } else {
      const { user } = await signIn(email, password) // Get user from signIn
      
      if (!user) {
        router.push('/dashboard')
        return
      }

      // Get user profile to check role and company
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, company_id')
        .eq('id', user.id)
        .single()

      // Redirect super admin with no company to admin panel
      if (profile?.role === 'super_admin' && !profile?.company_id) {
        router.push('/admin')
      } else {
        router.push('/dashboard')
      }
    }
    } catch (error: any) {
      console.error('Auth error:', error)
      
      // Handle specific error cases
      if (error.message?.includes('429')) {
        setError('Too many attempts. Please wait a moment and try again.')
      } else if (error.message?.includes('Email not confirmed')) {
        setError('Please check your email to confirm your account.')
      } else if (error.message?.includes('Invalid login credentials')) {
        setError('Invalid email or password.')
      } else {
        setError(error.message || 'Authentication failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
                {/* ✅ Add your image here */}
        <Image
          src="/images/login.png" // Put your image in /public/logo.png
          alt="login logo"
          width={70}
          height={64}
          className="mx-auto mb-4"
        />
<h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
  {isSignUp ? 'Staff Registration' : 'Staff Login'}
</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          )}
          
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
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
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : (isSignUp ? 'Register' : 'Login')}
          </button>
        </form>

        <button
          onClick={() => {
            setIsSignUp(!isSignUp)
            setError(null)
          }}
          className="w-full mt-4 text-blue-500 hover:text-blue-600 text-center"
        >

        </button>
      </div>
    </div>
  )
}