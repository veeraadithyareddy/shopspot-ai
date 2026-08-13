package com.shopspot.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.shopspot.model.Product;
import com.shopspot.model.Shop;
import com.shopspot.model.User;
import com.shopspot.repository.ProductRepository;
import com.shopspot.repository.ShopRepository;
import com.shopspot.repository.UserRepository;
import com.shopspot.security.AuthenticatedUser;
import com.shopspot.service.GroqService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/seller")
public class SellerController {

    private final ShopRepository shopRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final GroqService groqService;

    private static final String BULK_UPDATE_SYSTEM_PROMPT =
        "You are an inventory update parser for a local shop-owner app. The seller will describe changes " +
        "in free-form text (may be casual, may use Tamil/Hindi/English mixed phrasing). Output ONLY valid " +
        "JSON, no other text, no markdown, in this exact shape: " +
        "{\"actions\": [{\"type\": \"update_availability\"|\"update_price\"|\"update_stock\"|\"add_product\", " +
        "\"productName\": \"...\", \"available\": true|false|null, \"price\": number|null, \"stockQty\": number|null}]} " +
        "Use update_availability when the seller says something is out of stock / back in stock / available / unavailable. " +
        "Use update_price when they mention a new price for an existing item. " +
        "Use update_stock when they mention a specific quantity for an existing item. " +
        "Use add_product only when it's clearly a new item not previously implied to exist. " +
        "One action per distinct instruction. Keep productName short and matching how the seller referred to it.";

    public SellerController(ShopRepository shopRepository, ProductRepository productRepository,
                             UserRepository userRepository, GroqService groqService) {
        this.shopRepository = shopRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.groqService = groqService;
    }

    /**
     * Returns the seller's shop, creating a default one on the fly if it's
     * somehow missing (e.g. an older account from before a registration bug
     * was fixed). This makes "no shop found" a self-healing situation
     * instead of a dead end for the seller.
     */
    private Shop requireOwnShop(AuthenticatedUser user) {
        return shopRepository.findByOwnerId(user.getId())
                .orElseGet(() -> {
                    User owner = userRepository.findById(user.getId())
                            .orElseThrow(() -> new RuntimeException("Account not found."));
                    Shop shop = new Shop();
                    shop.setOwner(owner);
                    shop.setName(owner.getName() + "'s Shop");
                    shop.setIsOpenNow(true);
                    return shopRepository.save(shop);
                });
    }

    @GetMapping("/shop")
    public Shop getMyShop(@AuthenticationPrincipal AuthenticatedUser user) {
        return requireOwnShop(user);
    }

    @PutMapping("/shop")
    public Shop updateMyShop(@AuthenticationPrincipal AuthenticatedUser user, @RequestBody Shop updates) {
        Shop shop = requireOwnShop(user);
        if (updates.getName() != null) shop.setName(updates.getName());
        if (updates.getCategory() != null) shop.setCategory(updates.getCategory());
        if (updates.getAddress() != null) shop.setAddress(updates.getAddress());
        if (updates.getAddressLine1() != null) shop.setAddressLine1(updates.getAddressLine1());
        if (updates.getAreaLocality() != null) shop.setAreaLocality(updates.getAreaLocality());
        if (updates.getCity() != null) shop.setCity(updates.getCity());
        if (updates.getState() != null) shop.setState(updates.getState());
        if (updates.getPinCode() != null) shop.setPinCode(updates.getPinCode());
        if (updates.getLatitude() != null) shop.setLatitude(updates.getLatitude());
        if (updates.getLongitude() != null) shop.setLongitude(updates.getLongitude());
        if (updates.getOpeningHours() != null) shop.setOpeningHours(updates.getOpeningHours());
        if (updates.getPhone() != null) shop.setPhone(updates.getPhone());
        if (updates.getIsOpenNow() != null) shop.setIsOpenNow(updates.getIsOpenNow());
        return shopRepository.save(shop);
    }

    @GetMapping("/products")
    public List<Product> getMyProducts(@AuthenticationPrincipal AuthenticatedUser user) {
        Shop shop = requireOwnShop(user);
        return productRepository.findByShopId(shop.getId());
    }

    @PostMapping("/products")
    public Product addProduct(@AuthenticationPrincipal AuthenticatedUser user, @RequestBody Product product) {
        Shop shop = requireOwnShop(user);
        product.setId(null);
        product.setShop(shop);
        return productRepository.save(product);
    }

    @PutMapping("/products/{id}")
    public ResponseEntity<?> updateProduct(@AuthenticationPrincipal AuthenticatedUser user,
                                            @PathVariable Long id,
                                            @RequestBody Product updates) {
        Shop shop = requireOwnShop(user);
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found."));
        if (!product.getShop().getId().equals(shop.getId())) {
            return ResponseEntity.status(403).body("This product does not belong to your shop.");
        }
        if (updates.getName() != null) product.setName(updates.getName());
        if (updates.getPrice() != null) product.setPrice(updates.getPrice());
        if (updates.getStockQty() != null) product.setStockQty(updates.getStockQty());
        if (updates.getAvailable() != null) product.setAvailable(updates.getAvailable());
        return ResponseEntity.ok(productRepository.save(product));
    }

    @DeleteMapping("/products/{id}")
    public ResponseEntity<?> deleteProduct(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable Long id) {
        Shop shop = requireOwnShop(user);
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found."));
        if (!product.getShop().getId().equals(shop.getId())) {
            return ResponseEntity.status(403).body("This product does not belong to your shop.");
        }
        productRepository.delete(product);
        return ResponseEntity.ok().build();
    }

    /**
     * Accepts free-form text describing inventory changes (e.g. "rice is out,
     * dal is now 140, add paneer at 90 rupees with 10 in stock") and uses
     * Groq to parse it into structured actions, which are then applied
     * against the seller's own products. Existing products are matched by
     * fuzzy (case-insensitive, partial) name match; unmatched "add" actions
     * create a new product. Returns a plain-language summary of what
     * changed so the seller can verify before trusting it.
     */
    @PostMapping("/products/bulk-update")
    public ResponseEntity<?> bulkUpdate(@AuthenticationPrincipal AuthenticatedUser user,
                                         @RequestBody Map<String, String> body) {
        if (!groqService.isConfigured()) {
            return ResponseEntity.status(503).body(Map.of(
                    "error", "AI bulk update isn't configured yet. Set groq.api.key in application.properties."));
        }

        String text = body.get("text");
        if (text == null || text.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Describe the changes you want to make."));
        }

        Shop shop = requireOwnShop(user);
        List<Product> myProducts = productRepository.findByShopId(shop.getId());
        List<String> summary = new ArrayList<>();

        try {
            JsonNode json = groqService.completeAsJson(BULK_UPDATE_SYSTEM_PROMPT, text);
            for (JsonNode action : json.path("actions")) {
                String type = action.path("type").asText("");
                String productName = action.path("productName").asText("");
                if (productName.isBlank()) continue;

                if (type.equals("add_product")) {
                    Product p = new Product();
                    p.setShop(shop);
                    p.setName(productName);
                    p.setPrice(action.hasNonNull("price") ? BigDecimal.valueOf(action.get("price").asDouble()) : BigDecimal.ZERO);
                    p.setStockQty(action.hasNonNull("stockQty") ? action.get("stockQty").asInt() : 0);
                    p.setAvailable(true);
                    productRepository.save(p);
                    myProducts.add(p);
                    summary.add("Added \"" + productName + "\"" +
                            (action.hasNonNull("price") ? " at ₹" + action.get("price").asDouble() : ""));
                    continue;
                }

                Product match = findBestMatch(myProducts, productName);
                if (match == null) {
                    summary.add("Couldn't find a product matching \"" + productName + "\" — skipped.");
                    continue;
                }

                switch (type) {
                    case "update_availability" -> {
                        boolean available = action.path("available").asBoolean(true);
                        match.setAvailable(available);
                        summary.add(match.getName() + " marked " + (available ? "Available" : "Out of Stock"));
                    }
                    case "update_price" -> {
                        if (action.hasNonNull("price")) {
                            match.setPrice(BigDecimal.valueOf(action.get("price").asDouble()));
                            summary.add(match.getName() + " price updated to ₹" + action.get("price").asDouble());
                        }
                    }
                    case "update_stock" -> {
                        if (action.hasNonNull("stockQty")) {
                            match.setStockQty(action.get("stockQty").asInt());
                            summary.add(match.getName() + " stock updated to " + action.get("stockQty").asInt());
                        }
                    }
                    default -> summary.add("Didn't understand an instruction about \"" + productName + "\" — skipped.");
                }
                productRepository.save(match);
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Couldn't parse that: " + e.getMessage()));
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("summary", summary);
        response.put("products", productRepository.findByShopId(shop.getId()));
        return ResponseEntity.ok(response);
    }

    /**
     * Accepts a short voice recording (e.g. a shopkeeper speaking in Hindi,
     * Tamil, Telugu, or English) and returns the transcribed text. The
     * frontend drops this text into the same "Quick Update with AI" box
     * used by bulkUpdate() above, so the seller can review/edit what was
     * heard before applying it - transcription and language parsing are
     * both handled by Groq, but nothing is saved to the database here.
     */
    @PostMapping(value = "/products/voice-transcribe", consumes = "multipart/form-data")
    public ResponseEntity<?> transcribeVoice(@AuthenticationPrincipal AuthenticatedUser user,
                                              @RequestParam("audio") MultipartFile audio) {
        if (!groqService.isConfigured()) {
            return ResponseEntity.status(503).body(Map.of(
                    "error", "Voice input isn't configured yet. Set groq.api.key in application.properties."));
        }
        if (audio == null || audio.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No audio received - try recording again."));
        }
        try {
            String contentType = audio.getContentType() != null ? audio.getContentType() : "audio/webm";
            String text = groqService.transcribeAudio(audio.getBytes(), "voice_entry.webm", contentType);
            return ResponseEntity.ok(Map.of("text", text));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Couldn't transcribe that: " + e.getMessage()));
        }
    }

    /** Case-insensitive fuzzy match: exact match wins, otherwise first contains-match either direction. */
    private Product findBestMatch(List<Product> products, String query) {
        String q = query.toLowerCase().trim();
        for (Product p : products) {
            if (p.getName().equalsIgnoreCase(q)) return p;
        }
        for (Product p : products) {
            String name = p.getName().toLowerCase();
            if (name.contains(q) || q.contains(name)) return p;
        }
        return null;
    }
}