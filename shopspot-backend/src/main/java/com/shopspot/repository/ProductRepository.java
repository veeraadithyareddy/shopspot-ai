package com.shopspot.repository;

import com.shopspot.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {

    List<Product> findByShopId(Long shopId);

    /**
     * Finds products matching a name (partial match) that the seller has
     * marked Available, within a given radius (km) of the consumer's
     * location, ordered by distance (nearest first). Distance is computed
     * with the Haversine formula directly in SQL.
     */
    @Query(value =
        "SELECT p.* FROM products p " +
        "JOIN shops s ON p.shop_id = s.id " +
        "WHERE LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%')) " +
        "AND p.available = TRUE " +
        "AND s.latitude IS NOT NULL AND s.longitude IS NOT NULL " +
        "AND (6371 * acos(cos(radians(:lat)) * cos(radians(s.latitude)) * " +
        "cos(radians(s.longitude) - radians(:lng)) + sin(radians(:lat)) * " +
        "sin(radians(s.latitude)))) <= :radiusKm " +
        "ORDER BY (6371 * acos(cos(radians(:lat)) * cos(radians(s.latitude)) * " +
        "cos(radians(s.longitude) - radians(:lng)) + sin(radians(:lat)) * " +
        "sin(radians(s.latitude)))) ASC",
        nativeQuery = true)
    List<Product> findNearbyInStock(@Param("query") String query,
                                     @Param("lat") double lat,
                                     @Param("lng") double lng,
                                     @Param("radiusKm") double radiusKm);
}
