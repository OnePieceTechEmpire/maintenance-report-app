// app/page.tsx
import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
                        <Image
                  src="/images/home.jpg" // Put your image in /public/logo.png
                  alt="login logo"
                  width={150}
                  height={64}
                  className="mx-auto mb-4"
                />
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Maintenance Report System
        </h1>

        <p className="text-gray-600 mb-6">
          Submit and track maintenance complaints
        </p>
        <div className="space-x-4">
          <Link 
            href="/login" 
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
          >
            Staff Login
          </Link>

        </div>
      </div>
    </div>
  )
}