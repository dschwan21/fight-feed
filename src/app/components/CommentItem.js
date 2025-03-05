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
    <div className={`${isReply ? 'ml-3 sm:ml-6 pl-3 sm:pl-4 border-l border-gray-200 mt-3' : 'bg-white bg-opacity-70 rounded-lg border border-gray-200 shadow-sm p-3 sm:p-4'}`}>
      <div className="flex items-start">
        {comment.user.avatarUrl ? (
          <img 
            src={comment.user.avatarUrl} 
            alt={comment.user.username || 'User'} 
            className="w-10 h-10 rounded-full mr-3 border-2 border-white shadow-sm"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 mr-3 flex items-center justify-center shadow-sm">
            <span className="text-white font-semibold text-sm">
              {(comment.user.username || 'U').charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium text-gray-900">{comment.user.username || 'Anonymous'}</span>
              <span className="text-gray-500 text-xs ml-2">
                <TimeAgo date={comment.createdAt} />
              </span>
            </div>
            
            {isOwner && (
              <div className="flex space-x-1">
                <button 
                  onClick={handleEditClick}
                  className="text-xs text-gray-500 hover:text-blue-600 transition-colors px-2 py-1 rounded hover:bg-gray-100"
                  aria-label="Edit comment"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </button>
                <button 
                  onClick={handleDeleteClick}
                  className="text-xs text-gray-500 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-gray-100"
                  aria-label="Delete comment"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          
          {isEditing ? (
            <form onSubmit={handleEditSubmit} className="mt-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-2.5 text-sm text-gray-900 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                rows="3"
                required
              />
              <div className="flex justify-end space-x-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  Update
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-1 text-gray-800 text-sm leading-relaxed">{comment.content}</div>
          )}
          
          <div className="mt-2 flex items-center space-x-4">
            {!isReply && !isEditing && (
              <button
                onClick={handleReplyClick}
                className="text-xs text-gray-500 hover:text-blue-600 transition-colors flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {isReplying ? 'Cancel' : 'Reply'}
              </button>
            )}
          </div>
          
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
        <div className="mt-2 space-y-0">
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