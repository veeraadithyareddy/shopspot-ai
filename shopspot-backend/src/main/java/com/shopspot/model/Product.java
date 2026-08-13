package com.shopspot.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.UpdateTimestamp;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shop_id", nullable = false)
    @JsonIgnoreProperties({"products", "owner"})
    private Shop shop;

    @Column(nullable = false)
    private String name;

    private BigDecimal price;

    @Column(nullable = false)
    private Integer stockQty = 0;

    // Seller-controlled availability toggle - independent of stockQty so a
    // seller can mark something out of stock without losing the quantity on hand.
    @Column(nullable = false)
    @ColumnDefault("true")
    private Boolean available = true;

    @UpdateTimestamp
    private Instant updatedAt;

    public Product() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Shop getShop() { return shop; }
    public void setShop(Shop shop) { this.shop = shop; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public Integer getStockQty() { return stockQty; }
    public void setStockQty(Integer stockQty) { this.stockQty = stockQty; }

    public Boolean getAvailable() { return available; }
    public void setAvailable(Boolean available) { this.available = available; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
