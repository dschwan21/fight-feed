"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function ScorecardDisplay({ scorecard, showFightDetails = false, showActions = true }) {
  // State to track which round notes are expanded
  const [expandedRounds, setExpandedRounds] = useState({});
  const { data: session } = useSession();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  if (!scorecard) return null;

  const { user, fight, rounds } = scorecard;
  
  // Ensure all required data exists to prevent errors
  if (!fight?.fighter1?.name || !fight?.fighter2?.name || !rounds?.length || !user) {
    return (
      <div className="bg-white rounded-lg shadow-md p-5">
        <p className="text-red-500">Error loading scorecard data. Missing required information.</p>
      </div>
    );
  }
  
  // Calculate total scores
  const totalFighter1Score = rounds.reduce((sum, round) => sum + round.fighter1Score, 0);
  const totalFighter2Score = rounds.reduce((sum, round) => sum + round.fighter2Score, 0);
  
  // Determine who won based on total score
  const fighter1Won = totalFighter1Score > totalFighter2Score;
  const fighter2Won = totalFighter2Score > totalFighter1Score;
  const isDraw = totalFighter1Score === totalFighter2Score;

  // Check if current user is the scorecard owner
  const isOwner = session?.user?.id === scorecard.userId;

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this scorecard? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      const response = await fetch(`/api/scorecards/${scorecard.id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete scorecard");
      }

      // Redirect after successful deletion
      router.push(`/fight/${fight.id}`);
      router.refresh();
    } catch (error) {
      setError(error.message);
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Scorecard Header */}
      <div className="bg-black text-white p-4">
        {showFightDetails && (
          <div className="mb-3 text-center">
            <Link href={`/fight/${fight.id}`} className="text-xl font-bold tracking-wider uppercase hover:text-gray-300 transition-colors">
              {fight.fighter1.name} vs {fight.fighter2.name}
            </Link>
            <p className="text-sm text-gray-400 mt-1">{fight.eventName} • {new Date(fight.date).toLocaleDateString()}</p>
          </div>
        )}
        
        <div className="flex items-center justify-between mt-1">
          {!scorecard.public && (
            <div className="px-2.5 py-1 bg-gray-800 text-gray-300 text-xs rounded-md font-medium">
              Private
            </div>
          )}

          {showActions && isOwner && (
            <div className="flex space-x-2">
              <Link 
                href={`/scorecard/${scorecard.id}/edit`} 
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-medium transition-colors"
              >
                Edit
              </Link>
              <button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-1.5 bg-red-900 hover:bg-red-800 text-white rounded-md text-sm font-medium transition-colors"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Scorecard Body */}
      <div className="p-5">
        {/* Total Score Display */}
        <div className="flex justify-between items-center mb-6 px-4 py-6 bg-black text-white rounded-lg">
          <div className="text-center">
            <p className="text-lg uppercase tracking-wider">{fight.fighter1.name}</p>
            <p className="text-4xl font-bold mt-2">{totalFighter1Score}</p>
          </div>
          
          <div className="flex flex-col items-center">
            <span className="font-bold text-3xl">
              {isDraw ? "DRAW" : "-"}
            </span>
          </div>
          
          <div className="text-center">
            <p className="text-lg uppercase tracking-wider">{fight.fighter2.name}</p>
            <p className="text-4xl font-bold mt-2">{totalFighter2Score}</p>
          </div>
        </div>
        
        {/* Round-by-Round Display */}
        <h3 className="text-lg font-semibold mb-4 px-2">Round-by-Round</h3>
        
        <div className="overflow-hidden rounded-lg">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="py-2 px-4 text-center border-r border-gray-700">RD</th>
                <th className="py-2 px-4 text-center border-r border-gray-700">{fight.fighter1.name}</th>
                <th className="py-2 px-4 text-center">{fight.fighter2.name}</th>
              </tr>
            </thead>
            <tbody>
              {rounds.map((round) => {
                const fighter1Wins = round.fighter1Score > round.fighter2Score;
                const fighter2Wins = round.fighter2Score > round.fighter1Score;
                const hasNotes = round.notes && round.notes.trim().length > 0;
                
                // Explicitly check if swingRound is true - handle both boolean and string values
                const isSwingRound = round.swingRound === true || round.swingRound === 'true';
                
                // Function to toggle expanded state for this round
                const toggleRoundNotes = (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (hasNotes) {
                    setExpandedRounds(prev => ({
                      ...prev,
                      [round.roundNumber]: !prev[round.roundNumber]
                    }));
                  }
                };
                
                return (
                  <React.Fragment key={round.roundNumber}>
                    <tr className={`border-b ${isSwingRound ? 'bg-purple-50' : (round.roundNumber % 2 === 0 ? 'bg-gray-100' : 'bg-white')}`}>
                      <td className="py-3 px-4 text-center font-semibold border-r">
                        <div className="flex items-center justify-center">
                          {round.roundNumber}
                          {isSwingRound && (
                            <div className="ml-2 w-4 h-4 rounded-full bg-purple-600 animate-pulse" title="Swing round"></div>
                          )}
                        </div>
                      </td>
                      
                      <td className={`py-3 px-4 text-center text-lg font-medium border-r`}>
                        <div className="flex items-center justify-center">
                          <span className={`flex items-center justify-center w-10 h-10 rounded-full ${
                            fighter1Wins ? 'bg-black text-white' : 'bg-white border border-gray-300'
                          }`}>
                            {round.fighter1Score}
                          </span>
                        </div>
                      </td>
                      
                      <td className={`py-3 px-4 text-center text-lg font-medium relative`}>
                        <div className="flex items-center justify-center pr-8">
                          <span className={`flex items-center justify-center w-10 h-10 rounded-full ${
                            fighter2Wins ? 'bg-black text-white' : 'bg-white border border-gray-300'
                          }`}>
                            {round.fighter2Score}
                          </span>
                          
                          {/* Notes button */}
                          {hasNotes && (
                            <button 
                              onClick={toggleRoundNotes}
                              className={`absolute right-8 p-1 rounded-full transition-colors ${
                                expandedRounds[round.roundNumber] 
                                  ? 'bg-gray-200 text-gray-800' 
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              }`}
                              title="Round notes"
                            >
                              <svg 
                                className={`w-4 h-4 transition-transform ${expandedRounds[round.roundNumber] ? 'rotate-180' : ''}`} 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expandable notes section */}
                    {hasNotes && expandedRounds[round.roundNumber] && (
                      <tr className="bg-gray-50">
                        <td colSpan={3} className="px-4 py-3 border-b">
                          <div className="p-3 rounded bg-white border border-gray-200 text-gray-700">
                            <p className="whitespace-pre-wrap">{round.notes}</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Swing Round Legend */}
        {rounds.some(round => round.swingRound === true || round.swingRound === 'true') && (
          <div className="mt-2 text-sm text-gray-600 flex items-center">
            <div className="w-4 h-4 rounded-full bg-purple-600 animate-pulse mr-2"></div>
            <span>Swing round - could have gone either way</span>
          </div>
        )}
        
        
        {/* Scorecard Notes */}
        {scorecard.notes && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3 px-2">Notes</h3>
            <div className="p-4 bg-gray-100 rounded-lg">
              <p className="text-gray-800">{scorecard.notes}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg border border-red-200">
            {error}
          </div>
        )}
        
        {/* Comments Link */}
        {showActions && (
          <div className="mt-6 flex justify-between items-center border-t pt-4">
            <div className="text-sm text-gray-500">
              Scored by <span className="font-semibold">{user.username || 'Anonymous User'}</span> on {new Date(scorecard.createdAt).toLocaleDateString()}
            </div>
            <Link 
              href={`/scorecard/${scorecard.id}`} 
              className="px-4 py-2 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800"
            >
              {scorecard._count?.comments || 0} Comments • View Full Scorecard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}