"use client";

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import CommentForm from './CommentForm';
import TimeAgo from './TimeAgo';

export default function CommentItem({ 
  comment, 
  scorecardId, 
  onReplyAdded, 
  onCommentUpdated, 
  onCommentDeleted, 
  isReply = false 
}) {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const { data: session } = useSession();
  
  const isOwner = session?.user?.id === comment.userId;
  
  const handleReplyClick = () => {
    setIsReplying(!isReplying);
    setIsEditing(false);
  };
  
  const handleEditClick = () => {
    setIsEditing(!isEditing);
    setIsReplying(false);
    setEditContent(comment.content);
  };
  
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`/api/comments/${comment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent })
      });
      
      if (!response.ok) throw new Error('Failed to update comment');
      
      const updatedComment = await response.json();
      onCommentUpdated(updatedComment);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating comment:', error);
    }
  };
  
  const handleDeleteClick = async () => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    
    try {
      const response = await fetch(`/api/comments/${comment.id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete comment');
      
      onCommentDeleted(comment.id, isReply ? comment.parentId : null);
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };
  
  const handleReplySubmit = (newReply) => {
    onReplyAdded(comment.id, newReply);
    setIsReplying(false);
  };
  
  return (
    <div className={`bg-gray-50 rounded-lg p-4 ${isReply ? 'ml-8 border-l-2 border-gray-300' : ''}`}>
      <div className="flex items-start">
        {comment.user.avatarUrl ? (
          <img 
            src={comment.user.avatarUrl} 
            alt={comment.user.username || 'User'} 
            className="w-8 h-8 rounded-full mr-3"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-300 mr-3 flex items-center justify-center">
            <span className="text-gray-700 font-semibold text-sm">
              {(comment.user.username || 'U').charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium text-sm">{comment.user.username || 'Anonymous'}</span>
              <span className="text-gray-500 text-xs ml-2">
                <TimeAgo date={comment.createdAt} />
              </span>
            </div>
            
            {isOwner && (
              <div className="flex space-x-2">
                <button 
                  onClick={handleEditClick}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Edit
                </button>
                <button 
                  onClick={handleDeleteClick}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
          
          {isEditing ? (
            <form onSubmit={handleEditSubmit} className="mt-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
                required
              />
              <div className="flex justify-end space-x-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                >
                  Update
                </button>
              </div>
            </form>
          ) : (
            <p className="text-sm mt-1">{comment.content}</p>
          )}
          
          {!isReply && !isEditing && (
            <button
              onClick={handleReplyClick}
              className="text-xs text-gray-600 hover:text-gray-800 mt-2"
            >
              {isReplying ? 'Cancel Reply' : 'Reply'}
            </button>
          )}
          
          {isReplying && (
            <div className="mt-3">
              <CommentForm 
                scorecardId={scorecardId}
                parentId={comment.id}
                onCommentAdded={handleReplySubmit}
                isReply={true}
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Render replies */}
      {!isReply && comment.replies && comment.replies.length > 0 && (
        <div className="mt-4 space-y-3">
          {comment.replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              scorecardId={scorecardId}
              onCommentUpdated={onCommentUpdated}
              onCommentDeleted={onCommentDeleted}
              isReply={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}