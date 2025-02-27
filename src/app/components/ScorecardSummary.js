"use client";

import Link from "next/link";

export default function ScorecardSummary({ scorecard }) {
  if (!scorecard || !scorecard.user || !scorecard.rounds || !scorecard.rounds.length) {
    return null;
  }

  const { user, fight, rounds } = scorecard;
  
  // Calculate total scores
  const totalFighter1Score = rounds.reduce((sum, round) => sum + round.fighter1Score, 0);
  const totalFighter2Score = rounds.reduce((sum, round) => sum + round.fighter2Score, 0);
  
  // Determine who won based on total score
  const fighter1Won = totalFighter1Score > totalFighter2Score;
  const fighter2Won = totalFighter2Score > totalFighter1Score;
  const isDraw = totalFighter1Score === totalFighter2Score;

  return (
    <Link href={`/scorecard/${scorecard.id}`} className="block">
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
        {/* Card Header with User Info */}
        <div className="bg-black text-white p-3 flex items-center justify-between">
          <div className="flex items-center">
            {user.avatarUrl ? (
              <img 
                src={user.avatarUrl} 
                alt={user.username || 'User'} 
                className="w-8 h-8 rounded-full mr-2" 
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-700 mr-2 flex items-center justify-center text-xs">
                {user.username?.charAt(0) || 'U'}
              </div>
            )}
            <span className="font-medium">{user.username || 'Anonymous User'}</span>
          </div>
          <span className="text-xs text-gray-300">
            {new Date(scorecard.createdAt).toLocaleDateString()}
          </span>
        </div>
        
        {/* Score Display */}
        <div className="p-4">
          <div className="flex justify-between items-center">
            <div className="text-center">
              <p className="text-sm uppercase tracking-wider text-gray-600">{fight.fighter1.name}</p>
              <p className="text-3xl font-bold">{totalFighter1Score}</p>
            </div>
            
            <div className="flex items-center px-2">
              <span className={`font-bold ${isDraw ? 'text-yellow-700' : 'text-gray-400'}`}>
                {isDraw ? "DRAW" : "-"}
              </span>
            </div>
            
            <div className="text-center">
              <p className="text-sm uppercase tracking-wider text-gray-600">{fight.fighter2.name}</p>
              <p className="text-3xl font-bold">{totalFighter2Score}</p>
            </div>
          </div>
          
          <div className="mt-3 text-center">
            <div className={`inline-block px-4 py-1 rounded-full text-sm font-medium ${
              isDraw 
                ? 'bg-yellow-100 text-yellow-800' 
                : fighter1Won 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-red-100 text-red-800'
            }`}>
              {isDraw 
                ? 'Draw' 
                : fighter1Won 
                  ? `${fight.fighter1.name} Wins` 
                  : `${fight.fighter2.name} Wins`
              }
            </div>
          </div>
          
          <div className="mt-3 flex justify-between items-center text-sm text-gray-500">
            <div>
              {scorecard.rounds.some(r => r.swingRound) && (
                <span className="mr-2">
                  <span className="text-yellow-500 font-bold">*</span> Swing rounds
                </span>
              )}
            </div>
            
            <div>
              {scorecard._count?.comments > 0 && (
                <span>
                  {scorecard._count.comments} {scorecard._count.comments === 1 ? 'comment' : 'comments'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}