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
  
  const handleCreateScorecard = () => {
    if (!session) {
      setError("You must be signed in to create a scorecard");
      return;
    }
    
    router.push(`/fight/${fight.id}/score`);
  };
  
  return (
    <div className="bg-white rounded-custom shadow-md overflow-hidden">
      <div className="p-4 bg-background border-b">
        <Link href={`/fight/${fight.id}`} className="text-xl font-bold text-primary hover:text-opacity-90">
          {fighter1.name} vs {fighter2.name}
        </Link>
        <p className="text-gray-600 font-semibold mt-1">{eventName}</p>
        <p className="text-sm text-gray-500">{formattedDate}</p>
      </div>
      
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="text-center w-5/12">
            <div className="w-24 h-24 mx-auto bg-gray-200 rounded-full overflow-hidden mb-2">
              {fighter1.imageUrl ? (
                <img 
                  src={fighter1.imageUrl} 
                  alt={fighter1.name} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No Image
                </div>
              )}
            </div>
            <h3 className="font-bold text-lg">{fighter1.name}</h3>
            {fighter1.nickname && (
              <p className="text-sm text-gray-600">"{fighter1.nickname}"</p>
            )}
            {fighter1.record && (
              <p className="text-sm text-gray-500">Record: {fighter1.record}</p>
            )}
          </div>
          
          <div className="text-center">
            <span className="inline-block px-3 py-2 bg-primary text-white rounded-lg font-semibold text-sm">
              VS
            </span>
          </div>
          
          <div className="text-center w-5/12">
            <div className="w-24 h-24 mx-auto bg-gray-200 rounded-full overflow-hidden mb-2">
              {fighter2.imageUrl ? (
                <img 
                  src={fighter2.imageUrl} 
                  alt={fighter2.name} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No Image
                </div>
              )}
            </div>
            <h3 className="font-bold text-lg">{fighter2.name}</h3>
            {fighter2.nickname && (
              <p className="text-sm text-gray-600">"{fighter2.nickname}"</p>
            )}
            {fighter2.record && (
              <p className="text-sm text-gray-500">Record: {fighter2.record}</p>
            )}
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Date</p>
              <p className="font-semibold">{formattedDate}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Format</p>
              <p className="font-semibold">{numberOfRounds} Rounds</p>
            </div>
            
            {venue && (
              <div>
                <p className="text-sm text-gray-600">Venue</p>
                <p className="font-semibold">{venue}</p>
              </div>
            )}
            
            {location && (
              <div>
                <p className="text-sm text-gray-600">Location</p>
                <p className="font-semibold">{location}</p>
              </div>
            )}
            
            <div>
              <p className="text-sm text-gray-600">Result</p>
              <p className="font-semibold">{getResultLabel()}</p>
            </div>
            
            {fight.winMethod && result !== "PENDING" && result !== "DRAW" && result !== "NO_CONTEST" && (
              <div>
                <p className="text-sm text-gray-600">Method</p>
                <p className="font-semibold">{fight.winMethod}</p>
              </div>
            )}
          </div>
        </div>
        
        {detailed && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">Community Scorecards</h3>
              <p className="text-sm text-gray-500">
                {fight._count?.scorecards || 0} {fight._count?.scorecards === 1 ? 'Scorecard' : 'Scorecards'}
              </p>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={handleCreateScorecard}
                className="px-4 py-2 bg-primary text-white rounded-custom font-semibold hover:bg-opacity-90 transition"
              >
                Score This Fight
              </button>
              
              <Link 
                href={`/fight/${fight.id}`}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-custom font-semibold hover:bg-gray-200 transition"
              >
                View All Scorecards
              </Link>
            </div>
          </div>
        )}
        
        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}