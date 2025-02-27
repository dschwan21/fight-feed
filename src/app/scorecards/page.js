"use client";

import { useState, useEffect } from "react";
import ScorecardDisplay from "../components/ScorecardDisplay";

export default function ScorecardsPage() {
  const [scorecards, setScorecards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  
  useEffect(() => {
    fetchScorecards();
  }, [page]);
  
  async function fetchScorecards() {
    setIsLoading(true);
    setError("");
    
    try {
      const url = new URL("/api/scorecards", window.location.origin);
      url.searchParams.append("page", page);
      url.searchParams.append("limit", 5); // 5 scorecards per page
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch scorecards");
      }
      
      if (page === 1) {
        setScorecards(data.scorecards);
      } else {
        setScorecards(prev => [...prev, ...data.scorecards]);
      }
      
      setTotalPages(data.pagination.pages);
      setHasMore(page < data.pagination.pages);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }
  
  const handleLoadMore = () => {
    if (hasMore) {
      setPage(prev => prev + 1);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Community Scorecards</h1>
      
      {isLoading && page === 1 ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          <p className="mt-2 text-gray-600">Loading scorecards...</p>
        </div>
      ) : error ? (
        <div className="bg-red-100 p-4 rounded-custom text-red-700 mb-6">
          {error}
        </div>
      ) : scorecards.length === 0 ? (
        <div className="bg-white p-8 rounded-custom shadow-md text-center">
          <h2 className="text-2xl font-bold mb-4">No Scorecards Found</h2>
          <p className="text-gray-600">
            There are no public scorecards to display yet.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {scorecards.map(scorecard => (
              <ScorecardDisplay 
                key={scorecard.id} 
                scorecard={scorecard} 
                showFightDetails={true}
              />
            ))}
          </div>
          
          {isLoading && page > 1 && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              <p className="mt-2 text-gray-600">Loading more scorecards...</p>
            </div>
          )}
          
          {hasMore && !isLoading && (
            <div className="text-center mt-8">
              <button
                onClick={handleLoadMore}
                className="px-6 py-2 bg-gray-200 rounded-custom font-semibold hover:bg-gray-300 transition"
              >
                Load More
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}