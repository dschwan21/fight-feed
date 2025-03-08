'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import SearchBar from '../components/SearchBar';
import TabNavigation from '../components/TabNavigation';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [activeTab, setActiveTab] = useState('all');
  const [results, setResults] = useState({ fighters: [], users: [] });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (query) {
      performSearch();
    }
  }, [query, activeTab]);

  const performSearch = async () => {
    if (!query) return;
    
    setIsLoading(true);
    try {
      // Use the unified search endpoint
      const searchRes = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      
      if (!searchRes.ok) {
        throw new Error(`Search request failed with status ${searchRes.status}`);
      }
      
      const searchData = await searchRes.json();
      
      setResults({
        fighters: searchData.fighters || [],
        users: searchData.users || []
      });
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'all', label: 'All', count: results.fighters.length + results.users.length },
    { id: 'fighters', label: 'Fighters', count: results.fighters.length },
    { id: 'users', label: 'Users', count: results.users.length },
  ];

  const getFilteredResults = () => {
    if (activeTab === 'fighters') return { fighters: results.fighters, users: [] };
    if (activeTab === 'users') return { fighters: [], users: results.users };
    return results;
  };

  const filteredResults = getFilteredResults();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Search Results for "{query}"</h1>
      
      <div className="mb-6">
        <SearchBar 
          placeholder="Search fighters and users..."
          className="max-w-xl"
        />
      </div>
      
      <TabNavigation 
        tabs={tabs} 
        activeTab={activeTab} 
        onChange={setActiveTab}
        className="mb-6"
      />
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
        </div>
      ) : (
        <div>
          {/* Fighters Results */}
          {(activeTab === 'all' || activeTab === 'fighters') && filteredResults.fighters.length > 0 && (
            <div className="mb-8">
              {activeTab === 'all' && <h2 className="text-xl font-semibold mb-4">Fighters</h2>}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredResults.fighters.map(fighter => (
                  <Link 
                    key={fighter.id} 
                    href={`/fighter/${fighter.id}`}
                    className="block bg-white p-4 rounded-lg shadow hover:shadow-md transition"
                  >
                    <div className="flex items-center">
                      <div className="w-16 h-16 rounded-full overflow-hidden mr-4">
                        {fighter.imageUrl ? (
                          <img 
                            src={fighter.imageUrl} 
                            alt={fighter.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                              e.target.parentNode.classList.add('flex', 'items-center', 'justify-center', 'bg-gray-300');
                              
                              // Create and append the initial letter element
                              const initialEl = document.createElement('span');
                              initialEl.className = 'text-md font-bold text-gray-500';
                              initialEl.textContent = fighter.name.charAt(0).toUpperCase();
                              e.target.parentNode.appendChild(initialEl);
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-300">
                            <span className="text-md font-bold text-gray-500">
                              {fighter.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{fighter.name}</h3>
                        <div className="text-sm text-gray-500 mt-1">
                          {fighter.weightClass && <span className="mr-2">{fighter.weightClass}</span>}
                          {fighter.record && <span className="mr-2">{fighter.record}</span>}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
          
          {/* Users Results */}
          {(activeTab === 'all' || activeTab === 'users') && filteredResults.users.length > 0 && (
            <div>
              {activeTab === 'all' && <h2 className="text-xl font-semibold mb-4">Users</h2>}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredResults.users.map(user => (
                  <Link 
                    key={user.id} 
                    href={`/profile/${user.id}`}
                    className="block bg-white p-4 rounded-lg shadow hover:shadow-md transition"
                  >
                    <div className="flex items-center">
                      <div className="w-16 h-16 rounded-full overflow-hidden mr-4">
                        {user.avatarUrl ? (
                          <img 
                            src={user.avatarUrl} 
                            alt={user.username}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                              e.target.parentNode.classList.add('flex', 'items-center', 'justify-center', 'bg-gray-200');
                              
                              // Create and append the initial letter element
                              const initialEl = document.createElement('span');
                              initialEl.className = 'text-md font-bold text-gray-500';
                              initialEl.textContent = user.username.charAt(0).toUpperCase();
                              e.target.parentNode.appendChild(initialEl);
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-200">
                            <span className="text-md font-bold text-gray-500">
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{user.username}</h3>
                        <div className="text-sm text-gray-500 mt-1">
                          {user.profile?.bio && (
                            <p className="line-clamp-2">{user.profile.bio}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
          
          {/* No Results */}
          {filteredResults.fighters.length === 0 && filteredResults.users.length === 0 && (
            <div className="text-center py-12">
              <p className="text-xl text-gray-600">No results found for "{query}"</p>
              <p className="text-gray-500 mt-2">Try a different search term or check your spelling</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}