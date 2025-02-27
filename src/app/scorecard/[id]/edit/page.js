"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import ScorecardForm from "@/app/components/ScorecardForm";
import Link from "next/link";

export default function EditScorecardPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const [scorecard, setScorecard] = useState(null);
  const [fight, setFight] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  
  useEffect(() => {
    if (status === "loading") return;
    
    // Redirect if not logged in
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
      return;
    }
    
    fetchScorecard();
  }, [id, status]);
  
  async function fetchScorecard() {
    setIsLoading(true);
    setError("");
    
    try {
      const response = await fetch(`/api/scorecards/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Scorecard not found");
        } else if (response.status === 403) {
          throw new Error("You do not have permission to edit this scorecard");
        } else {
          const data = await response.json();
          throw new Error(data.error || "Failed to fetch scorecard");
        }
      }
      
      const scorecard = await response.json();
      
      // Check if user is authorized to edit this scorecard
      if (session?.user?.id !== scorecard.userId) {
        throw new Error("You do not have permission to edit this scorecard");
      }
      
      setScorecard(scorecard);
      setFight(scorecard.fight);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }
  
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-4"></div>
        <p className="text-gray-600">Loading scorecard...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-red-100 p-6 rounded-custom text-red-700 mb-6">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error}</p>
        </div>
        <div className="mt-4">
          <Link href="/scorecards" className="text-primary hover:underline">
            ← Back to Scorecards
          </Link>
        </div>
      </div>
    );
  }
  
  if (!scorecard || !fight) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-red-100 p-6 rounded-custom text-red-700 mb-6">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>Scorecard not found</p>
        </div>
        <div className="mt-4">
          <Link href="/scorecards" className="text-primary hover:underline">
            ← Back to Scorecards
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Edit Scorecard</h1>
      
      <ScorecardForm fight={fight} existingScorecard={scorecard} />
    </div>
  );
}