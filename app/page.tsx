import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LoginForm from '@/components/LoginForm'
import BookmarkDashboard from '@/components/BookmarkDashboard'

export default async function Home() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Smart Bookmark App
            </h1>
            <p className="text-gray-600">
              Save and organize your bookmarks with real-time sync
            </p>
          </div>
          <LoginForm />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <BookmarkDashboard user={user} />
    </main>
  )
}