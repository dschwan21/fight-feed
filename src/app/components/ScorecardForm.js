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
    if (fight) {
      // If editing an existing scorecard, use its rounds
      if (existingScorecard && existingScorecard.rounds) {
        setRounds(existingScorecard.rounds.map(round => ({
          roundNumber: round.roundNumber,
          fighter1Score: round.fighter1Score,
          fighter2Score: round.fighter2Score,
          notes: round.notes || ""
        })));
      } else {
        // If creating a new scorecard, create empty rounds based on the fight
        const initialRounds = [];
        for (let i = 1; i <= fight.numberOfRounds; i++) {
          initialRounds.push({
            roundNumber: i,
            fighter1Score: 10,
            fighter2Score: 9,
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

  if (!fight) {
    return <div>Loading fight data...</div>;
  }

  return (
    <div className="bg-white p-6 rounded-custom shadow-md">
      <h2 className="text-2xl font-bold mb-4">
        {existingScorecard ? "Edit Scorecard" : "Create Scorecard"}
      </h2>
      
      <div className="mb-6 p-4 bg-gray-50 rounded-custom">
        <h3 className="text-xl font-semibold mb-2">
          {fight.fighter1.name} vs {fight.fighter2.name}
        </h3>
        <p className="text-gray-600">{fight.eventName} • {new Date(fight.date).toLocaleDateString()}</p>
        <p className="text-gray-500">{fight.venue}, {fight.location}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Round-by-Round Scoring</h3>
          
          <div className="grid grid-cols-7 gap-2 mb-2 font-semibold bg-gray-100 p-2 rounded">
            <div className="col-span-1">Round</div>
            <div className="col-span-2">{fight.fighter1.name}</div>
            <div className="col-span-2">{fight.fighter2.name}</div>
            <div className="col-span-2">Notes (Optional)</div>
          </div>
          
          {rounds.map((round) => (
            <div key={round.roundNumber} className="grid grid-cols-7 gap-2 mb-2 items-center">
              <div className="col-span-1 font-semibold">{round.roundNumber}</div>
              
              <div className="col-span-2">
                <select
                  value={round.fighter1Score}
                  onChange={(e) => handleRoundChange(round.roundNumber, "fighter1Score", parseInt(e.target.value))}
                  className="w-full p-2 border rounded"
                >
                  {[10, 9, 8, 7, 6, 5].map((score) => (
                    <option key={score} value={score}>{score}</option>
                  ))}
                </select>
              </div>
              
              <div className="col-span-2">
                <select
                  value={round.fighter2Score}
                  onChange={(e) => handleRoundChange(round.roundNumber, "fighter2Score", parseInt(e.target.value))}
                  className="w-full p-2 border rounded"
                >
                  {[10, 9, 8, 7, 6, 5].map((score) => (
                    <option key={score} value={score}>{score}</option>
                  ))}
                </select>
              </div>
              
              <div className="col-span-2">
                <input
                  type="text"
                  value={round.notes || ""}
                  onChange={(e) => handleRoundChange(round.roundNumber, "notes", e.target.value)}
                  placeholder="Optional notes"
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 mb-2">Scorecard Notes (Optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-3 border rounded"
            rows="3"
            placeholder="Add your overall thoughts about the fight..."
          />
        </div>

        <div className="mb-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="mr-2"
            />
            <span>Make this scorecard public</span>
          </label>
          <p className="text-gray-500 text-sm mt-1">
            Public scorecards can be viewed by anyone. Private scorecards are only visible to you.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
            {success}
          </div>
        )}

        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-200 rounded-custom"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-6 py-2 bg-primary text-white rounded-custom ${
              isSubmitting ? "opacity-70 cursor-not-allowed" : "hover:bg-opacity-90"
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