"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import CommentForm from './CommentForm';
import CommentItem from './CommentItem';

export default function CommentSection({ scorecardId }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { data: session } = useSession();
  
  useEffect(() => {
    fetchComments();
  }, [scorecardId]);
  
  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/comments?scorecardId=${scorecardId}`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      
      const data = await response.json();
      setComments(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching comments:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddComment = (newComment) => {
    setComments([newComment, ...comments]);
  };
  
  const handleAddReply = (parentId, newReply) => {
    setComments(comments.map(comment => {
      if (comment.id === parentId) {
        return {
          ...comment,
          replies: [...(comment.replies || []), newReply]
        };
      }
      return comment;
    }));
  };
  
  const handleUpdateComment = (updatedComment) => {
    setComments(comments.map(comment => {
      if (comment.id === updatedComment.id) {
        return updatedComment;
      }
      
      // Check if it's a reply
      if (comment.replies?.length) {
        return {
          ...comment,
          replies: comment.replies.map(reply => 
            reply.id === updatedComment.id ? updatedComment : reply
          )
        };
      }
      
      return comment;
    }));
  };
  
  const handleDeleteComment = (commentId, parentId = null) => {
    if (parentId) {
      setComments(comments.map(comment => {
        if (comment.id === parentId) {
          return {
            ...comment,
            replies: comment.replies.filter(reply => reply.id !== commentId)
          };
        }
        return comment;
      }));
    } else {
      setComments(comments.filter(comment => comment.id !== commentId));
    }
  };
  
  if (error) return (
    <div className="bg-gray-50 rounded-xl shadow-md p-4 sm:p-6 border border-gray-200">
      <div className="text-red-500 py-4 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        Error: {error}
      </div>
    </div>
  );
  
  return (
    <div className="bg-gray-50 rounded-xl shadow-md p-4 sm:p-6 border border-gray-200">
      <h2 className="text-xl font-bold mb-4 sm:mb-6 font-serif text-gray-800 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
        </svg>
        Comments
      </h2>
      
      {session ? (
        <div className="mb-6">
          <CommentForm 
            scorecardId={scorecardId}
            onCommentAdded={handleAddComment}
          />
        </div>
      ) : (
        <div className="mb-6 bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-gray-600">
            <span className="font-medium">Sign in</span> to join the conversation
          </p>
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-pulse flex space-x-4">
            <div className="rounded-full bg-gray-200 h-10 w-10"></div>
            <div className="flex-1 space-y-3 py-1">
              <div className="h-2 bg-gray-200 rounded w-3/4"></div>
              <div className="space-y-2">
                <div className="h-2 bg-gray-200 rounded"></div>
                <div className="h-2 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </div>
      ) : comments.length === 0 ? (
        <div className="py-10 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-gray-300 mb-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
          </svg>
          <p className="text-gray-500">No comments yet. Be the first to share your thoughts!</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="text-sm text-gray-500 mb-2 flex items-center">
            <span className="font-medium">{comments.length}</span> 
            <span className="ml-1">{comments.length === 1 ? 'comment' : 'comments'}</span>
          </div>
          {comments.map(comment => (
            <CommentItem 
              key={comment.id}
              comment={comment}
              scorecardId={scorecardId}
              onReplyAdded={handleAddReply}
              onCommentUpdated={handleUpdateComment}
              onCommentDeleted={handleDeleteComment}
            />
          ))}
        </div>
      )}
    </div>
  );
}