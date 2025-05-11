import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';

export default function RecipeSelector({ recipes, onSelect, onCancel }) {
  if (!recipes || recipes.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>No Matching Recipes Found</Text>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Select the Best Match</Text>
      <Text style={styles.subtitle}>Choose the recipe that best matches your meal:</Text>

      {recipes.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={styles.recipeCard}
          onPress={() => onSelect(index)}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.recipeName}>{item.recipe.name}</Text>
            <Text style={styles.confidenceScore}>
              {(item.similarity * 100).toFixed(1)}% match
            </Text>
          </View>

          {/* Display nutrition info preview */}
          <View style={styles.nutritionPreview}>
            <Text style={styles.previewText}>
              {item.recipe.nutrition && item.recipe.nutrition.Calories 
                ? `Calories: ${item.recipe.nutrition.Calories}` 
                : 'No calorie information'}
            </Text>
          </View>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#5B3566',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  recipeCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recipeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  confidenceScore: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B81',
  },
  nutritionPreview: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  previewText: {
    fontSize: 14,
    color: '#666',
  },
  cancelButton: {
    backgroundColor: '#999',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  cancelText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
});