'use client';

import { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

interface ScheduledPost {
  id: string;
  userId: string;
  content: string;
  platforms: string[];
  scheduledTime: string | Date; // Can be ISO string or Date
  imageUrl?: string;
  status: 'PENDING' | 'PROCESSING' | 'PUBLISHED' | 'FAILED' | 'pending' | 'published' | 'failed'; // Support both formats
  createdAt?: string | Date;
  updatedAt?: string | Date;
  errorMessage?: string;
  retryCount?: number;
  maxRetries?: number;
}

interface ScheduledPostsStats {
  total: number;
  pending: number;
  published: number;
  failed: number;
}

export default function ScheduledPostsPage() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [stats, setStats] = useState<ScheduledPostsStats>({ total: 0, pending: 0, published: 0, failed: 0 });
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [filter, setFilter] = useState<'all' | 'pending' | 'published' | 'failed'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editScheduledTime, setEditScheduledTime] = useState('');
  const [editPlatforms, setEditPlatforms] = useState<string[]>([]);

  useEffect(() => {
    fetchScheduledPosts();
  }, []);

  const fetchScheduledPosts = async () => {
    try {
      const response = await fetch('/api/schedule/list', {
        credentials: 'include' // Include cookies (auth-token)
      });
      const data = await response.json();
      
      if (data.success && data.posts) {
        // Transform data to match expected format
        const transformedPosts = data.posts.map((post: any) => ({
          id: post.id?.toString() || '',
          userId: post.userId?.toString() || '',
          content: post.content,
          platforms: post.platforms || [],
          status: (post.status || 'PENDING').toUpperCase(), // Normalize to uppercase
          scheduledTime: new Date(post.scheduledTime), // Convert to Date object
          imageUrl: post.imageUrl,
          retryCount: post.retryCount || 0,
          maxRetries: post.maxRetries || 3,
          errorMessage: post.errorMessage,
          createdAt: post.createdAt ? new Date(post.createdAt) : new Date(),
          updatedAt: post.updatedAt ? new Date(post.updatedAt) : new Date()
        }));
        
        setPosts(transformedPosts);
        setStats(data.stats || {
          total: transformedPosts.length,
          pending: transformedPosts.filter((p: any) => p.status === 'PENDING').length,
          published: transformedPosts.filter((p: any) => p.status === 'PUBLISHED').length,
          failed: transformedPosts.filter((p: any) => p.status === 'FAILED').length
        });
      } else {
        setMessage(data.error || 'Failed to fetch scheduled posts');
      }
    } catch (error) {
      console.error('Error fetching scheduled posts:', error);
      setMessage('Failed to fetch scheduled posts');
    } finally {
      setIsLoading(false);
    }
  };

  const deletePost = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scheduled post?')) {
      return;
    }

    try {
      const response = await fetch(`/api/schedule/${id}`, {
        method: 'DELETE',
        credentials: 'include' // Include cookies (auth-token)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage('Scheduled post deleted successfully');
        fetchScheduledPosts(); // Refresh the list
      } else {
        setMessage(data.error || 'Failed to delete scheduled post');
      }
    } catch (error) {
      console.error('Error deleting scheduled post:', error);
      setMessage('Failed to delete scheduled post');
    }
  };

  const startEdit = (post: ScheduledPost) => {
    setEditingPost(post);
    setEditContent(post.content);
    setEditScheduledTime(new Date(post.scheduledTime).toISOString().slice(0, 16));
    // Map backend platform names ('x') to UI platform names ('twitter')
    setEditPlatforms(post.platforms.map(p => (p === 'x' || p === 'twitter') ? 'twitter' : p));
  };

  const saveEdit = async () => {
    if (!editingPost) return;

    try {
      const response = await fetch(`/api/schedule/${editingPost.id}`, {
        method: 'PUT',
        credentials: 'include', // Include cookies (auth-token)
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: editContent,
          platforms: editPlatforms, // API route will handle conversion
          scheduledTime: editScheduledTime,
          imageUrl: editingPost.imageUrl
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage('Scheduled post updated successfully');
        setEditingPost(null);
        fetchScheduledPosts(); // Refresh the list
      } else {
        setMessage(data.error || 'Failed to update scheduled post');
      }
    } catch (error) {
      console.error('Error updating scheduled post:', error);
      setMessage('Failed to update scheduled post');
    }
  };

  const cancelEdit = () => {
    setEditingPost(null);
    setEditContent('');
    setEditScheduledTime('');
    setEditPlatforms([]);
  };

  const getEventStyle = (event: any) => {
    const post = event.post as ScheduledPost;
    let backgroundColor = '#3b82f6'; // Default blue for Twitter
    
    // Check for both 'x' and 'twitter' for compatibility
    const hasX = post.platforms.includes('x') || post.platforms.includes('twitter');
    const hasInstagram = post.platforms.includes('instagram');
    
    if (hasInstagram && hasX) {
      backgroundColor = '#8b5cf6'; // Purple for both
    } else if (hasInstagram) {
      backgroundColor = '#ec4899'; // Pink for Instagram
    }
    
    const normalizedStatus = post.status.toUpperCase();
    if (normalizedStatus === 'PUBLISHED') {
      backgroundColor = '#10b981'; // Green for published
    } else if (normalizedStatus === 'FAILED') {
      backgroundColor = '#ef4444'; // Red for failed
    }

    return {
      style: {
        backgroundColor,
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        fontSize: '12px',
        padding: '2px 4px'
      }
    };
  };

  const getEventTitle = (event: any) => {
    const post = event.post as ScheduledPost;
    const platforms = post.platforms.map(p => (p === 'twitter' || p === 'x') ? 'X' : 'IG').join(', ');
    const normalizedStatus = post.status.toUpperCase();
    const status = normalizedStatus === 'PENDING' ? '' : ` (${normalizedStatus})`;
    return `${platforms}${status}`;
  };

  const filteredPosts = posts.filter(post => {
    if (filter === 'all') return true;
    const normalizedStatus = post.status.toUpperCase();
    const normalizedFilter = filter.toUpperCase();
    return normalizedStatus === normalizedFilter;
  });

  const calendarEvents = filteredPosts.map(post => {
    console.log('Processing post for calendar:', {
      id: post.id,
      scheduledTime: post.scheduledTime,
      scheduledTimeType: typeof post.scheduledTime
    });
    
    const startDate = new Date(post.scheduledTime);
    const endDate = new Date(post.scheduledTime);
    
    console.log('Created dates:', { startDate, endDate, isValid: !isNaN(startDate.getTime()) });
    
    return {
      id: post.id,
      title: getEventTitle({ post }),
      start: startDate,
      end: endDate,
      post: post
    };
  });

  const formatDate = (date: Date | string) => {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      console.error('Invalid date:', date);
      return 'Invalid Date';
    }
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  };

  const getStatusColor = (status: string) => {
    const normalizedStatus = status.toUpperCase();
    switch (normalizedStatus) {
      case 'PENDING': return 'text-blue-600 bg-blue-100';
      case 'PROCESSING': return 'text-yellow-600 bg-yellow-100';
      case 'PUBLISHED': return 'text-green-600 bg-green-100';
      case 'FAILED': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPlatformIcon = (platform: string) => {
    return (platform === 'twitter' || platform === 'x') ? '𝕏' : '📷';
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading scheduled posts...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Scheduled Posts</h1>
          <p className="text-gray-600">Manage your scheduled social media posts</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-gray-600">Total Posts</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
            <div className="text-gray-600">Pending</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="text-2xl font-bold text-green-600">{stats.published}</div>
            <div className="text-gray-600">Published</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-gray-600">Failed</div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-2">
            <button
              onClick={() => setView('calendar')}
              className={`px-4 py-2 rounded-lg font-medium ${
                view === 'calendar'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              📅 Calendar View
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-4 py-2 rounded-lg font-medium ${
                view === 'list'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              📋 List View
            </button>
          </div>

          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Posts</option>
            <option value="pending">Pending</option>
            <option value="published">Published</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg border-2 shadow-lg mb-6 ${
            message.includes('success') || message.includes('deleted')
              ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border-green-200'
              : 'bg-gradient-to-r from-red-50 to-pink-50 text-red-800 border-red-200'
          }`}>
            {message}
          </div>
        )}

        {/* Calendar View */}
        {view === 'calendar' && (
          <div className="bg-white rounded-lg shadow border p-6">
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 600 }}
              eventPropGetter={getEventStyle}
              views={['month', 'week', 'day']}
              defaultView="month"
              popup
            />
          </div>
        )}

        {/* List View */}
        {view === 'list' && (
          <div className="bg-white rounded-lg shadow border">
            {filteredPosts.length === 0 ? (
              <div className="p-8 text-center text-gray-600">
                No scheduled posts found
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredPosts.map((post) => (
                  <div key={post.id} className="p-6 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {post.platforms.map((platform) => (
                            <span key={platform} className="text-lg">
                              {getPlatformIcon(platform)}
                            </span>
                          ))}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(post.status)}`}>
                            {post.status}
                          </span>
                        </div>
                        <p className="text-gray-900 mb-2 line-clamp-2">{post.content}</p>
                        <p className="text-sm text-gray-600">
                          Scheduled: {formatDate(post.scheduledTime)}
                        </p>
                        {post.errorMessage && (
                          <p className="text-sm text-red-600 mt-1">
                            Error: {post.errorMessage}
                          </p>
                        )}
                      </div>
                      <div className="ml-4 flex space-x-2">
                        {(post.status.toUpperCase() === 'PENDING' || post.status === 'pending') && (
                          <>
                            <button
                              onClick={() => startEdit(post)}
                              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deletePost(post.id)}
                              className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Edit Modal */}
        {editingPost && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">Edit Scheduled Post</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content
                </label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Platforms
                </label>
                <div className="space-y-2">
                  {['twitter', 'instagram'].map((platform) => (
                    <label key={platform} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editPlatforms.includes(platform)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditPlatforms([...editPlatforms, platform]);
                          } else {
                            setEditPlatforms(editPlatforms.filter(p => p !== platform));
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">{platform === 'twitter' ? 'X (Twitter)' : 'Instagram'}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scheduled Time
                </label>
                <input
                  type="datetime-local"
                  value={editScheduledTime}
                  onChange={(e) => setEditScheduledTime(e.target.value)}
                  min={new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={saveEdit}
                  className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
                >
                  Save Changes
                </button>
                <button
                  onClick={cancelEdit}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}