"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import ScorecardDisplay from './ScorecardDisplay';

export default function UserScorecards() {
  const { data: session } = useSession();
  const [scorecards, setScorecards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    async function fetchUserScorecards() {
      if (!session?.user?.id) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Request including both public and private scorecards
        const response = await fetch(`/api/users/${session.user.id}/scorecards`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch scorecards');
        }
        
        const data = await response.json();
        setScorecards(data.scorecards);
      } catch (error) {
        console.error('Error fetching scorecards:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchUserScorecards();
  }, [session]);
  
  if (isLoading) {
    return <p className="text-gray-600 text-center py-8">Loading scorecards...</p>;
  }
  
  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg text-red-600 my-4">
        <p>Error: {error}</p>
      </div>
    );
  }
  
  if (scorecards.length === 0) {
    return (
      <div className="bg-gray-50 p-8 rounded-lg text-center">
        <p className="text-gray-600 mb-4">You haven't created any scorecards yet.</p>
        <a href="/fights" className="bg-primary text-white px-4 py-2 rounded-md hover:bg-opacity-90 transition-colors">
          Score a Fight
        </a>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {scorecards.map(scorecard => (
        <ScorecardDisplay 
          key={scorecard.id} 
          scorecard={scorecard} 
          showFightDetails={true} 
          showActions={true}
        />
      ))}
    </div>
  );
}