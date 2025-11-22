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

      // Handle Google OAuth success
      if (auth === 'success') {
        setMessage('✅ Google authentication successful! Welcome to ProjectX.');
      }

      // Handle social media platform connections
      if (success === 'twitter_connected') {
        setMessage('✅ Twitter account connected successfully!');
        setRefreshKey(prev => prev + 1); // Trigger profile refresh
      } else if (error === 'twitter_denied') {
        setMessage('❌ Twitter authorization was denied');
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

  const handleContinueToApp = () => {
    router.push('/app');
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      // Redirect to login page after logout
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      // Even on error, try to redirect
      window.location.href = '/';
    }
  };

  const isTwitterConnected = connectedPlatforms.includes('x') || connectedPlatforms.includes('twitter');
  const canContinue = isTwitterConnected;

  console.log('🔍 Button state:', { 
    connectedPlatforms, 
    isTwitterConnected, 
    canContinue, 
    isLoading 
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header with Logout */}
        <div className="flex justify-between items-start mb-12">
          <div className="flex-1 text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              🎉 Welcome! Let's Connect Your Social Media
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Connect your social media accounts to start creating and scheduling amazing content.
            </p>
          </div>
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="ml-4 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200 hover:border-red-300 whitespace-nowrap"
          >
            <span className="mr-2">🚪</span>
            Logout
          </button>
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
