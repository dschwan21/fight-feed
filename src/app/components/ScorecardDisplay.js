"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function ScorecardDisplay({ scorecard, showFightDetails = false, showActions = true }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  if (!scorecard) return null;

  const { user, fight, rounds } = scorecard;
  
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
    <div className="bg-white rounded-custom shadow-md overflow-hidden">
      {/* Scorecard Header */}
      <div className="p-4 bg-background border-b">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            {user.avatarUrl && (
              <img 
                src={user.avatarUrl} 
                alt={user.username || 'User'} 
                className="w-10 h-10 rounded-full mr-3" 
              />
            )}
            <div>
              <Link href={`/profile/${user.id}`} className="font-semibold text-primary hover:underline">
                {user.username || 'Anonymous User'}
              </Link>
              <p className="text-sm text-gray-500">
                {new Date(scorecard.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {showActions && isOwner && (
            <div className="flex space-x-2">
              <Link 
                href={`/scorecard/${scorecard.id}/edit`} 
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
              >
                Edit
              </Link>
              <button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          )}
        </div>

        {showFightDetails && (
          <div className="mb-2">
            <Link href={`/fight/${fight.id}`} className="text-lg font-semibold hover:text-primary">
              {fight.fighter1.name} vs {fight.fighter2.name}
            </Link>
            <p className="text-sm text-gray-600">{fight.eventName} • {new Date(fight.date).toLocaleDateString()}</p>
          </div>
        )}

        {!scorecard.public && (
          <div className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-lg mb-2">
            Private Scorecard
          </div>
        )}
      </div>

      {/* Scorecard Body */}
      <div className="p-4">
        {/* Total Score Display */}
        <div className="flex justify-between mb-6 pb-4 border-b">
          <div className={`text-center px-4 py-3 rounded-lg ${
            fighter1Won ? 'bg-primary text-white' : 'bg-gray-100'
          }`}>
            <p className="font-semibold">{fight.fighter1.name}</p>
            <p className="text-2xl font-bold">{totalFighter1Score}</p>
          </div>
          
          <div className="flex items-center">
            <span className="text-lg font-semibold mx-2">
              {isDraw ? "DRAW" : fighter1Won ? "DEFEATS" : "LOSES TO"}
            </span>
          </div>
          
          <div className={`text-center px-4 py-3 rounded-lg ${
            fighter2Won ? 'bg-primary text-white' : 'bg-gray-100'
          }`}>
            <p className="font-semibold">{fight.fighter2.name}</p>
            <p className="text-2xl font-bold">{totalFighter2Score}</p>
          </div>
        </div>
        
        {/* Round-by-Round Display */}
        <h3 className="text-lg font-semibold mb-3">Round-by-Round Scoring</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="py-2 px-3 text-left">Round</th>
                <th className="py-2 px-3 text-left">{fight.fighter1.name}</th>
                <th className="py-2 px-3 text-left">{fight.fighter2.name}</th>
                <th className="py-2 px-3 text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {rounds.map((round) => (
                <tr key={round.roundNumber} className="border-b">
                  <td className="py-2 px-3 font-semibold">{round.roundNumber}</td>
                  <td className={`py-2 px-3 ${round.fighter1Score > round.fighter2Score ? 'text-primary font-bold' : ''}`}>
                    {round.fighter1Score}
                  </td>
                  <td className={`py-2 px-3 ${round.fighter2Score > round.fighter1Score ? 'text-primary font-bold' : ''}`}>
                    {round.fighter2Score}
                  </td>
                  <td className="py-2 px-3 text-gray-600 text-sm">{round.notes || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Scorecard Notes */}
        {scorecard.notes && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Notes</h3>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-700">{scorecard.notes}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        
        {/* Comments Link */}
        {showActions && (
          <div className="mt-4 text-right">
            <Link 
              href={`/scorecard/${scorecard.id}`} 
              className="text-primary hover:underline"
            >
              {scorecard._count?.comments || 0} Comments • View Full Scorecard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}