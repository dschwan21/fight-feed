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

  // Function to format fighter names for display
  const formatFighterName = (name) => {
    if (!name) return { firstName: '', lastName: '' };
    
    const nameParts = name.split(' ');
    if (nameParts.length <= 1) return { firstName: name, lastName: '' };
    
    const lastName = nameParts.pop();
    const firstName = nameParts.join(' ');
    
    return { firstName, lastName };
  };
  
  const fighter1Name = formatFighterName(fight.fighter1.name);
  const fighter2Name = formatFighterName(fight.fighter2.name);

  // Check if current user is the scorecard owner
  const isOwner = session?.user?.id === scorecard.userId;

  // Toggle expanded state for round notes
  const toggleRoundNotes = (roundNumber) => {
    setExpandedRounds(prev => ({
      ...prev,
      [roundNumber]: !prev[roundNumber]
    }));
  };

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
    <div className="bg-cream rounded-lg shadow-md overflow-hidden border border-gray-300 my-6">
      {/* Scorecard Header */}
      <div className="p-4 bg-cream">
        {showFightDetails && (
          <div className="mb-3 text-center">
            <Link href={`/fight/${fight.id}`} className="text-xl font-bold tracking-wider uppercase hover:text-gray-700 transition-colors font-serif">
              {fight.fighter1.name} vs {fight.fighter2.name}
            </Link>
            <p className="text-sm text-gray-600 mt-1 font-serif">{fight.eventName} • {new Date(fight.date).toLocaleDateString()}</p>
          </div>
        )}
        
        <div className="flex items-center justify-between mt-1">
          {!scorecard.public && (
            <div className="px-2.5 py-1 bg-gray-200 text-gray-700 text-xs rounded-md font-medium">
              Private
            </div>
          )}

          {showActions && isOwner && (
            <div className="flex space-x-2">
              <Link 
                href={`/scorecard/${scorecard.id}/edit`} 
                className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-md text-sm font-medium transition-colors text-gray-800"
              >
                Edit
              </Link>
              <button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-1.5 bg-red-200 hover:bg-red-300 text-red-800 rounded-md text-sm font-medium transition-colors"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Boxers Header Cards */}
      <div className="flex justify-between">
        {/* Fighter 1 Header - Blue Side */}
        <div className="w-1/2 border-r-2 border-gray-500">
          <div className="h-14 p-2 text-center border-b-2 border-blue-800 font-serif flex flex-col items-center justify-center bg-cream">
            <h3 className="font-bold text-blue-800 leading-tight">
              {fighter1Name.firstName}
              {fighter1Name.lastName && <div>{fighter1Name.lastName}</div>}
            </h3>
          </div>
          <div className="bg-cream flex flex-col items-center justify-center">
            <div className="w-full border-b border-gray-300">
              {fight.fighter1.imageUrl ? (
                <img 
                  src={fight.fighter1.imageUrl} 
                  alt={fight.fighter1.name}
                  className="w-full h-64 object-cover"
                />
              ) : (
                <div className="w-full h-64 flex items-center justify-center bg-cream border border-blue-800">
                  <span className="text-blue-800 font-bold text-6xl font-serif">{fight.fighter1.name.charAt(0).toLowerCase()}</span>
                </div>
              )}
            </div>
            <div className="bg-blue-800 text-white w-full h-14 flex items-center justify-center">
              <span className="text-5xl font-bold font-serif">{totalFighter1Score}</span>
            </div>
            {fighter1Won && (
              <div className="mt-2 mb-2 px-4 py-0 font-black text-black text-xl font-serif tracking-wide">
                WINNER
              </div>
            )}
            {!fighter1Won && <div className="py-1"></div>}
          </div>
        </div>
        
        {/* Fighter 2 Header - Red Side */}
        <div className="w-1/2">
          <div className="h-14 p-2 text-center border-b-2 border-red-800 font-serif flex flex-col items-center justify-center bg-cream">
            <h3 className="font-bold text-red-800 leading-tight">
              {fighter2Name.firstName}
              {fighter2Name.lastName && <div>{fighter2Name.lastName}</div>}
            </h3>
          </div>
          <div className="bg-cream flex flex-col items-center justify-center">
            <div className="w-full border-b border-gray-300">
              {fight.fighter2.imageUrl ? (
                <img 
                  src={fight.fighter2.imageUrl} 
                  alt={fight.fighter2.name}
                  className="w-full h-64 object-cover"
                />
              ) : (
                <div className="w-full h-64 flex items-center justify-center bg-cream border border-red-800">
                  <span className="text-red-800 font-bold text-6xl font-serif">{fight.fighter2.name.charAt(0).toLowerCase()}</span>
                </div>
              )}
            </div>
            <div className="bg-red-800 text-white w-full h-14 flex items-center justify-center">
              <span className="text-5xl font-bold font-serif">{totalFighter2Score}</span>
            </div>
            {fighter2Won && (
              <div className="mt-2 mb-2 px-4 py-0 font-black text-black text-xl font-serif tracking-wide">
                WINNER
              </div>
            )}
            {!fighter2Won && <div className="py-1"></div>}
          </div>
        </div>
      </div>

      {/* Scorecard Body */}
      <div className="p-5 bg-cream">        
        {/* Round-by-Round Display */}
        <div className="overflow-hidden rounded-md border border-gray-300">
          {/* Column Headers */}
          <div className="flex border-b border-gray-300">
            {/* Fighter 1 Header */}
            <div className="w-2/5 py-2 px-3 text-center bg-blue-800 text-white font-serif font-bold h-12 flex items-center justify-center border-r border-gray-300">
              {fight.fighter1.name}
            </div>
            
            {/* Round Header */}
            <div className="w-1/5 py-2 px-3 text-center bg-gray-200 font-serif font-bold h-12 flex items-center justify-center border-r border-gray-300">
              ROUND
            </div>
            
            {/* Fighter 2 Header */}
            <div className="w-2/5 py-2 px-3 text-center bg-red-800 text-white font-serif font-bold h-12 flex items-center justify-center">
              {fight.fighter2.name}
            </div>
          </div>
          
          {/* Round Rows */}
          {rounds.map((round) => {
            const isSwingRound = round.swingRound === true || round.swingRound === 'true';
            const hasNotes = round.notes && round.notes.trim().length > 0;
            const isExpanded = expandedRounds[round.roundNumber];
            
            return (
              <React.Fragment key={`round-row-${round.roundNumber}`}>
                {/* Regular Round Row */}
                <div className="flex border-b border-gray-300">
                  {/* Fighter 1 Score */}
                  <div className="w-2/5 py-3 px-4 text-center font-serif text-blue-800 font-bold text-lg border-r border-gray-300 bg-cream h-14 flex items-center justify-center">
                    {round.fighter1Score}
                  </div>
                  
                  {/* Round Number */}
                  <div 
                    className={`w-1/5 py-3 px-2 text-center font-serif font-bold border-r border-gray-300 bg-gray-100 h-14 flex items-center justify-center ${hasNotes ? 'cursor-pointer hover:bg-gray-200' : ''}`}
                    onClick={() => hasNotes && toggleRoundNotes(round.roundNumber)}
                  >
                    <div className="flex items-center justify-center">
                      <span>{round.roundNumber.toString().padStart(2, '0')}</span>
                      {isSwingRound && (
                        <div className="ml-2 w-3 h-3 rounded-full bg-purple-600" title="Swing round"></div>
                      )}
                      {hasNotes && (
                        <div className="ml-2 relative">
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className={`h-4 w-4 text-gray-600 transition-transform ${isExpanded ? 'transform -rotate-180' : ''}`} 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Fighter 2 Score */}
                  <div className="w-2/5 py-3 px-4 text-center font-serif text-red-800 font-bold text-lg bg-cream h-14 flex items-center justify-center">
                    {round.fighter2Score}
                  </div>
                </div>
                
                {/* Expanded Notes Row */}
                {isExpanded && hasNotes && (
                  <div className="flex border-b border-gray-300 bg-gray-50">
                    <div className="w-full py-3 px-4">
                      <div className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
                        <p className="text-sm font-serif">{round.notes}</p>
                      </div>
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
        
        {/* Final Score Summary */}
        <div className="flex justify-between mt-6">
          <div className="w-2/5">
            <div className="flex justify-between items-center bg-blue-800 p-2 text-white">
              <span className="font-serif font-bold text-xl">{totalFighter1Score}</span>
              <span className="font-serif uppercase">TOTAL</span>
            </div>
          </div>
          
          <div className="w-1/5">
            {/* Center spacer */}
          </div>
          
          <div className="w-2/5">
            <div className="flex justify-between items-center bg-red-800 p-2 text-white">
              <span className="font-serif uppercase">TOTAL</span>
              <span className="font-serif font-bold text-xl">{totalFighter2Score}</span>
            </div>
          </div>
        </div>
        
        {/* Swing Round Legend moved here */}
        {rounds.some(round => round.swingRound === true || round.swingRound === 'true') && (
          <div className="mt-4 text-sm text-gray-700 flex items-center">
            <div className="w-4 h-4 rounded-full bg-purple-600 mr-2"></div>
            <span className="font-serif">Swing round - could have gone either way</span>
          </div>
        )}
        
        {/* Scorecard Notes */}
        {scorecard.notes && (
          <div className="mt-6">
            <h3 className="text-lg font-serif font-bold mb-3 px-2">Notes</h3>
            <div className="p-4 bg-gray-100 rounded-lg border border-gray-300">
              <p className="text-gray-800 font-serif">{scorecard.notes}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg border border-red-200 font-serif">
            {error}
          </div>
        )}
        
        {/* Metadata and Actions */}
        {showActions && (
          <div className="mt-6 flex justify-between items-center border-t border-gray-300 pt-4">
            <div className="text-sm text-gray-700 font-serif">
              Scored by <span className="font-semibold">{user.username || 'Anonymous User'}</span> on {new Date(scorecard.createdAt).toLocaleDateString()}
            </div>
            <Link 
              href={`/scorecard/${scorecard.id}`} 
              className="px-4 py-2 bg-gray-800 text-white rounded-full text-sm font-medium hover:bg-gray-700 font-serif"
            >
              {scorecard._count?.comments || 0} Comments • View Full Scorecard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}