'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function SearchBar({ placeholder = "Search...", onSearch, className = "" }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    // Close search results when clicking outside
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.length >= 2) {
        performSearch();
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const performSearch = async () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    try {
      // Fetch fighters
      const fightersRes = await fetch(`/api/fighters?search=${encodeURIComponent(query)}&pageSize=5`);
      const fightersData = await fightersRes.json();
      
      // Fetch users
      const usersRes = await fetch(`/api/users?search=${encodeURIComponent(query)}&pageSize=5`);
      const usersData = await usersRes.json();
      
      // Combine and format results
      const combinedResults = [
        ...fightersData.fighters.map(fighter => ({
          id: fighter.id,
          name: fighter.name,
          type: 'fighter',
          imageUrl: fighter.imageUrl,
          subtitle: fighter.record || fighter.weightClass
        })),
        ...usersData.users.map(user => ({
          id: user.id,
          name: user.username,
          type: 'user',
          imageUrl: user.avatarUrl,
          subtitle: 'User'
        }))
      ];
      
      setResults(combinedResults);
      setIsOpen(true);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResultClick = (result) => {
    setIsOpen(false);
    setQuery('');
    
    if (result.type === 'fighter') {
      router.push(`/fighter/${result.id}`);
    } else if (result.type === 'user') {
      router.push(`/profile/${result.id}`);
    }
    
    if (onSearch) {
      onSearch(result);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={searchRef}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {isLoading && (
            <div className="absolute right-3 top-2.5">
              <div className="animate-spin h-5 w-5 border-2 border-gray-500 rounded-full border-t-transparent"></div>
            </div>
          )}
        </div>
      </form>
      
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white shadow-lg rounded-lg max-h-96 overflow-y-auto">
          <ul className="py-1">
            {results.map((result) => (
              <li 
                key={`${result.type}-${result.id}`}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                onClick={() => handleResultClick(result)}
              >
                {result.imageUrl ? (
                  <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                    <img 
                      src={result.imageUrl} 
                      alt={result.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = result.type === 'fighter' 
                          ? '/images/default-fighter.png' 
                          : '/images/default-avatar.png';
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 mr-3 flex items-center justify-center">
                    <span className="text-gray-500 font-bold">
                      {result.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <div className="font-medium">{result.name}</div>
                  <div className="text-sm text-gray-500">
                    {result.type === 'fighter' ? '👊 Fighter' : '👤 User'} • {result.subtitle}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          
          <div className="px-4 py-2 border-t border-gray-200">
            <button 
              onClick={handleSubmit}
              className="text-sm text-blue-500 hover:text-blue-700"
            >
              View all results for "{query}"
            </button>
          </div>
        </div>
      )}
    </div>
  );
}