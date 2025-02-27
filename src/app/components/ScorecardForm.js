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
    return <div className="p-4 bg-cream rounded-lg border border-gray-300 font-serif">Loading fight data...</div>;
  }

  return (
    <div className="bg-cream rounded-lg shadow-md overflow-hidden border border-gray-300 my-6">
      <div className="p-4 bg-cream">
        <h2 className="text-xl font-bold text-center uppercase tracking-wider mb-4 font-serif">
          {existingScorecard ? "Edit Scorecard" : "Create Scorecard"}
        </h2>
        
        <div className="text-center mb-3">
          <h3 className="font-bold tracking-wider uppercase font-serif">
            {fight.fighter1.name} vs {fight.fighter2.name}
          </h3>
          <p className="text-sm text-gray-600 font-serif">{fight.eventName} • {new Date(fight.date).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Boxers Header Cards */}
      <div className="flex">
        {/* Fighter 1 Header - Blue Side */}
        <div className="w-1/2 border-r border-gray-300">
          <div className="text-center p-2 bg-blue-800 text-white border-b border-gray-300 font-serif">
            <h3 className="font-bold">{fight.fighter1.name}</h3>
          </div>
          <div className="bg-blue-700 h-32 flex items-center justify-center">
            {fight.fighter1.imageUrl ? (
              <img 
                src={fight.fighter1.imageUrl} 
                alt={fight.fighter1.name}
                className="h-full object-cover"
              />
            ) : (
              <div className="text-white font-bold text-2xl font-serif">Blue Corner</div>
            )}
          </div>
        </div>
        
        {/* Fighter 2 Header - Red Side */}
        <div className="w-1/2">
          <div className="text-center p-2 bg-red-800 text-white border-b border-gray-300 font-serif">
            <h3 className="font-bold">{fight.fighter2.name}</h3>
          </div>
          <div className="bg-red-700 h-32 flex items-center justify-center">
            {fight.fighter2.imageUrl ? (
              <img 
                src={fight.fighter2.imageUrl} 
                alt={fight.fighter2.name}
                className="h-full object-cover"
              />
            ) : (
              <div className="text-white font-bold text-2xl font-serif">Red Corner</div>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-5 bg-cream">
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4 px-2 font-serif">Round-by-Round Scoring</h3>
          
          <div className="rounded-lg overflow-hidden border border-gray-300">
            <div className="grid grid-cols-11 gap-0 font-semibold">
              <div className="col-span-5 py-2 px-3 text-center border-r border-gray-300 bg-blue-800 text-white font-serif">{fight.fighter1.name}</div>
              <div className="col-span-1 py-2 px-3 text-center border-r border-gray-300 bg-gray-200 font-serif">RD</div>
              <div className="col-span-5 py-2 px-3 text-center bg-red-800 text-white font-serif">{fight.fighter2.name}</div>
            </div>
            
            {rounds.map((round, index) => (
              <div 
                key={round.roundNumber} 
                className={`grid grid-cols-11 gap-0 border-b items-center ${
                  index % 2 === 0 ? 'bg-cream' : 'bg-gray-50'
                }`}
              >
                {/* Fighter 1 Score */}
                <div className="col-span-5 p-3 text-center border-r border-gray-300">
                  <select
                    value={round.fighter1Score}
                    onChange={(e) => handleRoundChange(round.roundNumber, "fighter1Score", parseInt(e.target.value))}
                    className="w-20 h-10 text-center rounded-md font-medium border border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-300 focus:outline-none text-blue-800 font-serif font-bold"
                  >
                    {[10, 9, 8, 7, 6, 5].map((score) => (
                      <option key={score} value={score}>{score}</option>
                    ))}
                  </select>
                </div>
                
                {/* Round Number and Swing Toggle */}
                <div className="col-span-1 p-3 text-center border-r border-gray-300 flex flex-col items-center">
                  <div className="font-semibold font-serif mb-1">
                    {round.roundNumber.toString().padStart(2, '0')}
                  </div>
                  <button 
                    type="button"
                    onClick={() => handleRoundChange(round.roundNumber, "swingRound", !round.swingRound)}
                    className={`w-6 h-6 rounded-full border focus:outline-none ${
                      round.swingRound 
                        ? 'bg-purple-600 border-purple-700 text-white' 
                        : 'bg-white border-gray-300 text-gray-400 hover:bg-gray-100'
                    }`}
                    title={round.swingRound ? "This is a swing round" : "Mark as swing round"}
                  >
                    {round.swingRound ? "✓" : ""}
                  </button>
                </div>
                
                {/* Fighter 2 Score */}
                <div className="col-span-5 p-3 text-center">
                  <select
                    value={round.fighter2Score}
                    onChange={(e) => handleRoundChange(round.roundNumber, "fighter2Score", parseInt(e.target.value))}
                    className="w-20 h-10 text-center rounded-md font-medium border border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-300 focus:outline-none text-red-800 font-serif font-bold"
                  >
                    {[10, 9, 8, 7, 6, 5].map((score) => (
                      <option key={score} value={score}>{score}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="col-span-3 md:col-span-2">
              <div className="text-sm text-gray-600 flex items-center">
                <div className="w-3 h-3 rounded-full bg-purple-600 mr-2"></div>
                <span className="font-serif">Swing rounds are rounds that could have gone either way</span>
              </div>
            </div>
            <div className="col-span-3 md:col-span-1">
              <label className="flex items-center justify-end">
                <span className="mr-2 text-sm font-serif text-gray-600">Round Notes:</span>
                <select 
                  onChange={(e) => {
                    const roundNumber = parseInt(e.target.value);
                    if (roundNumber) {
                      const noteInput = document.getElementById(`round-note-${roundNumber}`);
                      if (noteInput) noteInput.focus();
                    }
                  }}
                  className="border rounded p-1 text-sm font-serif"
                  defaultValue=""
                >
                  <option value="" disabled>Select Round</option>
                  {rounds.map(round => (
                    <option key={round.roundNumber} value={round.roundNumber}>Round {round.roundNumber}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* Round Notes Section */}
          <div className="mt-2 space-y-2">
            {rounds.map((round) => (
              <div key={`note-${round.roundNumber}`} className="rounded-lg border border-gray-200 p-2 bg-white">
                <label className="flex items-center mb-1 font-serif text-sm font-semibold">
                  <span>Round {round.roundNumber} Notes:</span>
                </label>
                <input
                  id={`round-note-${round.roundNumber}`}
                  type="text"
                  value={round.notes || ""}
                  onChange={(e) => handleRoundChange(round.roundNumber, "notes", e.target.value)}
                  placeholder={`Notes for round ${round.roundNumber}...`}
                  className="w-full p-2 border rounded text-sm focus:outline-none font-serif"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 font-semibold mb-2 px-2 font-serif">Scorecard Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-3 border rounded-lg focus:outline-none font-serif bg-white"
            rows="3"
            placeholder="Add your overall thoughts about the fight..."
          />
        </div>

        <div className="mb-6 p-4 bg-gray-100 rounded-lg border border-gray-300">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="mr-2 h-5 w-5 rounded"
            />
            <span className="font-medium font-serif">Make this scorecard public</span>
          </label>
          <p className="text-gray-500 text-sm mt-1 ml-7 font-serif">
            Public scorecards can be viewed by anyone. Private scorecards are only visible to you.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg border border-red-200 font-serif">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-lg border border-green-200 font-serif">
            {success}
          </div>
        )}

        <div className="flex justify-between mt-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 bg-gray-200 text-gray-800 rounded-md font-medium hover:bg-gray-300 transition-colors font-serif"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-6 py-2.5 bg-blue-800 text-white rounded-md font-medium ${
              isSubmitting ? "opacity-70 cursor-not-allowed" : "hover:bg-blue-700 transition-all"
            } font-serif`}
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