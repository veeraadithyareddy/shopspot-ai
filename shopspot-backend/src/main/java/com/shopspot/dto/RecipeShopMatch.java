package com.shopspot.dto;

import com.shopspot.model.Shop;
import java.util.List;

public class RecipeShopMatch {
    private Long shopId;
    private String shopName;
    private String shopCategory;
    private double distanceKm;
    private String directionsUrl;
    private int matchedCount;
    private int totalCount;
    private boolean complete;
    private List<RecipeIngredientItem> items;

    public RecipeShopMatch(Shop shop, double distanceKm, List<RecipeIngredientItem> items, int matchedCount, int totalCount) {
        this.shopId = shop.getId();
        this.shopName = shop.getName();
        this.shopCategory = shop.getCategory();
        this.distanceKm = distanceKm;
        this.directionsUrl = "https://www.google.com/maps/dir/?api=1&destination="
                + shop.getLatitude() + "," + shop.getLongitude();
        this.items = items;
        this.matchedCount = matchedCount;
        this.totalCount = totalCount;
        this.complete = matchedCount == totalCount;
    }

    public Long getShopId() { return shopId; }
    public String getShopName() { return shopName; }
    public String getShopCategory() { return shopCategory; }
    public double getDistanceKm() { return distanceKm; }
    public String getDirectionsUrl() { return directionsUrl; }
    public int getMatchedCount() { return matchedCount; }
    public int getTotalCount() { return totalCount; }
    public boolean isComplete() { return complete; }
    public List<RecipeIngredientItem> getItems() { return items; }
}
