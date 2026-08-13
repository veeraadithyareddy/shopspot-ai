package com.shopspot.dto;

import java.util.List;

public class RecipeSuggestion {
    private String name;
    private List<String> ingredients;
    private List<RecipeShopMatch> shopMatches;

    // Populated when no single shop has every ingredient: the fewest shops
    // that together cover as much of the list as possible.
    private List<RecipeShopMatch> comboPlan;
    private List<String> unavailableIngredients;

    public RecipeSuggestion(String name, List<String> ingredients, List<RecipeShopMatch> shopMatches,
                             List<RecipeShopMatch> comboPlan, List<String> unavailableIngredients) {
        this.name = name;
        this.ingredients = ingredients;
        this.shopMatches = shopMatches;
        this.comboPlan = comboPlan;
        this.unavailableIngredients = unavailableIngredients;
    }

    public String getName() { return name; }
    public List<String> getIngredients() { return ingredients; }
    public List<RecipeShopMatch> getShopMatches() { return shopMatches; }
    public List<RecipeShopMatch> getComboPlan() { return comboPlan; }
    public List<String> getUnavailableIngredients() { return unavailableIngredients; }
}
