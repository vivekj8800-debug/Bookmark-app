'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { toast } from 'react-hot-toast'
import { PlusIcon, LogOutIcon, TrashIcon, BookmarkIcon, ExternalLinkIcon } from 'lucide-react'
import AddBookmarkForm from './AddBookmarkForm'
import { Database } from '@/types/database'

type Bookmark = Database['public']['Tables']['bookmarks']['Row']

interface BookmarkDashboardProps {
  user: User
}

export default function BookmarkDashboard({ user }: BookmarkDashboardProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchBookmarks()
    
    // Set up real-time subscription
    const channel = supabase
      .channel('bookmark_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookmarks',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newBookmark = payload.new as Bookmark
            setBookmarks(prev => [newBookmark, ...prev])
            toast.success('New bookmark added!')
          } else if (payload.eventType === 'DELETE') {
            setBookmarks(prev => prev.filter(bookmark => bookmark.id !== payload.old.id))
            toast.success('Bookmark deleted!')
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user.id, supabase])

  const fetchBookmarks = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch('/api/bookmarks', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setBookmarks(data)
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to load bookmarks')
      }
    } catch (error) {
      console.error('Error fetching bookmarks:', error)
      toast.error('An error occurred while loading bookmarks')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/auth/logout', { method: 'POST' })
    window.location.reload()
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`/api/bookmarks/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to delete bookmark')
      }
    } catch (error) {
      console.error('Error deleting bookmark:', error)
      toast.error('An error occurred while deleting bookmark')
    } finally {
      setDeletingId(null)
    }
  }

  const handleAddBookmark = (newBookmark: Bookmark) => {
    setShowAddForm(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <BookmarkIcon className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Bookmarks</h1>
            <p className="text-gray-600">Welcome back, {user.user_metadata?.full_name || user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            Add Bookmark
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOutIcon className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Add Bookmark Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <AddBookmarkForm
              onSuccess={handleAddBookmark}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        </div>
      )}

      {/* Bookmarks List */}
      {bookmarks.length === 0 ? (
        <div className="text-center py-12">
          <BookmarkIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No bookmarks yet</h3>
          <p className="text-gray-600 mb-6">Start building your bookmark collection by adding your first link.</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            Add Your First Bookmark
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {bookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-medium text-gray-900 mb-2 truncate">
                    {bookmark.title}
                  </h3>
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors text-sm"
                  >
                    <span className="truncate">{bookmark.url}</span>
                    <ExternalLinkIcon className="h-3 w-3 flex-shrink-0" />
                  </a>
                  <p className="text-xs text-gray-500 mt-2">
                    Added {new Date(bookmark.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(bookmark.id)}
                  disabled={deletingId === bookmark.id}
                  className="ml-4 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  {deletingId === bookmark.id ? (
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <TrashIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}