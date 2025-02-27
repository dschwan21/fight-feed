"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function ScorecardForm({ fight, existingScorecard = null }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Initialize state based on either editing an existing scorecard or creating a new one
  const [notes, setNotes] = useState(existingScorecard?.notes || "");
  const [isPublic, setIsPublic] = useState(
    existingScorecard?.public !== undefined ? existingScorecard.public : true
  );
  
  // Initialize rounds based on the fight's number of rounds
  const [rounds, setRounds] = useState([]);
  
  useEffect(() => {
    // Only initialize rounds when fight data is fully loaded with both fighters
    if (fight && fight.fighter1 && fight.fighter2) {
      // If editing an existing scorecard, use its rounds
      if (existingScorecard && existingScorecard.rounds?.length) {
        setRounds(existingScorecard.rounds.map(round => ({
          roundNumber: round.roundNumber,
          fighter1Score: round.fighter1Score,
          fighter2Score: round.fighter2Score,
          swingRound: round.swingRound || false,
          notes: round.notes || ""
        })));
      } else {
        // If creating a new scorecard, create empty rounds based on the fight
        const initialRounds = [];
        for (let i = 1; i <= (fight.numberOfRounds || 3); i++) {
          initialRounds.push({
            roundNumber: i,
            fighter1Score: 10,
            fighter2Score: 9,
            swingRound: false,
            notes: ""
          });
        }
        setRounds(initialRounds);
      }
    }
  }, [fight, existingScorecard]);

  const handleRoundChange = (roundNumber, field, value) => {
    setRounds(prevRounds => 
      prevRounds.map(round => 
        round.roundNumber === roundNumber 
          ? { ...round, [field]: value } 
          : round
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!session) {
      setError("You must be signed in to create a scorecard");
      return;
    }

    if (rounds.length === 0) {
      setError("You must score at least one round");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const formData = {
        fightId: fight.id,
        notes,
        public: isPublic,
        rounds
      };

      const endpoint = existingScorecard 
        ? `/api/scorecards/${existingScorecard.id}` 
        : "/api/scorecards";
      
      const method = existingScorecard ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || "Failed to save scorecard");
      }

      setSuccess("Scorecard saved successfully!");
      
      // Redirect to the scorecard view page after a brief delay
      setTimeout(() => {
        router.push(`/fight/${fight.id}`);
        router.refresh();
      }, 1500);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!fight || !fight.fighter1?.name || !fight.fighter2?.name) {
    return <div className="p-4 bg-gray-50 rounded-lg">Loading fight data...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-black text-white p-4">
        <h2 className="text-xl font-bold text-center uppercase tracking-wider mb-2">
          {existingScorecard ? "Edit Scorecard" : "Create Scorecard"}
        </h2>
        
        <div className="text-center mb-1">
          <h3 className="font-bold tracking-wider uppercase">
            {fight.fighter1.name} vs {fight.fighter2.name}
          </h3>
          <p className="text-sm text-gray-400">{fight.eventName} • {new Date(fight.date).toLocaleDateString()}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-5">
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4 px-2">Round-by-Round Scoring</h3>
          
          <div className="rounded-lg overflow-hidden border border-gray-200">
            <div className="grid grid-cols-7 gap-0 font-semibold bg-gray-800 text-white">
              <div className="col-span-1 py-2 px-3 text-center border-r border-gray-700">RD</div>
              <div className="col-span-2 py-2 px-3 text-center border-r border-gray-700">{fight.fighter1.name}</div>
              <div className="col-span-2 py-2 px-3 text-center border-r border-gray-700">{fight.fighter2.name}</div>
              <div className="col-span-1 py-2 px-3 text-center border-r border-gray-700">Swing</div>
              <div className="col-span-1 py-2 px-3 text-center">Notes</div>
            </div>
            
            {rounds.map((round, index) => (
              <div 
                key={round.roundNumber} 
                className={`grid grid-cols-7 gap-0 border-b items-center ${
                  round.swingRound 
                    ? 'bg-purple-50' 
                    : (index % 2 === 0 ? 'bg-white' : 'bg-gray-50')
                }`}
              >
                <div className="col-span-1 p-3 text-center font-semibold border-r">{round.roundNumber}</div>
                
                <div className="col-span-2 p-3 text-center border-r">
                  <select
                    value={round.fighter1Score}
                    onChange={(e) => handleRoundChange(round.roundNumber, "fighter1Score", parseInt(e.target.value))}
                    className="w-20 h-10 text-center rounded-full font-medium border focus:outline-none"
                  >
                    {[10, 9, 8, 7, 6, 5].map((score) => (
                      <option key={score} value={score}>{score}</option>
                    ))}
                  </select>
                </div>
                
                <div className="col-span-2 p-3 text-center border-r">
                  <select
                    value={round.fighter2Score}
                    onChange={(e) => handleRoundChange(round.roundNumber, "fighter2Score", parseInt(e.target.value))}
                    className="w-20 h-10 text-center rounded-full font-medium border focus:outline-none"
                  >
                    {[10, 9, 8, 7, 6, 5].map((score) => (
                      <option key={score} value={score}>{score}</option>
                    ))}
                  </select>
                </div>
                
                <div className="col-span-1 p-3 text-center border-r">
                  <button 
                    type="button"
                    onClick={() => handleRoundChange(round.roundNumber, "swingRound", !round.swingRound)}
                    className={`w-8 h-8 rounded-full border focus:outline-none ${
                      round.swingRound 
                        ? 'bg-purple-600 border-purple-700 text-white' 
                        : 'bg-white border-gray-300 text-gray-400 hover:bg-gray-100'
                    }`}
                    title={round.swingRound ? "This is a swing round" : "Mark as swing round"}
                  >
                    {round.swingRound ? "✓" : ""}
                  </button>
                </div>
                
                <div className="col-span-1 p-3">
                  <input
                    type="text"
                    value={round.notes || ""}
                    onChange={(e) => handleRoundChange(round.roundNumber, "notes", e.target.value)}
                    placeholder="Notes"
                    className="w-full p-1 border rounded text-sm focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-2 text-sm text-gray-600 flex items-center px-2">
            <div className="w-3 h-3 rounded-full bg-purple-600 mr-2"></div>
            <span>Swing rounds are rounds that could have gone either way</span>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 font-semibold mb-2 px-2">Scorecard Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-3 border rounded-lg focus:outline-none"
            rows="3"
            placeholder="Add your overall thoughts about the fight..."
          />
        </div>

        <div className="mb-6 p-4 bg-gray-100 rounded-lg">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="mr-2 h-5 w-5 rounded"
            />
            <span className="font-medium">Make this scorecard public</span>
          </label>
          <p className="text-gray-500 text-sm mt-1 ml-7">
            Public scorecards can be viewed by anyone. Private scorecards are only visible to you.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-lg border border-green-200">
            {success}
          </div>
        )}

        <div className="flex justify-between mt-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 bg-gray-200 text-gray-800 rounded-full font-medium hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-6 py-2.5 bg-black text-white rounded-full font-medium shadow-sm ${
              isSubmitting ? "opacity-70 cursor-not-allowed" : "hover:bg-gray-800 transition-all"
            }`}
          >
            {isSubmitting 
              ? "Saving..." 
              : existingScorecard 
                ? "Update Scorecard" 
                : "Submit Scorecard"
            }
          </button>
        </div>
      </form>
    </div>
  );
}