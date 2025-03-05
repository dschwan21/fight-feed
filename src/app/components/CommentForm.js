"use client";

import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function CommentForm({ 
  scorecardId, 
  parentId = null, 
  onCommentAdded, 
  isReply = false 
}) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { data: session } = useSession();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!content.trim()) return;
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const endpoint = parentId 
        ? `/api/comments/${parentId}/replies` 
        : '/api/comments';
      
      const payload = parentId
        ? { content }
        : { content, scorecardId };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to post comment');
      }
      
      const newComment = await response.json();
      onCommentAdded(newComment);
      setContent('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!session) return null;
  
  return (
    <form onSubmit={handleSubmit} className={isReply ? "mb-2" : "mb-4"}>
      <div className="flex items-start">
        {session.user.image ? (
          <img 
            src={session.user.image} 
            alt={session.user.name || 'User'} 
            className="w-9 h-9 rounded-full mr-3 border-2 border-white shadow-sm hidden sm:block"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 mr-3 flex items-center justify-center shadow-sm hidden sm:block">
            <span className="text-white font-semibold text-sm">
              {(session.user.name || 'U').charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        
        <div className="flex-1">
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={isReply ? "Write a reply..." : "Write a comment..."}
              className={`w-full p-3 pr-16 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-300 text-gray-700 placeholder-gray-400 text-sm transition duration-200 ease-in-out shadow-sm ${isReply ? 'bg-gray-50' : 'bg-white'}`}
              rows={isReply ? 2 : 3}
              required
            />
            
            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className={`absolute right-2 bottom-2 rounded-md p-1.5 ${
                isSubmitting || !content.trim() 
                  ? 'text-gray-300 cursor-not-allowed' 
                  : 'text-blue-600 hover:text-white hover:bg-blue-600'
              } transition-colors duration-200`}
              title={isReply ? "Post reply" : "Post comment"}
            >
              {isSubmitting ? (
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              )}
            </button>
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-600 text-xs p-2 mt-1 rounded">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}