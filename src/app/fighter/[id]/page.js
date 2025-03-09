'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import TabNavigation from '../../components/TabNavigation';

export default function FighterPage() {
  const params = useParams();
  const fighterId = params.id;
  
  const [fighter, setFighter] = useState(null);
  const [fights, setFights] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('fights');

  // Track active requests to allow cancellation
  const abortControllerRef = useRef(null);
  
  useEffect(() => {
    async function fetchFighterData() {
      setIsLoading(true);
      setError(null);
      
      // Cancel any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Create new abort controller
      abortControllerRef.current = new AbortController();
      const { signal } = abortControllerRef.current;
      
      try {
        // Fetch fighter data and fights in parallel
        const [fighterRes, fightsRes] = await Promise.all([
          // Fetch fighter details
          fetch(`/api/fighters/${fighterId}`, { signal }),
          
          // Fetch all fights for this fighter
          fetch(`/api/fights?fighterId=${fighterId}`, { signal })
        ]);
        
        if (!fighterRes.ok) {
          throw new Error(`Failed to fetch fighter: ${fighterRes.status}`);
        }
        
        const fighterData = await fighterRes.json();
        setFighter(fighterData);
        
        // Set recent fights from the fighter data if available
        if (fighterData.recentFights && fighterData.recentFights.length > 0) {
          setFights(fighterData.recentFights);
        }
        
        // Otherwise use the dedicated fights response if it's successful
        if (fightsRes.ok) {
          const fightsData = await fightsRes.json();
          if (fightsData.fights && fightsData.fights.length > 0) {
            setFights(fightsData.fights);
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error fetching fighter data:', err);
          setError('Failed to load fighter data. Please try again later.');
        }
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
        }
      }
    }
    
    if (fighterId) {
      fetchFighterData();
    }
    
    // Cleanup function to abort any pending requests when unmounting or when fighterId changes
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fighterId]);

  // Parse fighter record into win/loss/draw counts
  const parseRecord = (record) => {
    if (!record) return { wins: 0, losses: 0, draws: 0 };
    
    const matches = record.match(/(\d+)-(\d+)-(\d+)/);
    if (matches && matches.length === 4) {
      return {
        wins: parseInt(matches[1], 10),
        losses: parseInt(matches[2], 10),
        draws: parseInt(matches[3], 10)
      };
    }
    
    return { wins: 0, losses: 0, draws: 0 };
  };
  
  const recordStats = fighter ? parseRecord(fighter.record) : { wins: 0, losses: 0, draws: 0 };

  // Tabs for navigation
  const tabs = [
    { id: 'fights', label: 'Fights', count: fights.length },
    { id: 'scorecards', label: 'Scorecards', count: 0 },
    { id: 'stats', label: 'Stats', count: 0 },
  ];

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 rounded-full border-t-transparent"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p>{error}</p>
          <Link href="/fighters" className="text-blue-500 hover:underline mt-2 inline-block">
            View all fighters
          </Link>
        </div>
      </div>
    );
  }

  if (!fighter) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
          <p>Fighter not found</p>
          <Link href="/fighters" className="text-blue-500 hover:underline mt-2 inline-block">
            View all fighters
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-20">
      {/* Fighter Profile Header */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
        <div className="md:flex">
          {/* Fighter Image */}
          <div className="md:w-1/3 bg-gray-100 flex items-center justify-center p-6">
            <div className="w-60 h-60 overflow-hidden border-4 border-white shadow-lg">
              {fighter.imageUrl ? (
                <img 
                  src={fighter.imageUrl} 
                  alt={fighter.name} 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.onerror = null; 
                    e.target.style.display = 'none';
                    e.target.parentNode.classList.add('bg-gray-300', 'flex', 'items-center', 'justify-center');
                    
                    // Create and append the initial letter element
                    const initialEl = document.createElement('span');
                    initialEl.className = 'text-4xl font-bold text-gray-500';
                    initialEl.textContent = fighter.name.charAt(0).toUpperCase();
                    e.target.parentNode.appendChild(initialEl);
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                  <span className="text-4xl font-bold text-gray-500">
                    {fighter.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Fighter Info */}
          <div className="md:w-2/3 p-6">
            <h1 className="text-3xl font-bold mb-2">{fighter.name}</h1>
            {fighter.nickname && (
              <p className="text-gray-600 italic mb-4">"{fighter.nickname}"</p>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {fighter.weightClass && (
                <div>
                  <p className="text-gray-500 text-sm">Weight Class</p>
                  <p className="font-semibold">{fighter.weightClass}</p>
                </div>
              )}
              
              {fighter.nationality && (
                <div>
                  <p className="text-gray-500 text-sm">Nationality</p>
                  <p className="font-semibold">{fighter.nationality}</p>
                </div>
              )}
              
              {fighter.record && (
                <div>
                  <p className="text-gray-500 text-sm">Record</p>
                  <p className="font-semibold">{fighter.record}</p>
                </div>
              )}
            </div>
            
            {/* Record Stats */}
            <div className="flex space-x-4 mt-4">
              <div className="bg-green-100 rounded-lg px-4 py-2 text-center">
                <p className="text-green-700 font-bold text-xl">{recordStats.wins}</p>
                <p className="text-green-600 text-sm">Wins</p>
              </div>
              <div className="bg-red-100 rounded-lg px-4 py-2 text-center">
                <p className="text-red-700 font-bold text-xl">{recordStats.losses}</p>
                <p className="text-red-600 text-sm">Losses</p>
              </div>
              <div className="bg-gray-100 rounded-lg px-4 py-2 text-center">
                <p className="text-gray-700 font-bold text-xl">{recordStats.draws}</p>
                <p className="text-gray-600 text-sm">Draws</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabs Navigation */}
      <TabNavigation 
        tabs={tabs} 
        activeTab={activeTab} 
        onChange={setActiveTab}
        className="mb-6"
      />
      
      {/* Tab Content */}
      <div className="bg-white shadow-md rounded-lg p-6">
        {activeTab === 'fights' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Fight History</h2>
            
            {fights.length === 0 ? (
              <p className="text-gray-500 italic">No fights found for this fighter.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-100 text-left text-gray-600">
                      <th className="py-3 px-4 font-semibold">Date</th>
                      <th className="py-3 px-4 font-semibold">Event</th>
                      <th className="py-3 px-4 font-semibold">Opponent</th>
                      <th className="py-3 px-4 font-semibold">Result</th>
                      <th className="py-3 px-4 font-semibold">Method</th>
                      <th className="py-3 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fights.map(fight => {
                      // Determine if the current fighter is fighter1 or fighter2
                      const isFighter1 = fight.fighter1Id === parseInt(fighterId);
                      const opponent = isFighter1 ? fight.fighter2 : fight.fighter1;
                      
                      // Determine the result from this fighter's perspective
                      let result = 'N/A';
                      if (fight.result === 'FIGHTER1_WIN') {
                        result = isFighter1 ? 'Win' : 'Loss';
                      } else if (fight.result === 'FIGHTER2_WIN') {
                        result = isFighter1 ? 'Loss' : 'Win';
                      } else if (fight.result === 'DRAW') {
                        result = 'Draw';
                      } else if (fight.result === 'NO_CONTEST') {
                        result = 'No Contest';
                      }
                      
                      // Format the date
                      const fightDate = new Date(fight.date);
                      const formattedDate = fightDate.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      });
                      
                      return (
                        <tr key={fight.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="py-3 px-4">{formattedDate}</td>
                          <td className="py-3 px-4">{fight.eventName}</td>
                          <td className="py-3 px-4">
                            <Link href={`/fighter/${opponent?.id}`} className="text-blue-500 hover:underline">
                              {opponent?.name || 'Unknown'}
                            </Link>
                          </td>
                          <td className={`py-3 px-4 font-medium ${
                            result === 'Win' ? 'text-green-600' : 
                            result === 'Loss' ? 'text-red-600' : 
                            'text-gray-600'
                          }`}>
                            {result}
                          </td>
                          <td className="py-3 px-4">{fight.winMethod || 'Decision'}</td>
                          <td className="py-3 px-4">
                            <Link 
                              href={`/fight/${fight.id}`}
                              className="text-blue-500 hover:underline"
                            >
                              View
                            </Link>
                            <span className="mx-2">|</span>
                            <Link 
                              href={`/fight/${fight.id}/score`}
                              className="text-green-500 hover:underline"
                            >
                              Score
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'scorecards' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Community Scorecards</h2>
            <p className="text-gray-500 italic">
              Scorecards feature coming soon. See how the community scored this fighter's bouts.
            </p>
          </div>
        )}
        
        {activeTab === 'stats' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Fighter Statistics</h2>
            <p className="text-gray-500 italic">
              Detailed statistics feature coming soon. Track win percentages, knockout ratios, and more.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}