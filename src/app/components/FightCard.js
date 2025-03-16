"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function FightCard({ fight, detailed = false }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [error, setError] = useState("");
  
  if (!fight) return null;
  
  const { fighter1, fighter2, eventName, date, venue, location, numberOfRounds, result } = fight;
  
  const formattedDate = new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  
  const getResultLabel = () => {
    if (!result || result === "PENDING") return "Upcoming";
    
    let resultLabel = "";
    switch (result) {
      case "FIGHTER1_WIN":
        resultLabel = `${fighter1.name} defeats ${fighter2.name}`;
        break;
      case "FIGHTER2_WIN":
        resultLabel = `${fighter2.name} defeats ${fighter1.name}`;
        break;
      case "DRAW":
        resultLabel = "Draw";
        break;
      case "NO_CONTEST":
        resultLabel = "No Contest";
        break;
      default:
        resultLabel = "Result Pending";
    }
    
    return resultLabel;
  };
  
  const getResultBadge = () => {
    if (!result || result === "PENDING") return null;
    
    let badgeClass = "";
    let badgeText = "";
    
    switch (result) {
      case "FIGHTER1_WIN":
        badgeClass = "bg-primary";
        badgeText = "Fighter 1 Win";
        break;
      case "FIGHTER2_WIN":
        badgeClass = "bg-secondary";
        badgeText = "Fighter 2 Win";
        break;
      case "DRAW":
        badgeClass = "bg-yellow-600";
        badgeText = "Draw";
        break;
      case "NO_CONTEST":
        badgeClass = "bg-gray-600";
        badgeText = "No Contest";
        break;
      default:
        return null;
    }
    
    return (
      <div className={`absolute top-4 right-4 ${badgeClass} text-white text-xs px-3 py-1 rounded-full font-serif uppercase tracking-wider`}>
        {badgeText}
      </div>
    );
  };
  
  const handleCreateScorecard = () => {
    if (!session) {
      setError("You must be signed in to create a scorecard");
      return;
    }
    
    router.push(`/fight/${fight.id}/score`);
  };
  
  return (
    <div className="bg-cream rounded-custom shadow-lg overflow-hidden border-2 border-gray-300 relative">
      <div className="p-6 bg-background border-b-2 border-gray-300">
        <Link href={`/fight/${fight.id}`} className="text-2xl font-bold text-textDark hover:text-primary transition">
          {fighter1.name} vs {fighter2.name}
        </Link>
        <p className="text-lg font-serif mt-1">{eventName}</p>
        <p className="text-sm text-gray-600 font-serif">{formattedDate}</p>
        {getResultBadge()}
      </div>
      
      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="text-center w-[42%] sm:w-5/12 flex flex-col items-center">
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-200 rounded-full overflow-hidden mb-3 border-4 border-primary shadow-md flex items-center justify-center">
              {fighter1.imageUrl ? (
                <img 
                  src={fighter1.imageUrl} 
                  alt={fighter1.name} 
                  className="w-full h-full object-contain" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No Image
                </div>
              )}
            </div>
            <div className="min-h-[80px] flex flex-col items-center">
              <h3 className="font-bold text-lg sm:text-xl text-primary">{fighter1.name}</h3>
              {fighter1.nickname && (
                <p className="text-xs sm:text-sm text-gray-600 font-serif italic">&quot;{fighter1.nickname}&quot;</p>
              )}
              {fighter1.record && (
                <p className="text-xs sm:text-sm text-gray-600 mt-1 font-serif">{fighter1.record}</p>
              )}
            </div>
          </div>
          
          <div className="text-center w-[16%] sm:w-auto flex flex-col items-center justify-start">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-800 flex items-center justify-center shadow-md mb-2">
              <span className="text-white text-base sm:text-xl font-bold">VS</span>
            </div>
            <div className="bg-black text-white text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5 rounded-full font-serif inline-block">
              {numberOfRounds} RDS
            </div>
          </div>
          
          <div className="text-center w-[42%] sm:w-5/12 flex flex-col items-center">
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-200 rounded-full overflow-hidden mb-3 border-4 border-secondary shadow-md flex items-center justify-center">
              {fighter2.imageUrl ? (
                <img 
                  src={fighter2.imageUrl} 
                  alt={fighter2.name} 
                  className="w-full h-full object-contain" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No Image
                </div>
              )}
            </div>
            <div className="min-h-[80px] flex flex-col items-center">
              <h3 className="font-bold text-lg sm:text-xl text-secondary">{fighter2.name}</h3>
              {fighter2.nickname && (
                <p className="text-xs sm:text-sm text-gray-600 font-serif italic">&quot;{fighter2.nickname}&quot;</p>
              )}
              {fighter2.record && (
                <p className="text-xs sm:text-sm text-gray-600 mt-1 font-serif">{fighter2.record}</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="my-8 border-t-2 border-b-2 border-gray-300 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-xs uppercase tracking-wider text-gray-500 font-serif">Date</p>
              <p className="font-semibold font-serif">{formattedDate}</p>
            </div>
            
            {venue && (
              <div className="text-center">
                <p className="text-xs uppercase tracking-wider text-gray-500 font-serif">Venue</p>
                <p className="font-semibold font-serif">{venue}</p>
              </div>
            )}
            
            {location && (
              <div className="text-center">
                <p className="text-xs uppercase tracking-wider text-gray-500 font-serif">Location</p>
                <p className="font-semibold font-serif">{location}</p>
              </div>
            )}
            
            {result && result !== "PENDING" && (
              <div className="text-center">
                <p className="text-xs uppercase tracking-wider text-gray-500 font-serif">Result</p>
                <p className="font-semibold font-serif">{getResultLabel()}</p>
              </div>
            )}
            
            {fight.winMethod && result !== "PENDING" && result !== "DRAW" && result !== "NO_CONTEST" && (
              <div className="text-center col-span-2">
                <p className="text-xs uppercase tracking-wider text-gray-500 font-serif">Method</p>
                <p className="font-semibold font-serif">{fight.winMethod}</p>
              </div>
            )}
          </div>
        </div>
        
        {detailed && (
          <div className="flex justify-start items-center mt-6">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center shadow-sm">
                <span className="text-white text-lg font-bold">{fight._count?.scorecards || 0}</span>
              </div>
              <p className="ml-3 text-gray-700 font-serif">
                {fight._count?.scorecards === 1 ? 'Scorecard' : 'Scorecards'} Submitted
              </p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 font-serif">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}