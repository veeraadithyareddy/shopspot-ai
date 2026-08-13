package com.shopspot.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.shopspot.dto.NearbyProductResult;
import com.shopspot.dto.RecipeIngredientItem;
import com.shopspot.dto.RecipeShopMatch;
import com.shopspot.dto.RecipeSuggestion;
import com.shopspot.model.Product;
import com.shopspot.model.Shop;
import com.shopspot.repository.ProductRepository;
import com.shopspot.service.GroqService;
import com.shopspot.util.DistanceUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/consumer")
public class ConsumerController {

    private final ProductRepository productRepository;
    private final GroqService groqService;

    private static final String SMART_SEARCH_SYSTEM_PROMPT =
        "You are a search query parser for a local grocery/shop discovery app. " +
        "Given the user's query, output ONLY valid JSON with this exact shape, no other text, no markdown: " +
        "{\"keywords\": [\"...\"]} " +
        "The keywords should be 1-3 concrete, searchable product name fragments that best capture what the " +
        "person is looking for, expanding vague or indirect phrasing into likely product names. " +
        "For example \"something for cooking\" -> {\"keywords\": [\"oil\", \"rice\", \"dal\"]}, " +
        "\"cold medicine\" -> {\"keywords\": [\"paracetamol\", \"cough syrup\"]}, " +
        "\"milk\" -> {\"keywords\": [\"milk\"]}.";

    private static final String RECIPE_SYSTEM_PROMPT =
        "You are a cooking assistant for a local shop discovery app. The user will describe what they have " +
        "or what they feel like eating. Suggest 3 simple, realistic recipes they could make. Output ONLY " +
        "valid JSON, no other text, no markdown, in this exact shape: " +
        "{\"recipes\": [{\"name\": \"...\", \"ingredients\": [\"...\"]}]} " +
        "Each recipe's ingredients should be 3-6 short, concrete, commonly-stocked grocery item names " +
        "(single words or short phrases, e.g. \"rice\", \"onion\", \"tomato\", \"cooking oil\" - not full " +
        "sentences or brand names). Keep recipes achievable with everyday Indian grocery/kirana store items.";

    public ConsumerController(ProductRepository productRepository, GroqService groqService) {
        this.productRepository = productRepository;
        this.groqService = groqService;
    }

    /**
     * Search for a product by name, restricted to shops within radiusKm of
     * the consumer's current location. Results are sorted nearest-first and
     * each includes a ready-to-use Google Maps directions link.
     *
     * Example: /api/consumer/search?product=milk&lat=12.97&lng=80.22&radiusKm=0.5
     */
    @GetMapping("/search")
    public List<NearbyProductResult> search(@RequestParam String product,
                                             @RequestParam double lat,
                                             @RequestParam double lng,
                                             @RequestParam(defaultValue = "0.5") double radiusKm) {
        List<Product> matches = productRepository.findNearbyInStock(product, lat, lng, radiusKm);
        return matches.stream()
                .map(p -> new NearbyProductResult(p, lat, lng))
                .sorted(Comparator.comparingDouble(NearbyProductResult::getDistanceKm))
                .collect(Collectors.toList());
    }

    /**
     * Same as /search, but accepts free-form natural language (e.g. "something
     * for a headache" or "stuff for breakfast") and uses Groq to expand it
     * into concrete product keywords before searching. Falls back to treating
     * the raw query as a single keyword if Groq isn't configured or fails,
     * so this endpoint always returns *something* rather than erroring out.
     */
    @GetMapping("/smart-search")
    public Map<String, Object> smartSearch(@RequestParam String query,
                                            @RequestParam double lat,
                                            @RequestParam double lng,
                                            @RequestParam(defaultValue = "300") double radiusKm) {
        List<String> keywords = new ArrayList<>();
        boolean usedAi = false;

        if (groqService.isConfigured()) {
            try {
                JsonNode json = groqService.completeAsJson(SMART_SEARCH_SYSTEM_PROMPT, query);
                json.path("keywords").forEach(node -> keywords.add(node.asText()));
                usedAi = !keywords.isEmpty();
            } catch (Exception e) {
                // Fall through to the plain-text fallback below
            }
        }

        if (keywords.isEmpty()) {
            keywords.add(query);
        }

        // Search each keyword and merge results, deduping by product id,
        // keeping nearest-first order across all keyword matches.
        Map<Long, NearbyProductResult> merged = new LinkedHashMap<>();
        for (String keyword : keywords) {
            List<Product> matches = productRepository.findNearbyInStock(keyword, lat, lng, radiusKm);
            for (Product p : matches) {
                merged.putIfAbsent(p.getId(), new NearbyProductResult(p, lat, lng));
            }
        }

        List<NearbyProductResult> results = new ArrayList<>(merged.values());
        results.sort(Comparator.comparingDouble(NearbyProductResult::getDistanceKm));

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("results", results);
        response.put("interpretedKeywords", keywords);
        response.put("usedAi", usedAi);
        return response;
    }

    /**
     * "What can I cook with X" - suggests recipes via Groq, then for each
     * recipe finds which nearby shops stock ALL the required ingredients
     * (a "one-shot" shop), with partial matches shown as fallback when no
     * shop has everything.
     *
     * Example: /api/consumer/recipe-search?query=I only have rice, what can I make&lat=..&lng=..
     */
    @GetMapping("/recipe-search")
    public ResponseEntity<?> recipeSearch(@RequestParam String query,
                                           @RequestParam double lat,
                                           @RequestParam double lng,
                                           @RequestParam(defaultValue = "10") double radiusKm) {
        if (!groqService.isConfigured()) {
            return ResponseEntity.status(503).body(Map.of(
                    "error", "Recipe suggestions aren't configured yet. Set groq.api.key in application.properties."));
        }

        try {
            JsonNode json = groqService.completeAsJson(RECIPE_SYSTEM_PROMPT, query);
            List<RecipeSuggestion> recipes = new ArrayList<>();

            for (JsonNode recipeNode : json.path("recipes")) {
                String name = recipeNode.path("name").asText("Recipe");
                List<String> ingredients = new ArrayList<>();
                recipeNode.path("ingredients").forEach(n -> ingredients.add(n.asText()));
                if (ingredients.isEmpty()) continue;

                // For each ingredient, find nearby matches and group the
                // nearest matching product per shop.
                Map<Long, Map<String, Product>> shopIngredientMap = new HashMap<>();
                Map<Long, Shop> shopsById = new HashMap<>();

                for (String ingredient : ingredients) {
                    List<Product> matches = productRepository.findNearbyInStock(ingredient, lat, lng, radiusKm);
                    for (Product p : matches) {
                        Long shopId = p.getShop().getId();
                        shopIngredientMap.computeIfAbsent(shopId, k -> new HashMap<>());
                        shopIngredientMap.get(shopId).putIfAbsent(ingredient, p);
                        shopsById.putIfAbsent(shopId, p.getShop());
                    }
                }

                List<RecipeShopMatch> shopMatches = new ArrayList<>();
                for (Map.Entry<Long, Map<String, Product>> entry : shopIngredientMap.entrySet()) {
                    Shop shop = shopsById.get(entry.getKey());
                    Map<String, Product> found = entry.getValue();

                    List<RecipeIngredientItem> items = new ArrayList<>();
                    for (String ingredient : ingredients) {
                        Product p = found.get(ingredient);
                        items.add(new RecipeIngredientItem(
                                ingredient,
                                p != null ? p.getName() : null,
                                p != null ? p.getPrice() : null,
                                p != null
                        ));
                    }

                    double distanceKm = DistanceUtil.haversineKm(lat, lng, shop.getLatitude(), shop.getLongitude());
                    shopMatches.add(new RecipeShopMatch(shop, distanceKm, items, found.size(), ingredients.size()));
                }

                // Complete matches first, then by how many ingredients covered, then nearest
                shopMatches.sort(
                    Comparator.comparing(RecipeShopMatch::isComplete).reversed()
                        .thenComparing(Comparator.comparingInt(RecipeShopMatch::getMatchedCount).reversed())
                        .thenComparingDouble(RecipeShopMatch::getDistanceKm)
                );

                boolean hasCompleteMatch = shopMatches.stream().anyMatch(RecipeShopMatch::isComplete);
                List<RecipeShopMatch> comboPlan = null;
                List<String> unavailableIngredients = null;

                // If no single shop covers everything, work out the fewest
                // nearby shops that together cover as much of the list as
                // possible (greedy set cover - picks the shop covering the
                // most still-missing ingredients at each step, breaking ties
                // by distance).
                if (!hasCompleteMatch) {
                    Set<String> uncovered = new LinkedHashSet<>(ingredients);
                    comboPlan = new ArrayList<>();
                    List<Map.Entry<Long, Map<String, Product>>> shopEntries = new ArrayList<>(shopIngredientMap.entrySet());

                    while (!uncovered.isEmpty()) {
                        Long bestShopId = null;
                        Set<String> bestCoverage = null;
                        double bestDistance = Double.MAX_VALUE;

                        for (Map.Entry<Long, Map<String, Product>> entry : shopEntries) {
                            Set<String> coverage = new HashSet<>(entry.getValue().keySet());
                            coverage.retainAll(uncovered);
                            if (coverage.isEmpty()) continue;

                            Shop candidate = shopsById.get(entry.getKey());
                            double distance = DistanceUtil.haversineKm(lat, lng, candidate.getLatitude(), candidate.getLongitude());

                            if (bestCoverage == null || coverage.size() > bestCoverage.size()
                                    || (coverage.size() == bestCoverage.size() && distance < bestDistance)) {
                                bestShopId = entry.getKey();
                                bestCoverage = coverage;
                                bestDistance = distance;
                            }
                        }

                        if (bestShopId == null) break; // nothing left is available at any nearby shop

                        Map<String, Product> found = shopIngredientMap.get(bestShopId);
                        Shop chosenShop = shopsById.get(bestShopId);
                        List<RecipeIngredientItem> comboItems = new ArrayList<>();
                        for (String ing : bestCoverage) {
                            Product p = found.get(ing);
                            comboItems.add(new RecipeIngredientItem(ing, p.getName(), p.getPrice(), true));
                        }
                        comboPlan.add(new RecipeShopMatch(chosenShop, bestDistance, comboItems, comboItems.size(), comboItems.size()));
                        uncovered.removeAll(bestCoverage);
                    }

                    if (!uncovered.isEmpty()) {
                        unavailableIngredients = new ArrayList<>(uncovered);
                    }
                }

                List<RecipeShopMatch> top = shopMatches.stream().limit(5).collect(Collectors.toList());
                recipes.add(new RecipeSuggestion(name, ingredients, top, comboPlan, unavailableIngredients));
            }

            return ResponseEntity.ok(Map.of("recipes", recipes));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Couldn't come up with recipes right now: " + e.getMessage()));
        }
    }
}
