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

  return (
    <Link href={`/scorecard/${scorecard.id}`} className="block w-full">
      <div className="bg-cream rounded-lg shadow-md overflow-hidden border-2 border-gray-500 hover:shadow-lg hover:border-gray-700 transition-all">
        
        <div className="flex">
          {/* Fighter 1 Side - Blue */}
          <div className="w-1/2 border-r-2 border-gray-500">
            <div className="h-10 sm:h-14 p-1 sm:p-2 text-center border-b-2 border-blue-800 font-serif flex flex-col items-center justify-center">
              <h3 className="font-bold text-blue-800 leading-tight text-xs sm:text-base">
                {fighter1Name.firstName}
                {fighter1Name.lastName && (
                  <div className="text-xs sm:text-sm">{fighter1Name.lastName}</div>
                )}
              </h3>
            </div>
            
            <div className="p-2 sm:p-5 text-center bg-cream flex flex-col items-center justify-center">
              <div className="bg-blue-800 text-white w-14 h-14 sm:w-20 sm:h-20 rounded-md flex items-center justify-center">
                <p className="text-2xl sm:text-4xl font-bold font-serif">{totalFighter1Score}</p>
              </div>
              {fighter1Won && (
                <div className="mt-1 sm:mt-3 px-2 sm:px-3 py-0.5 sm:py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-serif">
                  WINNER
                </div>
              )}
            </div>
          </div>
          
          {/* Fighter 2 Side - Red */}
          <div className="w-1/2">
            <div className="h-10 sm:h-14 p-1 sm:p-2 text-center border-b border-red-800 font-serif flex flex-col items-center justify-center">
              <h3 className="font-bold text-red-800 leading-tight text-xs sm:text-base">
                {fighter2Name.firstName}
                {fighter2Name.lastName && (
                  <div className="text-xs sm:text-sm">{fighter2Name.lastName}</div>
                )}
              </h3>
            </div>
            
            <div className="p-2 sm:p-5 text-center bg-cream flex flex-col items-center justify-center">
              <div className="bg-red-800 text-white w-14 h-14 sm:w-20 sm:h-20 rounded-md flex items-center justify-center">
                <p className="text-2xl sm:text-4xl font-bold font-serif">{totalFighter2Score}</p>
              </div>
              {fighter2Won && (
                <div className="mt-1 sm:mt-3 px-2 sm:px-3 py-0.5 sm:py-1 bg-red-100 text-red-800 text-xs rounded-full font-serif">
                  WINNER
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Make sure score areas are the same height regardless of winner badge */}
        <div className="flex">
          <div className="w-1/2 h-3 sm:h-4 border-r-2 border-gray-500"></div>
          <div className="w-1/2 h-3 sm:h-4"></div>
        </div>
        
        {/* Card Footer */}
        <div className="bg-gray-50 p-2 sm:p-3 text-xs sm:text-sm text-gray-600 flex items-center flex-wrap">
          {user.avatarUrl ? (
            <img 
              src={user.avatarUrl} 
              alt={user.username || 'User'} 
              className="w-5 h-5 sm:w-6 sm:h-6 rounded-full mr-1 sm:mr-2 border border-gray-300" 
            />
          ) : (
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gray-400 mr-1 sm:mr-2 flex items-center justify-center text-xs text-white">
              {user.username?.charAt(0) || 'U'}
            </div>
          )}
          <span className="font-medium font-serif truncate max-w-[80px] sm:max-w-none">{user.username || 'Anonymous User'}</span>
          <span className="mx-1 sm:mx-2 hidden sm:inline">•</span>
          <span className="text-xs text-gray-500 font-serif ml-auto sm:ml-0">
            {new Date(scorecard.createdAt).toLocaleDateString()}
          </span>
          {isDraw && (
            <span className="ml-auto px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-serif">DRAW</span>
          )}
        </div>
      </div>
    </Link>
  );
}