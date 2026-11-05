import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { MOCK_ISSUES } from '../constants/mockIssues';

const IssuesContext = createContext(null);

export const IssuesProvider = ({ children }) => {
  const [issues, setIssues] = useState(MOCK_ISSUES);

  // ---------------------------------------------------------------------------
  // Voting on an Issue (General Support)
  // ---------------------------------------------------------------------------
  const voteIssue = useCallback((issueId, direction) => {
    // direction: 1 for upvote, -1 for downvote
    setIssues((prevIssues) =>
      prevIssues.map((issue) => {
        if (issue.id !== issueId) return issue;

        const currentVote = issue.userVote || 0;
        let nextVote = 0;
        let delta = 0;

        if (currentVote === direction) {
          // Cancel vote
          nextVote = 0;
          delta = -direction;
        } else {
          // Switch vote or initial vote
          nextVote = direction;
          delta = direction - currentVote;
        }

        return {
          ...issue,
          userVote: nextVote,
          upvotes: Math.max(0, (issue.upvotes || 0) + delta),
        };
      })
    );
  }, []);

  // ---------------------------------------------------------------------------
  // Confirm an Issue (Witnessed Personally)
  // ---------------------------------------------------------------------------
  const confirmIssue = useCallback((issueId) => {
    setIssues((prevIssues) =>
      prevIssues.map((issue) => {
        if (issue.id !== issueId) return issue;

        const isCurrentlyConfirmed = !!issue.userConfirmed;
        const nextConfirmed = !isCurrentlyConfirmed;
        const delta = nextConfirmed ? 1 : -1;

        return {
          ...issue,
          userConfirmed: nextConfirmed,
          confirmationsCount: Math.max(0, (issue.confirmationsCount || 0) + delta),
        };
      })
    );
  }, []);

  // ---------------------------------------------------------------------------
  // Add a New Issue
  // ---------------------------------------------------------------------------
  const addIssue = useCallback((issueData) => {
    const newId = `issue-${issueData.categoryId || 'gen'}-${Date.now()}`;
    const newIssue = {
      id: newId,
      categoryId: issueData.categoryId,
      title: issueData.title.trim(),
      description: issueData.description.trim(),
      location: issueData.location.trim() || 'Civic Ward, Hyderabad',
      author: issueData.isAnonymous ? 'Anonymous Citizen' : (issueData.author || 'u/civic_citizen'),
      authorBadge: issueData.isAnonymous ? 'Anonymous' : 'Civic Scout',
      isAnonymous: !!issueData.isAnonymous,
      image: issueData.image || null,
      imageCaption: issueData.imageCaption || (issueData.image ? 'Citizen field evidence' : null),
      createdAt: new Date().toISOString(),
      timeAgo: 'Just now',
      upvotes: 1,
      userVote: 1, // Author automatically upvotes their reported issue
      confirmationsCount: 0,
      userConfirmed: false,
      status: 'reported',
      statusLabel: 'Reported',
      timeline: [
        {
          key: 'reported',
          label: 'Reported',
          date: 'Just now',
          description: 'Citizen report filed with geotagged photo evidence',
          completed: true,
        },
        {
          key: 'under_review',
          label: 'Under Review',
          date: 'Pending',
          description: 'Ward inspection and engineering review queued',
          completed: false,
        },
        {
          key: 'in_progress',
          label: 'In Progress',
          date: 'Pending',
          description: 'Civic repair team dispatch pending review',
          completed: false,
        },
        {
          key: 'resolved',
          label: 'Resolved',
          date: 'Pending',
          description: 'Post-repair verification audit',
          completed: false,
        },
      ],
      commentsCount: 0,
      comments: [],
    };

    setIssues((prev) => [newIssue, ...prev]);
    return newIssue;
  }, []);

  // ---------------------------------------------------------------------------
  // Add Comment / Nested Reply
  // ---------------------------------------------------------------------------
  const addComment = useCallback((issueId, text, parentCommentId = null, authorInfo = {}) => {
    if (!text || !text.trim()) return;

    const commentId = `c-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newComment = {
      id: commentId,
      author: authorInfo.isAnonymous ? 'Anonymous Citizen' : (authorInfo.author || 'u/civic_citizen'),
      authorBadge: authorInfo.isAnonymous ? 'Anonymous' : (authorInfo.authorBadge || 'Citizen'),
      isOfficial: !!authorInfo.isOfficial,
      text: text.trim(),
      timeAgo: 'Just now',
      createdAt: new Date().toISOString(),
      upvotes: 1,
      userVote: 1,
      replies: [],
    };

    setIssues((prevIssues) =>
      prevIssues.map((issue) => {
        if (issue.id !== issueId) return issue;

        let updatedComments;
        if (!parentCommentId) {
          // Top-level comment
          updatedComments = [newComment, ...(issue.comments || [])];
        } else {
          // Reply to parent comment
          updatedComments = (issue.comments || []).map((c) => {
            if (c.id === parentCommentId) {
              return {
                ...c,
                replies: [...(c.replies || []), newComment],
              };
            }
            return c;
          });
        }

        return {
          ...issue,
          commentsCount: (issue.commentsCount || 0) + 1,
          comments: updatedComments,
        };
      })
    );
  }, []);

  // ---------------------------------------------------------------------------
  // Vote on a Comment
  // ---------------------------------------------------------------------------
  const voteComment = useCallback((issueId, commentId, direction = 1) => {
    setIssues((prevIssues) =>
      prevIssues.map((issue) => {
        if (issue.id !== issueId) return issue;

        const updateCommentList = (list) =>
          list.map((c) => {
            if (c.id === commentId) {
              const currentVote = c.userVote || 0;
              const nextVote = currentVote === direction ? 0 : direction;
              const delta = nextVote - currentVote;
              return {
                ...c,
                userVote: nextVote,
                upvotes: Math.max(0, (c.upvotes || 0) + delta),
              };
            }
            if (c.replies && c.replies.length > 0) {
              return {
                ...c,
                replies: updateCommentList(c.replies),
              };
            }
            return c;
          });

        return {
          ...issue,
          comments: updateCommentList(issue.comments || []),
        };
      })
    );
  }, []);

  // ---------------------------------------------------------------------------
  // Helper: Retrieve issues for category and sort
  // ---------------------------------------------------------------------------
  const getIssuesByCategory = useCallback(
    (categoryId, sortBy = 'trending') => {
      const filtered = issues.filter((iss) => iss.categoryId === categoryId);

      const sorted = [...filtered].sort((a, b) => {
        if (sortBy === 'new') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === 'top') {
          return (b.upvotes || 0) - (a.upvotes || 0);
        }
        // 'trending': combination of upvotes and active discussions
        const scoreA = (a.upvotes || 0) * 1.5 + (a.commentsCount || 0) * 2;
        const scoreB = (b.upvotes || 0) * 1.5 + (b.commentsCount || 0) * 2;
        return scoreB - scoreA;
      });

      return sorted;
    },
    [issues]
  );

  const getIssueById = useCallback(
    (issueId) => {
      return issues.find((iss) => iss.id === issueId) || null;
    },
    [issues]
  );

  const value = useMemo(
    () => ({
      issues,
      voteIssue,
      confirmIssue,
      addIssue,
      addComment,
      voteComment,
      getIssuesByCategory,
      getIssueById,
    }),
    [issues, voteIssue, confirmIssue, addIssue, addComment, voteComment, getIssuesByCategory, getIssueById]
  );

  return <IssuesContext.Provider value={value}>{children}</IssuesContext.Provider>;
};

export const useIssues = () => {
  const context = useContext(IssuesContext);
  if (!context) {
    throw new Error('useIssues must be used within an IssuesProvider');
  }
  return context;
};

