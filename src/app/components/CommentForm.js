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
    <form onSubmit={handleSubmit} className="mb-4">
      <div className="flex items-start">
        {session.user.image ? (
          <img 
            src={session.user.image} 
            alt={session.user.name || 'User'} 
            className="w-8 h-8 rounded-full mr-3"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-300 mr-3 flex items-center justify-center">
            <span className="text-gray-700 font-semibold text-sm">
              {(session.user.name || 'U').charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={isReply ? "Write a reply..." : "Write a comment..."}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={isReply ? 2 : 3}
            required
          />
          
          {error && (
            <p className="text-red-500 text-xs mt-1">{error}</p>
          )}
          
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className={`px-4 py-1 text-sm ${
                isSubmitting || !content.trim() 
                  ? 'bg-gray-300 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white rounded-md`}
            >
              {isSubmitting ? 'Posting...' : isReply ? 'Reply' : 'Post Comment'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}