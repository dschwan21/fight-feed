"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import FightCard from "../components/FightCard";

export default function FightsPage() {
  const [fights, setFights] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  
  useEffect(() => {
    fetchFights();
  }, [page, query]);
  
  async function fetchFights() {
    setIsLoading(true);
    setError("");
    
    try {
      const url = new URL("/api/fights", window.location.origin);
      url.searchParams.append("page", page);
      url.searchParams.append("limit", 9); // 9 fights per page (3x3 grid)
      
      if (query) {
        url.searchParams.append("query", query);
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch fights");
      }
      
      setFights(data.fights);
      setTotalPages(data.pagination.pages);
      setHasMore(page < data.pagination.pages);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }
  
  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1); // Reset to first page on new search
  };
  
  const handleLoadMore = () => {
    if (hasMore) {
      setPage(prev => prev + 1);
    }
  };
  
  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <h1 className="text-3xl font-bold mb-4 sm:mb-0">Fights</h1>
        
        <div className="flex w-full sm:w-auto">
          <form onSubmit={handleSearch} className="flex w-full sm:w-auto">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search fights or fighters..."
              className="p-2 border rounded-l-custom w-full sm:w-64"
            />
            <button 
              type="submit"
              className="bg-primary text-white px-4 py-2 rounded-r-custom font-semibold"
            >
              Search
            </button>
          </form>
          
          <Link
            href="/fights/new"
            className="ml-4 bg-secondary text-white px-4 py-2 rounded-custom font-semibold hidden sm:block"
          >
            Add Fight
          </Link>
        </div>
      </div>
      
      <Link
        href="/fights/new"
        className="block mb-6 w-full bg-secondary text-white px-4 py-2 text-center rounded-custom font-semibold sm:hidden"
      >
        Add New Fight
      </Link>
      
      {isLoading && page === 1 ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          <p className="mt-2 text-gray-600">Loading fights...</p>
        </div>
      ) : error ? (
        <div className="bg-red-100 p-4 rounded-custom text-red-700 mb-6">
          {error}
        </div>
      ) : fights.length === 0 ? (
        <div className="bg-white p-8 rounded-custom shadow-md text-center">
          <h2 className="text-2xl font-bold mb-4">No Fights Found</h2>
          <p className="text-gray-600 mb-6">
            {query 
              ? `No fights match your search for "${query}"`
              : "No fights have been added yet."}
          </p>
          <Link
            href="/fights/new"
            className="px-6 py-3 bg-primary text-white font-semibold rounded-custom hover:bg-opacity-90 transition"
          >
            Add a New Fight
          </Link>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fights.map(fight => (
              <FightCard key={fight.id} fight={fight} />
            ))}
          </div>
          
          {isLoading && page > 1 && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              <p className="mt-2 text-gray-600">Loading more fights...</p>
            </div>
          )}
          
          {page < totalPages && !isLoading && (
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