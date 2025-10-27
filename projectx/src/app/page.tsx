'use client';

import { useState, useEffect } from 'react';

export default function LandingPage() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Check URL for Google authentication results from Java service
    const urlParams = new URLSearchParams(window.location.search);
    const auth = urlParams.get('auth');
    
    if (auth === 'success') {
      setMessage('✅ Google authentication successful! You can now connect your social media accounts.');
    } else if (auth === 'error') {
      setMessage('❌ Google authentication failed. Please try again.');
    }

    // Clear URL parameters
    if (auth) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleGoogleAuth = () => {
    // Redirect to Java authentication service for Google OAuth
    window.location.href = 'http://localhost:8080/auth/oauth2/authorization/google';
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-gray-900 mb-6">
            🚀 Social Media
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {' '}Content Creator
            </span>
            </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Create engaging content with AI and post directly to your social media accounts. 
            Connect your platforms to get started.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">AI-Powered Content</h3>
            <p className="text-gray-600">
              Generate engaging posts using advanced AI that understands your brand voice and audience.
            </p>
          </div>
          
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
            <div className="text-4xl mb-4">📱</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Multi-Platform</h3>
            <p className="text-gray-600">
              Post to Instagram and X (Twitter) with optimized content for each platform's unique style.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Instant Publishing</h3>
            <p className="text-gray-600">
              Create, preview, and publish your content in seconds with our streamlined workflow.
            </p>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className="mb-8">
            <div className={`p-4 rounded-lg border-2 shadow-lg max-w-2xl mx-auto ${
              message.includes('✅')
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border-green-200'
                : 'bg-gradient-to-r from-red-50 to-pink-50 text-red-800 border-red-200'
            }`}>
              <div className="flex items-center justify-center">
                <span className="font-medium">{message}</span>
              </div>
            </div>
          </div>
        )}

        {/* Google Authentication Section */}
        <div className="bg-white rounded-3xl shadow-2xl p-12 border border-gray-100">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
            Get Started with Google
          </h2>
          <p className="text-center text-gray-600 mb-8 max-w-2xl mx-auto">
            Sign in with your Google account to access the social media content creator. 
            After authentication, you'll be able to connect your social media accounts.
          </p>
          <div className="text-center">
            <button
              onClick={handleGoogleAuth}
              className="bg-white border-2 border-gray-300 text-gray-700 py-4 px-8 rounded-xl font-semibold hover:border-gray-400 hover:shadow-lg transition-all flex items-center justify-center mx-auto"
            >
              <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-gray-500">
          <p>Secure OAuth authentication • Your data stays private • No passwords stored</p>
        </div>
      </div>
    </div>
  );
}