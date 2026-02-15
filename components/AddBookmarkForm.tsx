'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { XIcon } from 'lucide-react'
import { Database } from '@/types/database'
import { createClient } from '@/lib/supabase/client'

type Bookmark = Database['public']['Tables']['bookmarks']['Row']

interface AddBookmarkFormProps {
  onSuccess: (bookmark: Bookmark) => void
  onCancel: () => void
}

export default function AddBookmarkForm({ onSuccess, onCancel }: AddBookmarkFormProps) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchingTitle, setFetchingTitle] = useState(false)
  const supabase = createClient()

  const isValidUrl = (string: string) => {
    try {
      const url = new URL(string)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch (_) {
      return false
    }
  }

  const fetchTitleFromUrl = async (url: string) => {
    if (!isValidUrl(url)) return
    
    setFetchingTitle(true)
    try {
      // In a real implementation, you'd need a backend service to fetch the title
      // For now, we'll extract domain name as a fallback
      const urlObj = new URL(url)
      const domain = urlObj.hostname.replace('www.', '')
      setTitle(domain.charAt(0).toUpperCase() + domain.slice(1))
    } catch (error) {
      // Ignore errors when fetching title
    } finally {
      setFetchingTitle(false)
    }
  }

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value
    setUrl(newUrl)
    
    // Auto-fetch title when URL is valid and title is empty
    if (isValidUrl(newUrl) && !title) {
      fetchTitleFromUrl(newUrl)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!url.trim() || !title.trim()) {
      toast.error('Please fill in both URL and title')
      return
    }
    
    if (!isValidUrl(url)) {
      toast.error('Please enter a valid URL (including http:// or https://)')
      return
    }

    setLoading(true)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          url: url.trim(),
          title: title.trim(),
        }),
      })
      
      if (response.ok) {
        const bookmark = await response.json()
        onSuccess(bookmark)
        toast.success('Bookmark added successfully!')
        setUrl('')
        setTitle('')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to add bookmark')
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Add New Bookmark</h2>
        <button
          onClick={onCancel}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <XIcon className="h-5 w-5" />
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
            URL
          </label>
          <input
            type="url"
            id="url"
            value={url}
            onChange={handleUrlChange}
            placeholder="https://example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
        
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Title
            {fetchingTitle && (
              <span className="text-xs text-gray-500 ml-2">(Auto-generating...)</span>
            )}
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter bookmark title"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
        
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || fetchingTitle}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Adding...
              </span>
            ) : (
              'Add Bookmark'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}