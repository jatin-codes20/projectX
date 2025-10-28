'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getProfiles, ProfileData } from '@/lib/profileApi';

console.log('🔍 Imports loaded:', { getProfiles: typeof getProfiles });

export default function ConnectPage() {
  console.log('🚀 ConnectPage component rendered');
  
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const router = useRouter();

  useEffect(() => {
    console.log('🔄 useEffect START');
    try {
      // Check URL for OAuth callback messages
      const urlParams = new URLSearchParams(window.location.search);
      const success = urlParams.get('success');
      const error = urlParams.get('error');
      const auth = urlParams.get('auth');

      console.log('🔄 URL params:', { success, error, auth });

      // Handle Google OAuth success
      if (auth === 'success') {
        setMessage('✅ Google authentication successful! Welcome to ProjectX.');
      }

      // Handle social media platform connections
      if (success === 'twitter_connected') {
        setMessage('✅ Twitter account connected successfully!');
        setRefreshKey(prev => prev + 1); // Trigger profile refresh
      } else if (success === 'instagram_connected') {
        setMessage('✅ Instagram account connected successfully!');
        setRefreshKey(prev => prev + 1); // Trigger profile refresh
      } else if (error === 'twitter_denied') {
        setMessage('❌ Twitter authorization was denied');
      } else if (error === 'instagram_denied') {
        setMessage('❌ Instagram authorization was denied');
      } else if (error) {
        setMessage(`❌ Connection failed: ${error}`);
      }

      // Fetch profiles from database
      const fetchProfiles = async () => {
        console.log('🔄 fetchProfiles function called');
        try {
          const result = await getProfiles();
          console.log('🔍 getProfiles result:', JSON.stringify(result, null, 2));
          if (result.success && result.data) {
            const profileList = result.data.profiles;
            console.log('🔍 Profile list:', profileList);
            setProfiles(profileList);
            
            // Extract platform names for backward compatibility
            const platforms = profileList.map(profile => profile.platform);
            console.log('🔍 Platforms:', platforms);
            setConnectedPlatforms(platforms);
          } else {
            // Only log as error if it's NOT the expected "Not authenticated" state
            if (result.error !== 'Not authenticated') {
              console.error('Failed to fetch profiles:', result.error);
            }
            // No profile in database, show disconnect state
            setConnectedPlatforms([]);
          }
        } catch (error) {
          console.error('Error fetching profiles:', error);
          // No profile in database, show disconnect state
          setConnectedPlatforms([]);
        } finally {
          setIsLoading(false);
        }
      };

      fetchProfiles();
      console.log('🔄 fetchProfiles() called');

      // Clear URL parameters after a short delay
      if (success || error || auth) {
        setTimeout(() => {
          window.history.replaceState({}, document.title, window.location.pathname);
        }, 100);
      }
    } catch (error) {
      console.error('❌ Error in useEffect:', error);
    }
  }, []);

  // Refresh profiles when refreshKey changes (after OAuth callback)
  useEffect(() => {
    console.log('🔄 Second useEffect triggered, refreshKey:', refreshKey);
    if (refreshKey > 0) {
      const refreshProfiles = async () => {
        console.log('🔄 Refreshing profiles due to refreshKey change...');
        const result = await getProfiles();
        console.log('🔄 Refresh result:', JSON.stringify(result, null, 2));
        if (result.success && result.data) {
          const profileList = result.data.profiles;
          console.log('🔄 Refresh profile list:', profileList);
          setProfiles(profileList);
          const platforms = profileList.map(profile => profile.platform);
          console.log('🔄 Refresh platforms:', platforms);
          setConnectedPlatforms(platforms);
        }
      };
      refreshProfiles();
    }
  }, [refreshKey]);

  const handleConnectTwitter = () => {
    window.location.href = '/api/auth/twitter/connect';
  };

  const handleConnectInstagram = () => {
    window.location.href = '/api/auth/instagram/connect';
  };

  const handleContinueToApp = () => {
    router.push('/app');
  };

  const isTwitterConnected = connectedPlatforms.includes('x') || connectedPlatforms.includes('twitter');
  const isInstagramConnected = connectedPlatforms.includes('instagram');
  const canContinue = isTwitterConnected || isInstagramConnected;

  console.log('🔍 Button state:', { 
    connectedPlatforms, 
    isTwitterConnected, 
    isInstagramConnected, 
    canContinue, 
    isLoading 
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎉 Welcome! Let's Connect Your Social Media
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Connect your social media accounts to start creating and scheduling amazing content.
          </p>
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

        {/* Connection Section */}
        <div className="bg-white rounded-3xl shadow-2xl p-12 border border-gray-100">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
            Connect Your Social Media Accounts
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Twitter Connection */}
            <div className={`border-2 rounded-2xl p-8 transition-all duration-300 ${
              isTwitterConnected 
                ? 'border-green-200 bg-green-50' 
                : 'border-gray-200 hover:border-blue-300 hover:shadow-lg'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mr-4">
                    <span className="text-white font-bold text-xl">𝕏</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">X (Twitter)</h3>
                    <p className="text-gray-600">
                      {isTwitterConnected 
                        ? `Connected as @${profiles.find(p => p.platform === 'x')?.username || 'Unknown'}`
                        : 'Connect your Twitter account'
                      }
                    </p>
                  </div>
                </div>
                {isTwitterConnected && (
                  <div className="flex items-center text-green-600">
                    <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Connected</span>
                  </div>
                )}
              </div>

              {!isTwitterConnected && (
                <button
                  onClick={handleConnectTwitter}
                  className="w-full bg-black text-white py-3 px-6 rounded-xl font-semibold hover:bg-gray-800 transition-colors"
                >
                  Connect X (Twitter)
                </button>
              )}
            </div>

            {/* Instagram Connection */}
            <div className={`border-2 rounded-2xl p-8 transition-all duration-300 ${
              isInstagramConnected 
                ? 'border-green-200 bg-green-50' 
                : 'border-gray-200 hover:border-pink-300 hover:shadow-lg'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Instagram</h3>
                    <p className="text-gray-600">
                      {isInstagramConnected 
                        ? `Connected as @${profiles.find(p => p.platform === 'instagram')?.username || 'Unknown'}`
                        : 'Connect your Instagram account'
                      }
                    </p>
                  </div>
                </div>
                {isInstagramConnected && (
                  <div className="flex items-center text-green-600">
                    <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Connected</span>
                  </div>
                )}
              </div>

              {!isInstagramConnected && (
                <button
                  onClick={handleConnectInstagram}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-6 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all"
                >
                  Connect Instagram
                </button>
              )}
            </div>
          </div>

          {/* Continue Button */}
          <div className="text-center">
            {isLoading ? (
              <div className="inline-flex items-center px-8 py-4 bg-gray-100 text-gray-500 rounded-xl">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Checking connections...
              </div>
            ) : canContinue ? (
              <button
                onClick={handleContinueToApp}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-12 py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
              >
                Continue to App →
              </button>
            ) : (
              <div className="text-gray-500">
                <p className="mb-2">Connect at least one platform to continue</p>
                <div className="flex justify-center space-x-4 text-sm">
                  <span className="flex items-center">
                    <div className="w-2 h-2 bg-gray-300 rounded-full mr-2"></div>
                    X (Twitter)
                  </span>
                  <span className="flex items-center">
                    <div className="w-2 h-2 bg-gray-300 rounded-full mr-2"></div>
                    Instagram
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500">
          <p>Secure OAuth authentication • Your data stays private • No passwords stored</p>
        </div>
      </div>
    </div>
  );
}
