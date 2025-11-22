'use client';

import { useState, useEffect, useRef } from 'react';
import { getRecentPosts } from '@/lib/profileApi';

const TONE_OPTIONS = [
  'Neutral',
  'Friendly', 
  'Professional',
  'Funny',
  'Motivational'
];

const PLATFORM_OPTIONS = [
  'X (Twitter)'
];

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function ContentCreation() {
  // Mode toggle: 'manual' or 'ai'
  const [creationMode, setCreationMode] = useState<'manual' | 'ai'>('manual');
  
  // Manual mode states
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('Neutral');
  const [platform, setPlatform] = useState('X (Twitter)');
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<Array<{ url: string; type: 'image' | 'video'; file: File }>>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [message, setMessage] = useState('');
  
  // AI Chat mode states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [previousPosts, setPreviousPosts] = useState<string[]>([]);
  const [useAccountTone, setUseAccountTone] = useState(false);
  const [suggestedContent, setSuggestedContent] = useState<string | null>(null);
  
  // Scheduling states
  const [postMode, setPostMode] = useState<'now' | 'schedule'>('now');
  const [scheduledTime, setScheduledTime] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['X (Twitter)']);

  // Refs for file inputs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputAiRef = useRef<HTMLInputElement>(null);

  // Fetch previous posts when AI mode is enabled
  useEffect(() => {
    if (creationMode === 'ai' && previousPosts.length === 0) {
      const fetchPreviousPosts = async () => {
        try {
          const result = await getRecentPosts(20);
          console.log('🔍 getRecentPosts result:', result);
          
          if (result.success && result.data?.posts) {
            console.log('🔍 Posts data:', result.data.posts);
            const postContents = result.data.posts
              .map((post: any) => {
                console.log('🔍 Post item:', post);
                return post.content;
              })
              .filter(Boolean) as string[];
            
            console.log('🔍 Extracted post contents:', postContents);
            console.log('🔍 Number of posts:', postContents.length);
            
            setPreviousPosts(postContents);
            
            // Auto-enable account tone if user has posts
            if (postContents.length > 0) {
              setUseAccountTone(true);
              console.log('✅ Auto-enabled account tone - found', postContents.length, 'previous posts');
            } else {
              console.log('⚠️ No post content found in response');
            }
          } else {
            console.log('⚠️ Failed to fetch posts:', result.error || 'Unknown error');
            console.log('🔍 Full result:', JSON.stringify(result, null, 2));
          }
        } catch (error) {
          console.error('❌ Error fetching previous posts:', error);
        }
      };
      fetchPreviousPosts();
    }
  }, [creationMode]);

  // Disable account tone toggle if no previous posts
  const canUseAccountTone = previousPosts.length > 0;

  const handleMediaUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🔍 handleMediaUpload called');
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newFiles: File[] = [];
    const newPreviews: Array<{ url: string; type: 'image' | 'video'; file: File }> = [];

    // Validate and process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Check file type
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      if (!isImage && !isVideo) {
        setMessage(`⚠️ File "${file.name}" is not a supported image or video format`);
        continue;
      }

      // Check file size
      const maxImageSize = 5 * 1024 * 1024; // 5MB
      const maxVideoSize = 512 * 1024 * 1024; // 512MB
      const maxSize = isImage ? maxImageSize : maxVideoSize;
      
      if (file.size > maxSize) {
        const maxSizeMB = Math.round(maxSize / (1024 * 1024));
        setMessage(`⚠️ File "${file.name}" exceeds maximum size of ${maxSizeMB}MB`);
        continue;
      }

      // Check total media count (Twitter/X allows up to 4)
      if (mediaFiles.length + newFiles.length >= 4) {
        setMessage('⚠️ Twitter/X allows a maximum of 4 media items per tweet');
        break;
      }

      newFiles.push(file);

      // Create preview
      const reader = new FileReader();
      const fileIndex = newFiles.length - 1; // Index in newFiles array
      reader.onload = (e) => {
        const url = e.target?.result as string;
        const preview = { url, type: isImage ? 'image' : 'video' as 'image' | 'video', file };
        
        // Update previews state immediately for each file
        setMediaPreviews(prev => [...prev, preview]);
      };
      reader.readAsDataURL(file);
    }

    if (newFiles.length > 0) {
      setMediaFiles(prev => [...prev, ...newFiles]);
      // Clear message if files were successfully added
      if (newFiles.length === files.length) {
        setMessage('');
      }
    }

    // Reset input to allow selecting the same file again
    event.target.value = '';
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerateContent = async () => {
    if (!topic.trim()) {
      setMessage('Please enter a topic');
      return;
    }

    setIsGenerating(true);
    setMessage('');

    try {
      const response = await fetch('/api/send-to-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: topic,
          tone: tone
        })
      });

      const data = await response.json();

      if (response.ok) {
        setContent(data.post);
        setMessage('Content generated successfully!');
      } else {
        setMessage(data.error || 'Failed to generate content. Please try again.');
      }
    } catch (error) {
      console.error('Error generating content:', error);
      setMessage('Failed to generate content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // AI Chat handlers
  const handleChatSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || isChatting) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setIsChatting(true);
    setSuggestedContent(null);

    // Add user message to chat
    const newUserMessage: ChatMessage = { role: 'user', content: userMessage };
    setChatMessages(prev => [...prev, newUserMessage]);

    try {
      // Build messages array for API
      const messagesForApi = [...chatMessages, newUserMessage].map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Determine platform for AI context (only Twitter/X supported)
      const platformForAI = 'twitter';

      const response = await fetch('/api/send-to-ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messagesForApi,
          previous_posts: useAccountTone ? previousPosts : [],
          use_account_tone: useAccountTone && canUseAccountTone,
          platform: platformForAI
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Add AI response to chat
        const aiMessage: ChatMessage = { role: 'assistant', content: data.message };
        setChatMessages(prev => [...prev, aiMessage]);
        
        // If AI suggested content, show it
        if (data.suggested_content) {
          setSuggestedContent(data.suggested_content);
        }
      } else {
        const errorMessage: ChatMessage = { 
          role: 'assistant', 
          content: `Error: ${data.error || 'Failed to get AI response. Please try again.'}` 
        };
        setChatMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error in chat:', error);
      const errorMessage: ChatMessage = { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleUseSuggestedContent = () => {
    if (suggestedContent) {
      setContent(suggestedContent);
      setSuggestedContent(null);
      setMessage('✅ Content applied! You can edit it further or post it.');
    }
  };

  const handlePostToSocial = async () => {
    if (!content.trim()) {
      setMessage('Please generate or enter content first');
      return;
    }

    if (postMode === 'now') {
      // Original immediate posting logic (only X/Twitter supported)
      setIsPosting(true);
      setMessage('');

      try {
        const formData = new FormData();
        formData.append('content', content);
        formData.append('platform', platform);
        
        // Append all media files
        mediaFiles.forEach((file, index) => {
          formData.append(`media${index}`, file);
        });

        const endpoint = '/api/post-to-x';
        
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData
        });

        const data = await response.json();

        if (response.ok) {
          if (data.demo) {
            setMessage(`✅ ${data.message} (Demo Mode)`);
          } else {
            setMessage(`✅ Successfully posted to ${platform}!`);
          }
          // Clear all form fields and chat history after successful post
          setContent('');
          setChatMessages([]);
          setChatInput('');
          setSuggestedContent(null);
          setTopic('');
          setMediaFiles([]);
          setMediaPreviews([]);
        } else {
          setMessage(data.message || data.error || `Failed to post to ${platform}. Please try again.`);
        }
      } catch (error) {
        console.error(`Error posting to ${platform}:`, error);
        setMessage(`Failed to post to ${platform}. Please try again.`);
      } finally {
        setIsPosting(false);
      }
    } else {
      // Scheduling logic
      if (!scheduledTime) {
        setMessage('Please select a scheduled time');
        return;
      }

      const scheduledDate = new Date(scheduledTime);
      const now = new Date();
      const minTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now

      if (scheduledDate <= minTime) {
        setMessage('Scheduled time must be at least 5 minutes in the future');
        return;
      }

      setIsPosting(true);
      setMessage('');

      try {
        // Use Next.js API route (proxy to Java backend)
        // The API route will handle image upload if present
        const formData = new FormData();
        formData.append('content', content);
        formData.append('platforms', JSON.stringify(selectedPlatforms.map(p => p === 'X (Twitter)' ? 'twitter' : 'twitter')));
        formData.append('scheduledTime', scheduledTime);
        
        // Append all media files
        mediaFiles.forEach((file, index) => {
          formData.append(`media${index}`, file);
        });

        const response = await fetch('/api/schedule/create', {
          method: 'POST',
          credentials: 'include', // Include cookies (auth-token)
          body: formData
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setMessage(`✅ Post scheduled for ${scheduledDate.toLocaleString()}!`);
          // Clear all form fields and chat history after successful schedule
          setContent('');
          setChatMessages([]);
          setChatInput('');
          setSuggestedContent(null);
          setTopic('');
          setScheduledTime('');
          setSelectedPlatforms(['X (Twitter)']); // Reset to default
          setMediaFiles([]);
          setMediaPreviews([]);
        } else {
          setMessage(data.error || data.message || 'Failed to schedule post. Please try again.');
        }
      } catch (error) {
        console.error('Error scheduling post:', error);
        setMessage('Failed to schedule post. Please try again.');
      } finally {
        setIsPosting(false);
      }
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-black mb-3">
            📝 Content Creation
          </h1>
          <p className="text-lg text-gray-600">
            Create and publish engaging social media content
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mt-4 rounded-full"></div>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-xl shadow-lg p-2 border border-gray-200 inline-flex">
            <button
              onClick={() => setCreationMode('manual')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                creationMode === 'manual'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              ✏️ Manual
            </button>
            <button
              onClick={() => setCreationMode('ai')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                creationMode === 'ai'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              🤖 AI Chat
            </button>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Content Creation */}
          <div>
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
              <h2 className="text-2xl font-bold text-black mb-6">
                {creationMode === 'manual' ? '📝 Create Content' : '🤖 AI Assistant'}
              </h2>
          
              {creationMode === 'manual' ? (
                <>
                  {/* Manual Mode UI */}
              {/* Topic Input */}
              <div className="mb-6">
                <label htmlFor="topic" className="block text-lg font-semibold text-black mb-3">
                  What&apos;s your topic?
                </label>
                <input
                  type="text"
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., artificial intelligence, climate change, productivity tips..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-black transition-all duration-200"
                />
              </div>

              {/* Tone Dropdown */}
              <div className="mb-6">
                <label htmlFor="tone" className="block text-lg font-semibold text-black mb-3">
                  Choose your tone
                </label>
                <select
                  id="tone"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-black transition-all duration-200"
                >
                  {TONE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              {/* Post Mode Selection */}
              <div className="mb-6">
                <label className="block text-lg font-semibold text-black mb-3">
                  When to post?
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="postMode"
                      value="now"
                      checked={postMode === 'now'}
                      onChange={(e) => setPostMode(e.target.value as 'now' | 'schedule')}
                      className="mr-2"
                    />
                    <span className="text-black">Post Now</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="postMode"
                      value="schedule"
                      checked={postMode === 'schedule'}
                      onChange={(e) => setPostMode(e.target.value as 'now' | 'schedule')}
                      className="mr-2"
                    />
                    <span className="text-black">Schedule for Later</span>
                  </label>
                </div>
              </div>

              {/* Platform Selection */}
              {postMode === 'now' ? (
                <div className="mb-6">
                  <label htmlFor="platform" className="block text-lg font-semibold text-black mb-3">
                    Choose platform
                  </label>
                  <select
                    id="platform"
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-black transition-all duration-200"
                  >
                    {PLATFORM_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="mb-6">
                  <label className="block text-lg font-semibold text-black mb-3">
                    Choose platforms
                  </label>
                  <div className="space-y-2">
                    {PLATFORM_OPTIONS.map((option) => (
                      <label key={option} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedPlatforms.includes(option)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPlatforms([...selectedPlatforms, option]);
                            } else {
                              setSelectedPlatforms(selectedPlatforms.filter(p => p !== option));
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-black">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Scheduled Time Picker */}
              {postMode === 'schedule' && (
                <div className="mb-6">
                  <label htmlFor="scheduledTime" className="block text-lg font-semibold text-black mb-3">
                    Schedule for
                  </label>
                  <input
                    type="datetime-local"
                    id="scheduledTime"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    min={new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-black transition-all duration-200"
                  />
                  <p className="text-sm text-gray-600 mt-2">
                    ⏰ Minimum 5 minutes from now
                  </p>
                </div>
              )}

              {/* Generate Button */}
              <div className="mb-6">
                <button
                  onClick={handleGenerateContent}
                  disabled={isGenerating}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200"
                >
                  {isGenerating ? '🤖 Generating...' : '✨ Generate with AI'}
                </button>
              </div>

              {/* Content Textarea */}
              <div className="mb-6">
                <label htmlFor="content" className="block text-lg font-semibold text-black mb-3">
                  Your content (editable)
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="AI-generated content will appear here, or you can type your own..."
                  rows={6}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-black transition-all duration-200 resize-none"
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-600">
                    💡 Keep under 280 characters for Twitter
                  </span>
                  <span className={`text-sm font-medium ${
                    content.length > (platform === 'X (Twitter)' ? 280 : 2200) 
                      ? 'text-red-500' 
                      : content.length > (platform === 'X (Twitter)' ? 250 : 2000) 
                        ? 'text-yellow-500' 
                        : 'text-gray-600'
                  }`}>
                    {content.length}/{platform === 'X (Twitter)' ? '280' : '2200'}
                  </span>
                </div>
              </div>

              {/* Media Upload (Images & Videos) */}
              <div className="mb-6">
                <label className="block text-lg font-semibold text-black mb-3">
                  📸🎥 Upload Media (Optional) - Up to 4 items
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*,video/*"
                  multiple
                  onChange={handleMediaUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current?.click();
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm text-black transition-all duration-200 hover:border-blue-400 hover:shadow-md text-center cursor-pointer bg-white"
                >
                  📸🎥 Click to upload media
                </button>
                <p className="text-sm text-gray-600 mt-2">
                  Supported: Images (max 5MB), Videos (max 512MB). Twitter/X allows up to 4 media items per tweet.
                </p>
                
                {/* Media Previews */}
                {mediaPreviews.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    {mediaPreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        {preview.type === 'image' ? (
                          <img
                            src={preview.url}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-48 object-cover rounded-lg border border-gray-300"
                          />
                        ) : (
                          <video
                            src={preview.url}
                            controls
                            className="w-full h-48 object-cover rounded-lg border border-gray-300"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => removeMedia(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                          aria-label="Remove media"
                        >
                          ×
                        </button>
                        <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                          {preview.type === 'video' ? '🎥 Video' : '📸 Image'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Post Button */}
              <div className="mb-6">
                <button
                  onClick={handlePostToSocial}
                  disabled={isPosting || !content.trim()}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-6 rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200"
                >
                  {isPosting 
                    ? (postMode === 'now' ? `📤 Posting to ${platform}...` : '📅 Scheduling...') 
                    : (postMode === 'now' 
                        ? `📱 Post to ${platform}` 
                        : `📅 Schedule Post${selectedPlatforms.length > 1 ? 's' : ''}`
                      )
                  }
                </button>
              </div>

              {/* Message Display */}
              {message && (
                <div className={`p-4 rounded-lg border-2 shadow-lg ${
                  message.includes('Success') || message.includes('generated successfully')
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border-green-200'
                    : 'bg-gradient-to-r from-red-50 to-pink-50 text-red-800 border-red-200'
                }`}>
                  <div className="flex items-center">
                    <span className="text-xl mr-2">
                      {message.includes('Success') || message.includes('generated successfully') ? '✅' : '❌'}
                    </span>
                    <span className="font-medium">{message}</span>
                  </div>
                </div>
              )}
                </>
              ) : (
                <>
                  {/* AI Chat Mode UI */}
                  {/* Account Tone Toggle */}
                  <div className="mb-6">
                    <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div>
                        <span className="block text-sm font-semibold text-black">Match Account Tone</span>
                        <span className="block text-xs text-gray-600 mt-1">
                          {canUseAccountTone 
                            ? 'AI will analyze your previous posts and match your writing style'
                            : 'No previous posts found. Post some content first to enable this feature.'
                          }
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={useAccountTone}
                        onChange={(e) => setUseAccountTone(e.target.checked)}
                        disabled={!canUseAccountTone}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </label>
                  </div>

                  {/* Chat Messages */}
                  <div className="mb-6">
                    <div className="h-96 overflow-y-auto border-2 border-gray-200 rounded-lg p-4 bg-gray-50 space-y-4">
                      {chatMessages.length === 0 ? (
                        <div className="text-center text-gray-500 mt-8">
                          <p className="text-lg mb-2">👋 Hi! I&apos;m your AI content assistant.</p>
                          <p className="text-sm">Tell me what kind of post you&apos;d like to create, and I&apos;ll help you write it!</p>
                        </div>
                      ) : (
                        chatMessages.map((msg, idx) => (
                          <div
                            key={idx}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-lg p-3 ${
                                msg.role === 'user'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white text-black border border-gray-300'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                            </div>
                          </div>
                        ))
                      )}
                      {isChatting && (
                        <div className="flex justify-start">
                          <div className="bg-white text-black border border-gray-300 rounded-lg p-3">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Suggested Content (if available) */}
                  {suggestedContent && (
                    <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-sm font-semibold text-blue-900">✨ Suggested Post:</span>
                        <button
                          onClick={handleUseSuggestedContent}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Use This
                        </button>
                      </div>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{suggestedContent}</p>
                    </div>
                  )}

                  {/* Chat Input */}
                  <form onSubmit={handleChatSubmit} className="mb-6">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Type your message..."
                        disabled={isChatting}
                        className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-black transition-all duration-200 disabled:opacity-50"
                      />
                      <button
                        type="submit"
                        disabled={!chatInput.trim() || isChatting}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200"
                      >
                        {isChatting ? '...' : 'Send'}
                      </button>
                    </div>
                  </form>

                  {/* Post Mode, Platform Selection, Scheduling, Image Upload, Content Textarea, Post Button, Message Display */}
                  {/* (These are shared between manual and AI modes) */}
                  {/* Post Mode Selection */}
                  <div className="mb-6">
                    <label className="block text-lg font-semibold text-black mb-3">
                      When to post?
                    </label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="postMode"
                          value="now"
                          checked={postMode === 'now'}
                          onChange={(e) => setPostMode(e.target.value as 'now' | 'schedule')}
                          className="mr-2"
                        />
                        <span className="text-black">Post Now</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="postMode"
                          value="schedule"
                          checked={postMode === 'schedule'}
                          onChange={(e) => setPostMode(e.target.value as 'now' | 'schedule')}
                          className="mr-2"
                        />
                        <span className="text-black">Schedule for Later</span>
                      </label>
                    </div>
                  </div>

                  {/* Platform Selection */}
                  {postMode === 'now' ? (
                    <div className="mb-6">
                      <label htmlFor="platform" className="block text-lg font-semibold text-black mb-3">
                        Choose platform
                      </label>
                      <select
                        id="platform"
                        value={platform}
                        onChange={(e) => setPlatform(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-black transition-all duration-200"
                      >
                        {PLATFORM_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="mb-6">
                      <label className="block text-lg font-semibold text-black mb-3">
                        Choose platforms
                      </label>
                      <div className="space-y-2">
                        {PLATFORM_OPTIONS.map((option) => (
                          <label key={option} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedPlatforms.includes(option)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPlatforms([...selectedPlatforms, option]);
                                } else {
                                  setSelectedPlatforms(selectedPlatforms.filter(p => p !== option));
                                }
                              }}
                              className="mr-2"
                            />
                            <span className="text-black">{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Scheduled Time Picker */}
                  {postMode === 'schedule' && (
                    <div className="mb-6">
                      <label htmlFor="scheduledTime" className="block text-lg font-semibold text-black mb-3">
                        Schedule for
                      </label>
                      <input
                        type="datetime-local"
                        id="scheduledTime"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        min={new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-black transition-all duration-200"
                      />
                      <p className="text-sm text-gray-600 mt-2">
                        ⏰ Minimum 5 minutes from now
                      </p>
                    </div>
                  )}

                  {/* Content Textarea */}
                  <div className="mb-6">
                    <label htmlFor="content" className="block text-lg font-semibold text-black mb-3">
                      Your content (editable)
                    </label>
                    <textarea
                      id="content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Content will appear here after you chat with AI or type your own..."
                      rows={6}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-black transition-all duration-200 resize-none"
                    />
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm text-gray-600">
                        💡 Keep under 280 characters for Twitter
                      </span>
                      <span className={`text-sm font-medium ${
                        content.length > (platform === 'X (Twitter)' ? 280 : 2200) 
                          ? 'text-red-500' 
                          : content.length > (platform === 'X (Twitter)' ? 250 : 2000) 
                            ? 'text-yellow-500' 
                            : 'text-gray-600'
                      }`}>
                        {content.length}/{platform === 'X (Twitter)' ? '280' : '2200'}
                      </span>
                    </div>
                  </div>

                  {/* Media Upload (Images & Videos) */}
                  <div className="mb-6">
                    <label className="block text-lg font-semibold text-black mb-3">
                      📸🎥 Upload Media (Optional) - Up to 4 items
                    </label>
                    <input
                      type="file"
                      ref={fileInputAiRef}
                      accept="image/*,video/*"
                      multiple
                      onChange={handleMediaUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        fileInputAiRef.current?.click();
                      }}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm text-black transition-all duration-200 hover:border-blue-400 hover:shadow-md text-center cursor-pointer bg-white"
                    >
                      📸🎥 Click to upload media
                    </button>
                    <p className="text-sm text-gray-600 mt-2">
                      Supported: Images (max 5MB), Videos (max 512MB). Twitter/X allows up to 4 media items per tweet.
                    </p>
                    
                    {/* Media Previews */}
                    {mediaPreviews.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        {mediaPreviews.map((preview, index) => (
                          <div key={index} className="relative">
                            {preview.type === 'image' ? (
                              <img
                                src={preview.url}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-48 object-cover rounded-lg border border-gray-300"
                              />
                            ) : (
                              <video
                                src={preview.url}
                                controls
                                className="w-full h-48 object-cover rounded-lg border border-gray-300"
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => removeMedia(index)}
                              className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                              aria-label="Remove media"
                            >
                              ×
                            </button>
                            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                              {preview.type === 'video' ? '🎥 Video' : '📸 Image'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Post Button */}
                  <div className="mb-6">
                    <button
                      onClick={handlePostToSocial}
                      disabled={isPosting || !content.trim()}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-6 rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200"
                    >
                      {isPosting 
                        ? (postMode === 'now' ? `📤 Posting to ${platform}...` : '📅 Scheduling...') 
                        : (postMode === 'now' 
                            ? `📱 Post to ${platform}` 
                            : `📅 Schedule Post${selectedPlatforms.length > 1 ? 's' : ''}`
                          )
                      }
                    </button>
                  </div>

                  {/* Message Display */}
                  {message && (
                    <div className={`p-4 rounded-lg border-2 shadow-lg ${
                      message.includes('Success') || message.includes('generated successfully') || message.includes('applied')
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border-green-200'
                        : 'bg-gradient-to-r from-red-50 to-pink-50 text-red-800 border-red-200'
                    }`}>
                      <div className="flex items-center">
                        <span className="text-xl mr-2">
                          {message.includes('Success') || message.includes('generated successfully') || message.includes('applied') ? '✅' : '❌'}
                        </span>
                        <span className="font-medium">{message}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right Column - Preview */}
          <div>
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200 sticky top-8">
              <h2 className="text-xl font-bold text-black mb-4">
                🐦 X Preview
              </h2>
              
              {/* Social Media Post Preview */}
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                    {/* Twitter Header */}
                    <div className="flex items-start p-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg mr-3 flex-shrink-0">
                        SB
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center mb-1">
                          <span className="text-black font-bold text-base">SocialBee</span>
                          <span className="text-gray-500 text-sm ml-2">@socialbee</span>
                          <span className="text-gray-500 text-sm mx-1">·</span>
                          <span className="text-gray-500 text-sm">now</span>
                        </div>
                      </div>
                      <div className="ml-auto">
                        <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                        </svg>
                      </div>
                    </div>

                    {/* Twitter Post Content */}
                    <div className="px-4 pb-3">
                      <div className="text-black text-base leading-6 mb-3">
                        {content ? (
                          <div className="whitespace-pre-wrap break-words">{content}</div>
                        ) : (
                          <div className="text-gray-400 italic">Your post will appear here...</div>
                        )}
                      </div>
                  
                  {/* Twitter Media Preview */}
                  {mediaPreviews.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {mediaPreviews.map((preview, index) => (
                        <div key={index} className="rounded-2xl overflow-hidden border border-gray-200">
                          {preview.type === 'image' ? (
                            <img
                              src={preview.url}
                              alt={`Tweet media ${index + 1}`}
                              className="w-full h-auto object-cover"
                            />
                          ) : (
                            <video
                              src={preview.url}
                              controls
                              className="w-full h-auto object-cover"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                    </div>

                    {/* Twitter Post Actions */}
                    <div className="flex items-center justify-between text-gray-500 text-sm pt-3 border-t border-gray-100 px-4">
                      <div className="flex items-center hover:text-blue-500 cursor-pointer transition-colors group">
                        <div className="p-2 rounded-full group-hover:bg-blue-50 transition-colors">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01z"/>
                          </svg>
                        </div>
                        <span className="ml-1">0</span>
                      </div>
                      <div className="flex items-center hover:text-green-500 cursor-pointer transition-colors group">
                        <div className="p-2 rounded-full group-hover:bg-green-50 transition-colors">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 6.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.791-4-4V6.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.791 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"/>
                          </svg>
                        </div>
                        <span className="ml-1">0</span>
                      </div>
                      <div className="flex items-center hover:text-red-500 cursor-pointer transition-colors group">
                        <div className="p-2 rounded-full group-hover:bg-red-50 transition-colors">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82.74 1.36 1.78 2.44 3.08 3.19l1.05.6 1.05-.6c1.3-.75 2.34-1.83 3.08-3.19 1.112-2.04 1.031-3.7.479-4.82-.561-1.13-1.667-1.84-2.91-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z"/>
                          </svg>
                        </div>
                        <span className="ml-1">0</span>
                      </div>
                      <div className="flex items-center hover:text-blue-500 cursor-pointer transition-colors group">
                        <div className="p-2 rounded-full group-hover:bg-blue-50 transition-colors">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z"/>
                          </svg>
                        </div>
                        <span className="ml-1">0</span>
                      </div>
                    </div>

                    {/* Twitter Footer */}
                    <div className="px-4 pb-4">
                      <div className="text-gray-500 text-sm">
                        {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · X for Web
                      </div>
                    </div>
              </div>

              {/* Character Count */}
              {content && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Character count:</span>
                    <span className={`font-medium ${
                      content.length > 280 
                        ? 'text-red-500' 
                        : content.length > 250 
                          ? 'text-yellow-500' 
                          : 'text-green-600'
                    }`}>
                      {content.length}/280
                    </span>
                  </div>
                  {content.length > 280 && (
                    <p className="text-red-500 text-sm mt-1">
                      ⚠️ Exceeds Twitter character limit
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
