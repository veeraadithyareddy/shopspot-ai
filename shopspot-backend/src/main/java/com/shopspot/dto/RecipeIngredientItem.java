package com.shopspot.dto;

import java.math.BigDecimal;

public class RecipeIngredientItem {
    private String ingredient;
    private String matchedProductName;
    private BigDecimal price;
    private boolean available;

    public RecipeIngredientItem(String ingredient, String matchedProductName, BigDecimal price, boolean available) {
        this.ingredient = ingredient;
        this.matchedProductName = matchedProductName;
        this.price = price;
        this.available = available;
    }

    public String getIngredient() { return ingredient; }
    public String getMatchedProductName() { return matchedProductName; }
    public BigDecimal getPrice() { return price; }
    public boolean isAvailable() { return available; }
}
