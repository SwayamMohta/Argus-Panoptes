import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { api } from '../lib/api';
import { adaptCommentsPage, adaptIssue } from '../lib/format';
import { uploadImage } from '../lib/media';

const IssuesContext = createContext(null);

function sortIssues(list, sortBy) {
  const sorted = [...list];
  if (sortBy === 'new') {
    return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  if (sortBy === 'top') {
    return sorted.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
  }
  if (sortBy === 'resolved') {
    return sorted
      .filter((issue) => issue.status === 'resolved')
      .sort((a, b) => new Date(b.resolvedAt || 0) - new Date(a.resolvedAt || 0));
  }
  return sorted.sort((a, b) => {
    const scoreA = (a.upvotes || 0) * 1.5 + (a.commentsCount || 0) * 2;
    const scoreB = (b.upvotes || 0) * 1.5 + (b.commentsCount || 0) * 2;
    return scoreB - scoreA;
  });
}

function updateCommentVotes(comments, commentId, upvotes, userVote) {
  return (comments || []).map((comment) => {
    if (comment.id === commentId) return { ...comment, upvotes, userVote };
    if (comment.replies?.length) {
      return { ...comment, replies: updateCommentVotes(comment.replies, commentId, upvotes, userVote) };
    }
    return comment;
  });
}

export const IssuesProvider = ({ children }) => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mergeIssues = useCallback((incoming) => {
    setIssues((previous) => {
      const map = new Map(previous.map((issue) => [issue.id, issue]));
      incoming.forEach((issue) => map.set(issue.id, { ...map.get(issue.id), ...issue }));
      return Array.from(map.values());
    });
  }, []);

  const loadIssues = useCallback(
    async (params = {}) => {
      setLoading(true);
      setError(null);
      try {
        const page = await api.issues(params);
        const items = (page.items || []).map((issue) => adaptIssue(issue));
        mergeIssues(items);
        return { ...page, items };
      } catch (requestError) {
        setError(requestError.message);
        throw requestError;
      } finally {
        setLoading(false);
      }
    },
    [mergeIssues]
  );

  const refreshIssue = useCallback(
    async (issueId) => {
      const detail = await api.issue(issueId);
      const adapted = adaptIssue(detail);
      mergeIssues([adapted]);
      return adapted;
    },
    [mergeIssues]
  );

  const loadIssue = useCallback(
    async (issueId) => {
      const [detail, commentPage] = await Promise.all([
        api.issue(issueId),
        api.comments(issueId, 1, 100),
      ]);
      const comments = adaptCommentsPage(commentPage);
      const adapted = adaptIssue(detail, { comments: comments.items });
      mergeIssues([adapted]);
      return { ...adapted, commentTotal: comments.total };
    },
    [mergeIssues]
  );

  const voteIssue = useCallback(
    async (issueId, direction) => {
      setIssues((previous) =>
        previous.map((issue) => {
          if (issue.id !== issueId) return issue;
          const current = issue.userVote || 0;
          let nextVote = direction;
          let delta = direction;
          if (current === direction) {
            nextVote = 0;
            delta = -direction;
          } else if (current !== 0) {
            delta = direction - current;
          }
          return {
            ...issue,
            userVote: nextVote,
            upvotes: Math.max(0, (issue.upvotes || 0) + delta),
          };
        })
      );
      try {
        const result = await api.voteIssue(issueId, direction);
        setIssues((previous) =>
          previous.map((issue) =>
            issue.id === issueId
              ? { ...issue, upvotes: result.upvotes, userVote: result.userVote }
              : issue
          )
        );
      } catch (requestError) {
        await refreshIssue(issueId).catch(() => {});
        throw requestError;
      }
    },
    [refreshIssue]
  );

  const confirmIssue = useCallback(async (issueId, lat, lon) => {
    const result = await api.confirmIssue(issueId, lat, lon);
    setIssues((previous) =>
      previous.map((issue) =>
        issue.id === issueId
          ? {
              ...issue,
              confirmationsCount: result.confirmationsCount,
              userConfirmed: result.userConfirmed,
            }
          : issue
      )
    );
    return result;
  }, []);

  const createIssue = useCallback(
    async (data) => {
      const created = await api.createIssue({
        categoryId: data.categoryId,
        title: data.title,
        description: data.description,
        location: data.location,
        coordinates: { lat: data.lat, lon: data.lon },
        areaId: data.areaId || undefined,
        isAnonymous: Boolean(data.isAnonymous),
        priority: data.priority || 'standard',
      });
      let adapted = adaptIssue(created);
      let imageUploadError = null;
      if (data.imageUri) {
        try {
          const path = await uploadImage(data.imageUri, 'evidence');
          if (path) {
            const withImage = await api.attachIssueImage(
              created.id,
              path,
              data.imageCaption || 'Citizen submitted evidence photograph'
            );
            adapted = adaptIssue(withImage);
          }
        } catch (error) {
          // The report is already published; surface the photo failure separately.
          imageUploadError = error.message;
        }
      }
      adapted = { ...adapted, imageUploadError };
      mergeIssues([adapted]);
      return adapted;
    },
    [mergeIssues]
  );

  const addComment = useCallback(
    async (issueId, text, parentCommentId = null, isAnonymous = false) => {
      const created = await api.addComment(issueId, {
        text,
        parentCommentId: parentCommentId || null,
        isAnonymous: Boolean(isAnonymous),
      });
      await refreshIssue(issueId);
      return created;
    },
    [refreshIssue]
  );

  const voteComment = useCallback(async (issueId, commentId, direction = 1) => {
    const result = await api.voteComment(commentId, direction);
    setIssues((previous) =>
      previous.map((issue) =>
        issue.id === issueId
          ? {
              ...issue,
              comments: updateCommentVotes(
                issue.comments,
                commentId,
                result.upvotes,
                result.userVote
              ),
            }
          : issue
      )
    );
  }, []);

  const getIssuesByCategory = useCallback(
    (categoryId, sortBy = 'trending') =>
      sortIssues(
        issues.filter((issue) => issue.categoryId === categoryId),
        sortBy
      ),
    [issues]
  );

  const getIssueById = useCallback(
    (issueId) => issues.find((issue) => issue.id === issueId) || null,
    [issues]
  );

  const loadActivity = useCallback(async (tab, page = 1, limit = 20) => {
    const result = await api.activity(tab, page, limit);
    return { ...result, items: (result.items || []).map((issue) => adaptIssue(issue)) };
  }, []);

  const value = useMemo(
    () => ({
      issues,
      loading,
      error,
      loadIssues,
      loadIssue,
      refreshIssue,
      voteIssue,
      confirmIssue,
      createIssue,
      addComment,
      voteComment,
      getIssuesByCategory,
      getIssueById,
      loadActivity,
    }),
    [
      issues,
      loading,
      error,
      loadIssues,
      loadIssue,
      refreshIssue,
      voteIssue,
      confirmIssue,
      createIssue,
      addComment,
      voteComment,
      getIssuesByCategory,
      getIssueById,
      loadActivity,
    ]
  );

  return <IssuesContext.Provider value={value}>{children}</IssuesContext.Provider>;
};

export const useIssues = () => {
  const context = useContext(IssuesContext);
  if (!context) throw new Error('useIssues must be used inside IssuesProvider');
  return context;
};
