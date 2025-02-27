"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function NewFightPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Fighter 1 form fields
  const [fighter1, setFighter1] = useState({
    name: "",
    nickname: "",
    nationality: "",
    record: "",
    weightClass: "",
    imageUrl: ""
  });
  
  // Fighter 2 form fields
  const [fighter2, setFighter2] = useState({
    name: "",
    nickname: "",
    nationality: "",
    record: "",
    weightClass: "",
    imageUrl: ""
  });
  
  // Fight details form fields
  const [fightDetails, setFightDetails] = useState({
    eventName: "",
    date: new Date().toISOString().split("T")[0], // Current date in YYYY-MM-DD format
    venue: "",
    location: "",
    weightClass: "",
    numberOfRounds: 3
  });
  
  // Handle fighter field changes
  const handleFighterChange = (fighter, field, value) => {
    if (fighter === 1) {
      setFighter1(prev => ({ ...prev, [field]: value }));
    } else {
      setFighter2(prev => ({ ...prev, [field]: value }));
    }
  };
  
  // Handle fight details field changes
  const handleFightDetailsChange = (field, value) => {
    setFightDetails(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (status !== "authenticated") {
      setError("You must be signed in to create a fight");
      return;
    }
    
    // Validation
    if (!fighter1.name || !fighter2.name || !fightDetails.eventName || !fightDetails.date || !fightDetails.numberOfRounds) {
      setError("Please fill in all required fields");
      return;
    }
    
    setIsSubmitting(true);
    setError("");
    setSuccess("");
    
    try {
      const response = await fetch("/api/fights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fighter1,
          fighter2,
          ...fightDetails,
          numberOfRounds: parseInt(fightDetails.numberOfRounds)
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.details || "Failed to create fight");
      }
      
      setSuccess("Fight created successfully!");
      
      // Redirect to the fight page after a brief delay
      setTimeout(() => {
        router.push(`/fight/${data.id}`);
        router.refresh();
      }, 1500);
      
    } catch (error) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // If not logged in, show a message
  if (status === "unauthenticated") {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="bg-white p-8 rounded-custom shadow-md text-center">
          <h1 className="text-3xl font-bold mb-4">Sign In Required</h1>
          <p className="text-gray-600 mb-6">You need to be signed in to create a new fight.</p>
          <Link 
            href="/api/auth/signin"
            className="px-6 py-3 bg-primary text-white font-semibold rounded-custom hover:bg-opacity-90 transition"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Add New Fight</h1>
      
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-custom shadow-md">
        {/* Fighter 1 Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 text-primary">Fighter 1</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-1 font-semibold">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={fighter1.name}
                onChange={(e) => handleFighterChange(1, "name", e.target.value)}
                placeholder="e.g. Jon Jones"
                className="w-full p-2 border rounded-md"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-700 mb-1 font-semibold">
                Nickname
              </label>
              <input
                type="text"
                value={fighter1.nickname}
                onChange={(e) => handleFighterChange(1, "nickname", e.target.value)}
                placeholder="e.g. Bones"
                className="w-full p-2 border rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 mb-1 font-semibold">
                Nationality
              </label>
              <input
                type="text"
                value={fighter1.nationality}
                onChange={(e) => handleFighterChange(1, "nationality", e.target.value)}
                placeholder="e.g. USA"
                className="w-full p-2 border rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 mb-1 font-semibold">
                Record
              </label>
              <input
                type="text"
                value={fighter1.record}
                onChange={(e) => handleFighterChange(1, "record", e.target.value)}
                placeholder="e.g. 27-1-0"
                className="w-full p-2 border rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 mb-1 font-semibold">
                Weight Class
              </label>
              <input
                type="text"
                value={fighter1.weightClass}
                onChange={(e) => handleFighterChange(1, "weightClass", e.target.value)}
                placeholder="e.g. Heavyweight"
                className="w-full p-2 border rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 mb-1 font-semibold">
                Image URL
              </label>
              <input
                type="text"
                value={fighter1.imageUrl}
                onChange={(e) => handleFighterChange(1, "imageUrl", e.target.value)}
                placeholder="https://..."
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>
        </div>
        
        {/* Fighter 2 Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 text-secondary">Fighter 2</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-1 font-semibold">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={fighter2.name}
                onChange={(e) => handleFighterChange(2, "name", e.target.value)}
                placeholder="e.g. Francis Ngannou"
                className="w-full p-2 border rounded-md"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-700 mb-1 font-semibold">
                Nickname
              </label>
              <input
                type="text"
                value={fighter2.nickname}
                onChange={(e) => handleFighterChange(2, "nickname", e.target.value)}
                placeholder="e.g. The Predator"
                className="w-full p-2 border rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 mb-1 font-semibold">
                Nationality
              </label>
              <input
                type="text"
                value={fighter2.nationality}
                onChange={(e) => handleFighterChange(2, "nationality", e.target.value)}
                placeholder="e.g. Cameroon"
                className="w-full p-2 border rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 mb-1 font-semibold">
                Record
              </label>
              <input
                type="text"
                value={fighter2.record}
                onChange={(e) => handleFighterChange(2, "record", e.target.value)}
                placeholder="e.g. 17-3-0"
                className="w-full p-2 border rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 mb-1 font-semibold">
                Weight Class
              </label>
              <input
                type="text"
                value={fighter2.weightClass}
                onChange={(e) => handleFighterChange(2, "weightClass", e.target.value)}
                placeholder="e.g. Heavyweight"
                className="w-full p-2 border rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 mb-1 font-semibold">
                Image URL
              </label>
              <input
                type="text"
                value={fighter2.imageUrl}
                onChange={(e) => handleFighterChange(2, "imageUrl", e.target.value)}
                placeholder="https://..."
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>
        </div>
        
        {/* Fight Details Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Fight Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-1 font-semibold">
                Event Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={fightDetails.eventName}
                onChange={(e) => handleFightDetailsChange("eventName", e.target.value)}
                placeholder="e.g. UFC 285"
                className="w-full p-2 border rounded-md"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-700 mb-1 font-semibold">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={fightDetails.date}
                onChange={(e) => handleFightDetailsChange("date", e.target.value)}
                className="w-full p-2 border rounded-md"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-700 mb-1 font-semibold">
                Venue
              </label>
              <input
                type="text"
                value={fightDetails.venue}
                onChange={(e) => handleFightDetailsChange("venue", e.target.value)}
                placeholder="e.g. T-Mobile Arena"
                className="w-full p-2 border rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 mb-1 font-semibold">
                Location
              </label>
              <input
                type="text"
                value={fightDetails.location}
                onChange={(e) => handleFightDetailsChange("location", e.target.value)}
                placeholder="e.g. Las Vegas, NV"
                className="w-full p-2 border rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 mb-1 font-semibold">
                Weight Class
              </label>
              <input
                type="text"
                value={fightDetails.weightClass}
                onChange={(e) => handleFightDetailsChange("weightClass", e.target.value)}
                placeholder="e.g. Heavyweight"
                className="w-full p-2 border rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 mb-1 font-semibold">
                Number of Rounds <span className="text-red-500">*</span>
              </label>
              <select
                value={fightDetails.numberOfRounds}
                onChange={(e) => handleFightDetailsChange("numberOfRounds", e.target.value)}
                className="w-full p-2 border rounded-md"
                required
              >
                <option value="3">3</option>
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="12">12</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Error and Success Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
            {success}
          </div>
        )}
        
        {/* Submit Button */}
        <div className="flex justify-between">
          <Link
            href="/"
            className="px-4 py-2 bg-gray-200 rounded-custom font-semibold hover:bg-gray-300 transition"
          >
            Cancel
          </Link>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-6 py-2 bg-primary text-white rounded-custom font-semibold ${
              isSubmitting ? "opacity-70 cursor-not-allowed" : "hover:bg-opacity-90"
            } transition`}
          >
            {isSubmitting ? "Creating..." : "Create Fight"}
          </button>
        </div>
      </form>
    </div>
  );
}