package com.shopspot.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Base64;

/**
 * Thin wrapper around the Groq API (OpenAI-compatible chat completions
 * endpoint). Used for structured "parse this into JSON" tasks: smart
 * search query parsing and bulk inventory update parsing.
 *
 * Get a free API key at https://console.groq.com and set it in
 * application.properties as groq.api.key
 */
@Service
public class GroqService {

    @Value("${groq.api.key:}")
    private String apiKey;

    @Value("${groq.model:openai/gpt-oss-20b}")
    private String model;

    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String GROQ_TRANSCRIPTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
    // Groq's hosted Whisper model - handles Hindi, Tamil, Telugu, and many
    // other languages plus mixed/code-switched speech reasonably well.
    private static final String WHISPER_MODEL = "whisper-large-v3-turbo";
    // Groq's current vision-capable model (image + text input). Groq
    // periodically retires/renames models - check console.groq.com/docs/models
    // if this starts returning a model_not_found error.
    private static final String VISION_MODEL = "qwen/qwen3.6-27b";

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
    private final ObjectMapper mapper = new ObjectMapper();

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    /**
     * Sends a system + user prompt to Groq and returns the raw text content
     * of the model's reply. Callers are expected to ask for JSON-only
     * output in the system prompt and parse the result themselves.
     */
    public String complete(String systemPrompt, String userMessage) throws Exception {
        if (!isConfigured()) {
            throw new IllegalStateException("Groq API key is not configured (set groq.api.key in application.properties).");
        }

        String escapedSystem = mapper.writeValueAsString(systemPrompt);
        String escapedUser = mapper.writeValueAsString(userMessage);

        String body = "{"
                + "\"model\": \"" + model + "\","
                + "\"messages\": ["
                + "{\"role\": \"system\", \"content\": " + escapedSystem + "},"
                + "{\"role\": \"user\", \"content\": " + escapedUser + "}"
                + "],"
                + "\"temperature\": 0.1"
                + "}";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(GROQ_URL))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(15))
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("Groq API error (" + response.statusCode() + "): " + response.body());
        }

        JsonNode root = mapper.readTree(response.body());
        return root.path("choices").get(0).path("message").path("content").asText();
    }

    /** Same as complete(), but strips markdown code fences if the model adds them anyway. */
    public JsonNode completeAsJson(String systemPrompt, String userMessage) throws Exception {
        String raw = complete(systemPrompt, userMessage);
        String cleaned = raw.trim()
                .replaceAll("^```json", "")
                .replaceAll("^```", "")
                .replaceAll("```$", "")
                .trim();
        return mapper.readTree(cleaned);
    }

    /**
     * Sends recorded audio to Groq's Whisper endpoint and returns the
     * transcribed text. Whisper auto-detects the spoken language, so this
     * works for a seller speaking Hindi, Tamil, Telugu, English, or a mix,
     * without needing a language selector on the frontend.
     *
     * Java's HttpClient has no built-in multipart/form-data support, so the
     * request body is built by hand below.
     */
    public String transcribeAudio(byte[] audioBytes, String filename, String contentType) throws Exception {
        if (!isConfigured()) {
            throw new IllegalStateException("Groq API key is not configured (set groq.api.key in application.properties).");
        }

        String boundary = "ShopSpotBoundary" + System.currentTimeMillis();
        java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();

        // "model" field
        out.write(("--" + boundary + "\r\n").getBytes(java.nio.charset.StandardCharsets.UTF_8));
        out.write("Content-Disposition: form-data; name=\"model\"\r\n\r\n".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        out.write((WHISPER_MODEL + "\r\n").getBytes(java.nio.charset.StandardCharsets.UTF_8));

        // "file" field (the actual audio bytes)
        out.write(("--" + boundary + "\r\n").getBytes(java.nio.charset.StandardCharsets.UTF_8));
        out.write(("Content-Disposition: form-data; name=\"file\"; filename=\"" + filename + "\"\r\n")
                .getBytes(java.nio.charset.StandardCharsets.UTF_8));
        out.write(("Content-Type: " + contentType + "\r\n\r\n").getBytes(java.nio.charset.StandardCharsets.UTF_8));
        out.write(audioBytes);
        out.write("\r\n".getBytes(java.nio.charset.StandardCharsets.UTF_8));

        out.write(("--" + boundary + "--\r\n").getBytes(java.nio.charset.StandardCharsets.UTF_8));

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(GROQ_TRANSCRIPTION_URL))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                .timeout(Duration.ofSeconds(30))
                .POST(HttpRequest.BodyPublishers.ofByteArray(out.toByteArray()))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("Groq transcription error (" + response.statusCode() + "): " + response.body());
        }

        JsonNode root = mapper.readTree(response.body());
        return root.path("text").asText();
    }

    /**
     * Sends a product photo to Groq's vision model and asks it to identify
     * what the product is, returning a short, shop-friendly product name.
     * Used by the seller's "add product from photo" flow - the suggestion
     * always lands in an editable field, never saved automatically, since
     * vision models can misidentify products (especially local/regional
     * items without English packaging).
     */
    public String recognizeProductName(byte[] imageBytes, String mimeType) throws Exception {
        if (!isConfigured()) {
            throw new IllegalStateException("Groq API key is not configured (set groq.api.key in application.properties).");
        }

        String base64Image = Base64.getEncoder().encodeToString(imageBytes);
        String dataUrl = "data:" + mimeType + ";base64," + base64Image;

        String systemText = "You identify grocery/kirana shop products from photos for inventory entry. " +
                "Reply with ONLY valid JSON, no other text, no markdown: {\"productName\": \"...\"} " +
                "Keep the name short (2-4 words), in Title Case, the way a shop would list it on a shelf " +
                "(e.g. \"Basmati Rice\", \"Amul Butter 500g\", \"Red Onions\"). If you cannot clearly identify " +
                "a product, respond with {\"productName\": null}.";

        // Build the request body by hand (rather than via ObjectMapper.writeValueAsString on a
        // Map) so the image content block's nested structure is easy to see and edit here.
        // response_format=json_object forces Groq to return clean JSON with no
        // preamble - without this, some vision models (e.g. Qwen's "thinking
        // mode") can prepend a <think>...</think> reasoning block before the
        // actual answer, which breaks naive JSON parsing.
        String body = "{"
                + "\"model\": \"" + VISION_MODEL + "\","
                + "\"messages\": ["
                + "{\"role\": \"system\", \"content\": " + mapper.writeValueAsString(systemText) + "},"
                + "{\"role\": \"user\", \"content\": ["
                + "{\"type\": \"text\", \"text\": \"What product is this?\"},"
                + "{\"type\": \"image_url\", \"image_url\": {\"url\": " + mapper.writeValueAsString(dataUrl) + "}}"
                + "]}"
                + "],"
                + "\"temperature\": 0.1,"
                + "\"response_format\": {\"type\": \"json_object\"}"
                + "}";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(GROQ_URL))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(20))
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("Groq vision error (" + response.statusCode() + "): " + response.body());
        }

        JsonNode root = mapper.readTree(response.body());
        String raw = root.path("choices").get(0).path("message").path("content").asText();
        // Defensive cleanup: strip any leftover <think>...</think> reasoning
        // block and markdown code fences before parsing, in case the model
        // includes them even with json_object mode requested.
        String cleaned = raw
                .replaceAll("(?s)<think>.*?</think>", "")
                .trim()
                .replaceAll("^```json", "")
                .replaceAll("^```", "")
                .replaceAll("```$", "")
                .trim();
        JsonNode parsed = mapper.readTree(cleaned);
        JsonNode nameNode = parsed.path("productName");
        return (nameNode.isNull() || nameNode.asText().isBlank()) ? null : nameNode.asText();
    }
}