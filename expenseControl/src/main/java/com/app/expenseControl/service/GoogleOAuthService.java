package com.app.expenseControl.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeRequestUrl;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeTokenRequest;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.google.api.services.drive.DriveScopes;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.List;

@Service
public class GoogleOAuthService {

    private static final List<String> SCOPES = List.of(DriveScopes.DRIVE);
    private static final String DEFAULT_CLIENT_ID =
            "233606169895-aljf2kuvcg717hgb70jc29ptgbtj194t.apps.googleusercontent.com";
    private static final String DEFAULT_REDIRECT_URI =
            "http://localhost:8080/oauth/google/callback";

    private final String clientId;
    private final String clientSecret;
    private final String redirectUri;

    public GoogleOAuthService(@Value("${GOOGLE_OAUTH_CLIENT_ID:}") String clientId,
                              @Value("${GOOGLE_OAUTH_CLIENT_SECRET:}") String clientSecret,
                              @Value("${GOOGLE_OAUTH_REDIRECT_URI:}") String redirectUri) {
        this.clientId = normalizeValue(clientId, DEFAULT_CLIENT_ID);
        this.clientSecret = clientSecret == null ? "" : clientSecret.trim();
        this.redirectUri = normalizeValue(redirectUri, DEFAULT_REDIRECT_URI);
    }

    public String buildAuthorizationUrl() {
        ensureAuthorizeConfigured();
        return new GoogleAuthorizationCodeRequestUrl(clientId, redirectUri, SCOPES)
                .setAccessType("offline")
                .setApprovalPrompt("force")
                .build();
    }

    public GoogleTokenResponse exchangeCode(String code) {
        ensureTokenExchangeConfigured();
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("Código OAuth ausente.");
        }

        try {
            return new GoogleAuthorizationCodeTokenRequest(
                    GoogleNetHttpTransport.newTrustedTransport(),
                    JacksonFactory.getDefaultInstance(),
                    "https://oauth2.googleapis.com/token",
                    clientId,
                    clientSecret,
                    code.trim(),
                    redirectUri
            ).execute();
        } catch (IOException | GeneralSecurityException ex) {
            throw new IllegalStateException("Falha ao trocar código OAuth por token.", ex);
        }
    }

    public String getRedirectUri() {
        return redirectUri;
    }

    public List<String> getScopes() {
        return SCOPES;
    }

    private void ensureAuthorizeConfigured() {
        if (clientId.isBlank()) {
            throw new IllegalStateException("GOOGLE_OAUTH_CLIENT_ID não configurado.");
        }
        if (redirectUri.isBlank()) {
            throw new IllegalStateException("GOOGLE_OAUTH_REDIRECT_URI não configurado.");
        }
    }

    private void ensureTokenExchangeConfigured() {
        if (clientId.isBlank() || clientSecret.isBlank()) {
            throw new IllegalStateException("GOOGLE_OAUTH_CLIENT_ID/SECRET não configurados.");
        }
        if (redirectUri.isBlank()) {
            throw new IllegalStateException("GOOGLE_OAUTH_REDIRECT_URI não configurado.");
        }
    }

    private String normalizeValue(String value, String fallback) {
        if (value == null) return fallback;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? fallback : trimmed;
    }
}
