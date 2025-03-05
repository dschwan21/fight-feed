'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import SearchBar from '../components/SearchBar';

export default function FightersPage() {
  const [fighters, setFighters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 24, total: 0, totalPages: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [weightClassFilter, setWeightClassFilter] = useState('');
  
  const commonWeightClasses = [
    'Heavyweight',
    'Cruiserweight',
    'Light Heavyweight',
    'Super Middleweight',
    'Middleweight',
    'Welterweight',
    'Lightweight',
    'Featherweight',
    'Bantamweight',
    'Flyweight'
  ];

  useEffect(() => {
    fetchFighters();
  }, [pagination.page, searchTerm, weightClassFilter]);

  const fetchFighters = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: pagination.page,
        pageSize: pagination.pageSize
      });
      
      if (searchTerm) {
        queryParams.append('search', searchTerm);
      }
      
      if (weightClassFilter) {
        queryParams.append('weightClass', weightClassFilter);
      }
      
      const response = await fetch(`/api/fighters?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch fighters: ${response.status}`);
      }
      
      const data = await response.json();
      setFighters(data.fighters || []);
      setPagination(data.pagination || pagination);
    } catch (err) {
      console.error('Error fetching fighters:', err);
      setError('Failed to load fighters. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // Reset to page 1 when searching
    setPagination({ ...pagination, page: 1 });
  };

  const handleWeightClassFilter = (weightClass) => {
    setWeightClassFilter(weightClass === weightClassFilter ? '' : weightClass);
    // Reset to page 1 when filtering
    setPagination({ ...pagination, page: 1 });
  };

  const handlePagination = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination({ ...pagination, page: newPage });
    }
  };

  return (
    <div className="container mx-auto px-4 py-20">
      <h1 className="text-3xl font-bold mb-6">Fighters</h1>
      
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Search Bar */}
          <div className="md:w-1/2">
            <form onSubmit={handleSearch}>
              <SearchBar 
                placeholder="Search fighters by name..."
                onSearch={(result) => {
                  if (result && result.type === 'fighter') {
                    window.location.href = `/fighter/${result.id}`;
                  }
                }}
              />
            </form>
          </div>
          
          {/* Weight Class Filter */}
          <div className="md:w-1/2">
            <div className="flex flex-wrap gap-2">
              {commonWeightClasses.map(weightClass => (
                <button
                  key={weightClass}
                  onClick={() => handleWeightClassFilter(weightClass)}
                  className={`px-3 py-1 text-sm rounded-full ${
                    weightClassFilter === weightClass 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {weightClass}
                </button>
              ))}
              {weightClassFilter && (
                <button
                  onClick={() => setWeightClassFilter('')}
                  className="px-3 py-1 text-sm rounded-full bg-red-100 text-red-700 hover:bg-red-200"
                >
                  Clear Filter
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 rounded-full border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p>{error}</p>
        </div>
      ) : (
        <>
          {fighters.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xl text-gray-600">No fighters found</p>
              <p className="text-gray-500 mt-2">Try a different search term or filter</p>
            </div>
          ) : (
            <>
              {/* Fighters Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                {fighters.map(fighter => (
                  <Link 
                    key={fighter.id} 
                    href={`/fighter/${fighter.id}`}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition duration-200"
                  >
                    <div className="h-48 bg-gray-200 relative">
                      {fighter.imageUrl ? (
                        <img 
                          src={fighter.imageUrl} 
                          alt={fighter.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/images/default-fighter.png';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-300">
                          <span className="text-4xl font-bold text-gray-500">
                            {fighter.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h2 className="font-bold text-lg truncate">{fighter.name}</h2>
                      <div className="mt-1 text-sm text-gray-600">
                        {fighter.weightClass && (
                          <p>{fighter.weightClass}</p>
                        )}
                        {fighter.record && (
                          <p className="mt-1">Record: {fighter.record}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              
              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 mt-8">
                  <button
                    onClick={() => handlePagination(1)}
                    disabled={pagination.page === 1}
                    className={`px-3 py-1 rounded ${
                      pagination.page === 1 
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    &laquo;
                  </button>
                  <button
                    onClick={() => handlePagination(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className={`px-3 py-1 rounded ${
                      pagination.page === 1 
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    &lsaquo;
                  </button>
                  
                  <span className="px-3 py-1">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  
                  <button
                    onClick={() => handlePagination(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className={`px-3 py-1 rounded ${
                      pagination.page === pagination.totalPages 
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    &rsaquo;
                  </button>
                  <button
                    onClick={() => handlePagination(pagination.totalPages)}
                    disabled={pagination.page === pagination.totalPages}
                    className={`px-3 py-1 rounded ${
                      pagination.page === pagination.totalPages 
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    &raquo;
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}