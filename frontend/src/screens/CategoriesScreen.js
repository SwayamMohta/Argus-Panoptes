import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { CATEGORIES_DATA } from '../constants/categoriesData';
import { CATEGORY_IMAGES } from '../constants/categoryImages';
import { api } from '../lib/api';
import { CategoryFeedScreen } from './CategoryFeedScreen';
import { IssueDetailScreen } from './IssueDetailScreen';
import { CreateIssueScreen } from './CreateIssueScreen';

export const CategoriesScreen = () => {
  // Navigation stack state within Categories tab
  // 'grid' | 'feed' | 'detail' | 'create'
  const [currentView, setCurrentView] = useState('grid');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedIssueId, setSelectedIssueId] = useState(null);
  const [categories, setCategories] = useState(CATEGORIES_DATA);

  useEffect(() => {
    let active = true;
    api
      .categories()
      .then((rows) => {
        if (active && rows?.length) setCategories(rows);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Navigate to category community feed
  const handleCategoryPress = (category) => {
    setSelectedCategory(category);
    setCurrentView('feed');
  };

  // Back to the 8-category 2-column grid
  const handleBackToGrid = () => {
    setCurrentView('grid');
    setSelectedCategory(null);
    setSelectedIssueId(null);
  };

  // Open issue detail discussion page
  const handleSelectIssue = (issue) => {
    if (typeof issue === 'string') {
      setSelectedIssueId(issue);
    } else {
      setSelectedIssueId(issue.id);
      const category = categories.find((item) => item.id === issue.categoryId);
      if (category) setSelectedCategory(category);
    }
    setCurrentView('detail');
  };

  // Back to category community feed
  const handleBackToFeed = () => {
    setCurrentView('feed');
    setSelectedIssueId(null);
  };

  // Open issue reporting form
  const handleOpenCreateIssue = () => {
    setCurrentView('create');
  };

  // When a new issue is submitted successfully
  const handleCreateSuccess = (newIssueId) => {
    // Return to feed so the user sees their new post at the top of the feed
    setCurrentView('feed');
  };

  // ---------------------------------------------------------------------------
  // View Routing
  // ---------------------------------------------------------------------------
  if (currentView === 'create' && selectedCategory) {
    return (
      <CreateIssueScreen
        category={selectedCategory}
        onBack={handleBackToFeed}
        onSuccess={handleCreateSuccess}
      />
    );
  }

  if (currentView === 'detail' && selectedIssueId && selectedCategory) {
    return (
      <IssueDetailScreen
        issueId={selectedIssueId}
        category={selectedCategory}
        onBack={handleBackToFeed}
      />
    );
  }

  if (currentView === 'feed' && selectedCategory) {
    return (
      <CategoryFeedScreen
        category={selectedCategory}
        onBack={handleBackToGrid}
        onSelectIssue={handleSelectIssue}
        onOpenCreateIssue={handleOpenCreateIssue}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // Default View: Exactly preserved 8-category 2-column editorial photo grid
  // ---------------------------------------------------------------------------
  return (
    <View style={styles.container}>
      {/* 2-COLUMN GRID OF EDITORIAL PHOTOGRAPHY CARDS */}
      <ScrollView
        style={styles.cardsScrollView}
        contentContainerStyle={styles.cardsScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.gridContainer}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryCard}
              onPress={() => handleCategoryPress(category)}
              activeOpacity={0.85}
            >
              {/* High-End Architectural Photography */}
              <Image
                source={CATEGORY_IMAGES[category.id]}
                style={styles.cardImage}
                resizeMode="cover"
              />

              {/* Title Overlay with Translucent Scrim */}
              <View style={styles.cardTitleContainer}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {category.name}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export const SectorsScreen = CategoriesScreen;
export default CategoriesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  cardsScrollView: {
    flex: 1,
  },
  cardsScrollContent: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 68 : 58,
    paddingBottom: 110,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  categoryCard: {
    width: '48.2%',
    height: 154,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'flex-end',
    backgroundColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardTitleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 18.5,
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
