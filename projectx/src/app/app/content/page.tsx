'use client';

import { useState } from 'react';

const TONE_OPTIONS = [
  'Neutral',
  'Friendly', 
  'Professional',
  'Funny',
  'Motivational'
];

const PLATFORM_OPTIONS = [
  'X (Twitter)',
  'Instagram'
];

export default function ContentCreation() {
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('Neutral');
  const [platform, setPlatform] = useState('X (Twitter)');
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [message, setMessage] = useState('');

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
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

  const handlePostToSocial = async () => {
    if (!content.trim()) {
      setMessage('Please generate or enter content first');
      return;
    }

    if (platform === 'Instagram' && !image) {
      setMessage('Instagram requires an image to be posted. Please upload an image first.');
      return;
    }

    setIsPosting(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('content', content);
      formData.append('platform', platform);
      
      if (image) {
        formData.append('image', image);
      }

      const endpoint = platform === 'X (Twitter)' ? '/api/post-to-x' : '/api/post-to-instagram';
      
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
      } else {
        setMessage(data.message || data.error || `Failed to post to ${platform}. Please try again.`);
      }
    } catch (error) {
      console.error(`Error posting to ${platform}:`, error);
      setMessage(`Failed to post to ${platform}. Please try again.`);
    } finally {
      setIsPosting(false);
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

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Content Creation */}
          <div>
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
              <h2 className="text-2xl font-bold text-black mb-6">📝 Create Content</h2>
          
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

              {/* Platform Dropdown */}
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
                    💡 Keep under {platform === 'X (Twitter)' ? '280' : '2200'} characters for {platform === 'X (Twitter)' ? 'Twitter' : 'Instagram'}
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

              {/* Image Upload */}
              <div className="mb-6">
                <label htmlFor="image" className="block text-lg font-semibold text-black mb-3">
                  📸 Upload Image {platform === 'Instagram' ? '(Required)' : '(Optional)'}
                </label>
                <input
                  type="file"
                  id="image"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-black transition-all duration-200"
                />
                {platform === 'Instagram' && (
                  <p className="text-sm text-orange-600 mt-2">
                    ⚠️ Instagram requires an image to be posted
                  </p>
                )}
                {imagePreview && (
                  <div className="mt-4">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full max-w-md h-48 object-cover rounded-lg border border-gray-300"
                    />
                    <p className="text-sm text-gray-600 mt-2">Image preview</p>
                  </div>
                )}
              </div>

              {/* Post Button */}
              <div className="mb-6">
                <button
                  onClick={handlePostToSocial}
                  disabled={isPosting || !content.trim() || (platform === 'Instagram' && !image)}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-6 rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200"
                >
                  {isPosting ? `📤 Posting to ${platform}...` : `📱 Post to ${platform}`}
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
            </div>
          </div>

          {/* Right Column - Preview */}
          <div>
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200 sticky top-8">
              <h2 className="text-xl font-bold text-black mb-4">
                {platform === 'X (Twitter)' ? '🐦 X Preview' : '📸 Instagram Preview'}
              </h2>
              
              {/* Social Media Post Preview */}
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                {platform === 'X (Twitter)' ? (
                  <>
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
                  </>
                ) : (
                  <>
                    {/* Instagram Header */}
                    <div className="flex items-center p-4 border-b border-gray-100">
                      <div className="w-10 h-10 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3 flex-shrink-0">
                        SB
                      </div>
                      <div className="flex-1">
                        <span className="text-black font-semibold text-sm">socialbee</span>
                      </div>
                      <div className="ml-auto">
                        <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                        </svg>
                      </div>
                    </div>

                    {/* Instagram Image */}
                    {imagePreview ? (
                      <div className="aspect-square bg-gray-100 flex items-center justify-center">
                        <img
                          src={imagePreview}
                          alt="Instagram post"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-square bg-gray-100 flex items-center justify-center">
                        <div className="text-center text-gray-400">
                          <svg className="w-16 h-16 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                          </svg>
                          <p className="text-sm">Upload an image to see preview</p>
                        </div>
                      </div>
                    )}

                    {/* Instagram Actions */}
                    <div className="flex items-center justify-between text-gray-500 text-sm p-4 border-b border-gray-100">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center hover:text-red-500 cursor-pointer transition-colors group">
                          <div className="p-1 rounded-full group-hover:bg-red-50 transition-colors">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82.74 1.36 1.78 2.44 3.08 3.19l1.05.6 1.05-.6c1.3-.75 2.34-1.83 3.08-3.19 1.112-2.04 1.031-3.7.479-4.82-.561-1.13-1.667-1.84-2.91-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z"/>
                            </svg>
                          </div>
                        </div>
                        <div className="flex items-center hover:text-blue-500 cursor-pointer transition-colors group">
                          <div className="p-1 rounded-full group-hover:bg-blue-50 transition-colors">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01z"/>
                            </svg>
                          </div>
                        </div>
                        <div className="flex items-center hover:text-blue-500 cursor-pointer transition-colors group">
                          <div className="p-1 rounded-full group-hover:bg-blue-50 transition-colors">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z"/>
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center hover:text-gray-700 cursor-pointer transition-colors group">
                        <div className="p-1 rounded-full group-hover:bg-gray-50 transition-colors">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Instagram Caption */}
                    <div className="p-4">
                      <div className="text-black text-sm leading-5 mb-3">
                        {content ? (
                          <div className="whitespace-pre-wrap break-words">{content}</div>
                        ) : (
                          <div className="text-gray-400 italic">Your caption will appear here...</div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Character Count */}
              {content && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Character count:</span>
                    <span className={`font-medium ${
                      content.length > (platform === 'X (Twitter)' ? 280 : 2200) 
                        ? 'text-red-500' 
                        : content.length > (platform === 'X (Twitter)' ? 250 : 2000) 
                          ? 'text-yellow-500' 
                          : 'text-green-600'
                    }`}>
                      {content.length}/{platform === 'X (Twitter)' ? '280' : '2200'}
                    </span>
                  </div>
                  {content.length > (platform === 'X (Twitter)' ? 280 : 2200) && (
                    <p className="text-red-500 text-sm mt-1">
                      ⚠️ Exceeds {platform === 'X (Twitter)' ? 'Twitter' : 'Instagram'} character limit
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
