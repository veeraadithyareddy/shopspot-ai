package com.shopspot.dto;

import com.shopspot.model.Product;
import com.shopspot.model.Shop;

public class NearbyProductResult {
    private Long productId;
    private String productName;
    private java.math.BigDecimal price;
    private Integer stockQty;

    private Long shopId;
    private String shopName;
    private String shopCategory;
    private String shopAddress;
    private Double shopLatitude;
    private Double shopLongitude;
    private String shopPhone;
    private Boolean shopIsOpenNow;

    private double distanceKm;
    private String directionsUrl;

    public NearbyProductResult(Product p, double consumerLat, double consumerLng) {
        Shop shop = p.getShop();
        this.productId = p.getId();
        this.productName = p.getName();
        this.price = p.getPrice();
        this.stockQty = p.getStockQty();

        this.shopId = shop.getId();
        this.shopName = shop.getName();
        this.shopCategory = shop.getCategory();
        this.shopAddress = shop.getAddress();
        this.shopLatitude = shop.getLatitude();
        this.shopLongitude = shop.getLongitude();
        this.shopPhone = shop.getPhone();
        this.shopIsOpenNow = shop.getIsOpenNow();

        this.distanceKm = haversineKm(consumerLat, consumerLng, shop.getLatitude(), shop.getLongitude());
        this.directionsUrl = "https://www.google.com/maps/dir/?api=1&destination="
                + shop.getLatitude() + "," + shop.getLongitude();
    }

    private static double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    public Long getProductId() { return productId; }
    public String getProductName() { return productName; }
    public java.math.BigDecimal getPrice() { return price; }
    public Integer getStockQty() { return stockQty; }
    public Long getShopId() { return shopId; }
    public String getShopName() { return shopName; }
    public String getShopCategory() { return shopCategory; }
    public String getShopAddress() { return shopAddress; }
    public Double getShopLatitude() { return shopLatitude; }
    public Double getShopLongitude() { return shopLongitude; }
    public String getShopPhone() { return shopPhone; }
    public Boolean getShopIsOpenNow() { return shopIsOpenNow; }
    public double getDistanceKm() { return distanceKm; }
    public String getDirectionsUrl() { return directionsUrl; }
}
