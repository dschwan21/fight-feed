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
  
  if (loading) return <div className="text-center py-4">Loading comments...</div>;
  if (error) return <div className="text-red-500 py-4">Error: {error}</div>;
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-xl font-bold mb-4 font-serif">Comments</h2>
      
      {session ? (
        <CommentForm 
          scorecardId={scorecardId}
          onCommentAdded={handleAddComment}
        />
      ) : (
        <p className="text-center py-2 text-gray-600 mb-4">Sign in to leave a comment</p>
      )}
      
      {comments.length === 0 ? (
        <p className="text-center py-4 text-gray-500">No comments yet. Be the first to comment!</p>
      ) : (
        <div className="space-y-4">
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