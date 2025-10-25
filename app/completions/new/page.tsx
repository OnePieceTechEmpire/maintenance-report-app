// app/completions/new/page.tsx
'use client'

import { Suspense } from 'react'
import CompletionForm from './CompletionForm'


export default function NewCompletionPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CompletionForm />
    </Suspense>
  )
}