"use client";

import { useState } from 'react';
import ProfileEditModal from '../components/ProfileEditModal';
import ActivityFeed from '../components/ActivityFeed';
import TabNavigation from '../components/TabNavigation';

export default function ProfilePage() {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Mock user data - replace with actual data from your auth system
  const [userData, setUserData] = useState({
    username: 'FightFan123',
    bio: 'Passionate about boxing and MMA. Been following the sport for over 10 years.',
    location: 'New York, NY',
    avatar: '/images/default-avatar.png',
  });

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'fightscores', label: 'Fight Score History' },
    { id: 'posts', label: 'User Posts' },
    { id: 'network', label: 'Followers/Following' },
  ];

  const handleEditProfile = (updatedData) => {
    setUserData({ ...userData, ...updatedData });
    setIsEditModalOpen(false);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Main Profile Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-col md:flex-row items-center md:items-start">
          <div className="w-32 h-32 mb-4 md:mb-0 md:mr-6">
            <img 
              src={userData.avatar} 
              alt={`${userData.username}'s profile`} 
              className="rounded-full w-full h-full object-cover border-4 border-gray-200"
            />
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
              <h1 className="text-2xl font-bold mb-2 md:mb-0">{userData.username}</h1>
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
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
            
            <p className="text-gray-800">{userData.bio}</p>
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
            {/* Fight scores component would go here */}
            <p className="text-gray-600">Your fight scoring history will appear here.</p>
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
