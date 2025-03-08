'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// Cache for search results to reduce API calls
const searchCache = new Map();
const CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes

export default function SearchBar({ placeholder = "Search...", onSearch, className = "" }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef(null);
  const abortControllerRef = useRef(null);
  const router = useRouter();
  const lastSearchedQuery = useRef('');
  const debounceTimerRef = useRef(null);

  // Close search results when clicking outside
  useEffect(() => {
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

  // Cleanup function for aborted requests
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const performSearch = useCallback(async (searchQuery) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    
    // Don't repeat the same search
    if (lastSearchedQuery.current === searchQuery) return;
    lastSearchedQuery.current = searchQuery;
    
    // Check cache first
    const cacheKey = `search_${searchQuery}`;
    const cachedResult = searchCache.get(cacheKey);
    
    if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_EXPIRY_TIME) {
      setResults(cachedResult.data);
      setIsOpen(true);
      return;
    }
    
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;
    
    setIsLoading(true);
    try {
      // Use a single API endpoint to reduce multiple network requests
      const searchRes = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}&limit=5`,
        { signal }
      );
      
      if (!searchRes.ok) {
        throw new Error(`Search request failed with status ${searchRes.status}`);
      }
      
      const searchData = await searchRes.json();
      
      // Format the results
      const formattedResults = [
        ...(searchData.fighters || []).map(fighter => ({
          id: fighter.id,
          name: fighter.name,
          type: 'fighter',
          imageUrl: fighter.imageUrl,
          subtitle: fighter.record || fighter.weightClass
        })),
        ...(searchData.users || []).map(user => ({
          id: user.id,
          name: user.username,
          type: 'user',
          imageUrl: user.avatarUrl,
          subtitle: 'User'
        }))
      ];
      
      // Store in cache
      searchCache.set(cacheKey, {
        data: formattedResults,
        timestamp: Date.now()
      });
      
      // Clean up old cache entries
      setTimeout(() => {
        for (const [key, value] of searchCache.entries()) {
          if (Date.now() - value.timestamp > CACHE_EXPIRY_TIME) {
            searchCache.delete(key);
          }
        }
      }, 0);
      
      setResults(formattedResults);
      setIsOpen(true);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Search error:', error);
      }
    } finally {
      if (!signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  // Debounced search
  const debouncedSearch = useCallback((value) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      performSearch(value);
    }, 350); // 350ms debounce
  }, [performSearch]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    
    if (value.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    
    debouncedSearch(value);
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
            onChange={handleInputChange}
            placeholder={placeholder}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={placeholder}
          />
          {isLoading && (
            <div className="absolute right-3 top-2.5">
              <div className="animate-spin h-5 w-5 border-2 border-gray-500 rounded-full border-t-transparent" 
                   aria-hidden="true"></div>
            </div>
          )}
        </div>
      </form>
      
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white shadow-lg rounded-lg max-h-96 overflow-y-auto">
          <ul className="py-1" role="listbox">
            {results.map((result) => (
              <li 
                key={`${result.type}-${result.id}`}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                onClick={() => handleResultClick(result)}
                role="option"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden mr-3 flex-shrink-0">
                  {result.imageUrl ? (
                    <img 
                      src={result.imageUrl} 
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        e.target.parentNode.classList.add('flex', 'items-center', 'justify-center');
                        e.target.parentNode.classList.add(result.type === 'fighter' ? 'bg-gray-300' : 'bg-gray-200');
                        
                        // Create and append the initial letter element
                        const initialEl = document.createElement('span');
                        initialEl.className = 'text-gray-500 font-bold';
                        initialEl.textContent = result.name.charAt(0).toUpperCase();
                        e.target.parentNode.appendChild(initialEl);
                      }}
                      loading="lazy"
                    />
                  ) : (
                    <div className={`w-full h-full ${result.type === 'fighter' ? 'bg-gray-300' : 'bg-gray-200'} flex items-center justify-center`}>
                      <span className="text-gray-500 font-bold">
                        {result.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{result.name}</div>
                  <div className="text-sm text-gray-500 truncate">
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
              type="button"
            >
              View all results for "{query}"
            </button>
          </div>
        </div>
      )}
    </div>
  );
}