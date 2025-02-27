"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ProfileEditModal from '../components/ProfileEditModal';
import ActivityFeed from '../components/ActivityFeed';
import TabNavigation from '../components/TabNavigation';
import UserScorecards from '../components/UserScorecards';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [userData, setUserData] = useState({
    username: '',
    bio: '',
    location: '',
    avatar: ''
  });

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'fightscores', label: 'Fight Score History' },
    { id: 'posts', label: 'User Posts' },
    { id: 'network', label: 'Followers/Following' },
  ];

  // Fetch user data when session is available
  useEffect(() => {
    async function fetchUserData() {
      if (status === 'loading') return;
      
      if (!session) {
        router.push('/api/auth/signin');
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        if (!session.user.id) {
          throw new Error('User ID not found in session');
        }
        
        const response = await fetch(`/api/users/${session.user.id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }
        
        const user = await response.json();
        
        setUserData({
          username: user.username || '',
          bio: user.profile?.bio || '',
          location: user.profile?.location || '',
          avatar: user.avatarUrl || '/images/default-avatar.png',
        });
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchUserData();
  }, [session, status, router]);

  const handleEditProfile = async (updatedData) => {
    if (!session?.user?.id) {
      setError('You must be logged in to update your profile');
      return;
    }
    
    try {
      const response = await fetch(`/api/users/${session.user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: updatedData.username,
          bio: updatedData.bio,
          location: updatedData.location,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }
      
      const updatedUser = await response.json();
      
      setUserData({
        username: updatedUser.username || '',
        bio: updatedUser.profile?.bio || '',
        location: updatedUser.profile?.location || '',
        avatar: updatedUser.avatarUrl || '/images/default-avatar.png',
      });
      
      // Refresh the page to ensure session data is updated
      router.refresh();
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.message);
    }
    
    setIsEditModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p>Loading profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 p-4 rounded-lg text-red-700">
          <p>Error: {error}</p>
          <button 
            onClick={() => router.refresh()}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Main Profile Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-col md:flex-row items-center md:items-start">
          <div className="w-32 h-32 mb-4 md:mb-0 md:mr-6">
            <img 
              src={userData.avatar || '/images/default-avatar.png'} 
              alt={`${userData.username || 'User'}'s profile`} 
              className="rounded-full w-full h-full object-cover border-4 border-gray-200"
            />
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
              <h1 className="text-2xl font-bold mb-2 md:mb-0">
                {userData.username || 'New User'}
              </h1>
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="bg-primary hover:bg-opacity-90 text-white px-4 py-2 rounded-custom transition-colors"
              >
                Edit Profile
              </button>
            </div>
            
            {userData.location && (
              <p className="text-gray-600 mb-2">
                <span className="inline-block mr-2">📍</span>
                {userData.location}
              </p>
            )}
            
            <p className="text-gray-800">{userData.bio || 'No bio yet'}</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <TabNavigation 
        tabs={tabs} 
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {activeTab === 'overview' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Overview</h2>
            <ActivityFeed />
          </div>
        )}
        
        {activeTab === 'fightscores' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Fight Score History</h2>
            <div className="mt-4">
              <UserScorecards />
            </div>
          </div>
        )}
        
        {activeTab === 'posts' && (
          <div>
            <h2 className="text-xl font-bold mb-4">User Posts</h2>
            {/* User posts component would go here */}
            <p className="text-gray-600">Your posts will appear here.</p>
          </div>
        )}
        
        {activeTab === 'network' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Followers & Following</h2>
            {/* Followers/following component would go here */}
            <p className="text-gray-600">Your network information will appear here.</p>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      <ProfileEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        userData={userData}
        onSave={handleEditProfile}
      />
    </div>
  );
}
