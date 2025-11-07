// app/complaints/page.tsx
'use client'

import { Suspense } from 'react'
import ComplaintForm from './ComplaintForm'

export default function ComplaintsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading complaint form...</div>
      </div>
    }>
      <ComplaintForm />
    </Suspense>
  )
}