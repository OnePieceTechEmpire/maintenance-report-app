// app/pm/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Company {
  id: string
  name: string
  code: string | null
}

export default function PMCompanySelector() {
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(true)
  const [companies, setCompanies] = useState<Company[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)
  const router = useRouter()

  // 🔐 Check PM / Super Admin access
  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (error || !profile) {
        router.push('/login')
        return
      }

      if (profile.role !== 'project_manager' && profile.role !== 'super_admin') {
        alert('Access denied. Project Manager / HQ only.')
        router.push('/dashboard')
        return
      }

      setUserRole(profile.role)

      // Fetch all companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('name')

      if (companiesError) {
        console.error('Error fetching companies:', companiesError)
      } else {
        setCompanies(companiesData || [])
      }

      setLoading(false)
      setChecking(false)
    }

    checkAccess()
  }, [router])

  if (checking || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading Project Manager view...</p>
      </div>
    )
  }

  const handleSelectCompany = (companyId: string) => {
    router.push(`/pm/${companyId}/dashboard`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Project Manager – Pilih Syarikat
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Anda sedang log masuk sebagai: <span className="font-semibold">{userRole}</span>
            </p>
          </div>

          <button
            onClick={async () => {
              await supabase.auth.signOut()
              router.push('/login')
            }}
            className="bg-red-500 text-white px-4 py-2 rounded-md text-sm hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800">
            Senarai Syarikat
          </h2>
          <p className="text-sm text-gray-500">
            Pilih salah satu syarikat di bawah untuk masuk ke dashboard aduan & penyelesaian syarikat tersebut.
          </p>
        </div>

        {companies.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6 text-center text-gray-500">
            Tiada syarikat direkodkan lagi.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map((company) => (
              <button
                key={company.id}
                onClick={() => handleSelectCompany(company.id)}
                className="bg-white shadow-sm rounded-lg p-4 border border-gray-100 hover:border-blue-500 hover:shadow-md text-left transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-800">
                      {company.name}
                    </h3>
                    {company.code && (
                      <p className="text-xs text-gray-500 mt-1">
                        Kod: {company.code}
                      </p>
                    )}
                  </div>
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600 text-sm font-bold">
                    {company.name?.charAt(0) ?? 'C'}
                  </span>
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  Klik untuk lihat aduan & penyelesaian bagi syarikat ini.
                </p>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
