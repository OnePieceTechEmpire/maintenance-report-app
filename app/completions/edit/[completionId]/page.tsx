'use client'

import { Suspense } from 'react'
import CompletionForm from '../../new/CompletionForm'

export default function EditCompletionPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CompletionForm />
    </Suspense>
  )
}
