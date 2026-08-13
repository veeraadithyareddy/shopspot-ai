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

    @Value("${groq.model:llama-3.1-8b-instant}")
    private String model;

    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String GROQ_TRANSCRIPTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
    // Groq's hosted Whisper model - handles Hindi, Tamil, Telugu, and many
    // other languages plus mixed/code-switched speech reasonably well.
    private static final String WHISPER_MODEL = "whisper-large-v3-turbo";

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
}