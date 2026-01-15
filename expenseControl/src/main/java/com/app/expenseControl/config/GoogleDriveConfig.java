package com.app.expenseControl.config;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.HttpRequestInitializer;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.DriveScopes;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.UserCredentials;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.security.GeneralSecurityException;
import java.util.List;

@Configuration
public class GoogleDriveConfig {

    private static final String DEFAULT_OAUTH_CLIENT_ID =
            "233606169895-aljf2kuvcg717hgb70jc29ptgbtj194t.apps.googleusercontent.com";

    @Bean
    @Lazy
    public Drive googleDrive(@Value("${GOOGLE_SERVICE_ACCOUNT_JSON:}") String rawJson,
                             @Value("${GOOGLE_SERVICE_ACCOUNT_FILE:}") String jsonFile,
                             @Value("${GOOGLE_OAUTH_CLIENT_ID:}") String oauthClientId,
                             @Value("${GOOGLE_OAUTH_CLIENT_SECRET:}") String oauthClientSecret,
                             @Value("${GOOGLE_OAUTH_REFRESH_TOKEN:}") String oauthRefreshToken,
                             @Value("${app.drive.application-name:ExpenseControl}") String applicationName)
            throws GeneralSecurityException {

        GoogleCredentials credentials = buildCredentials(
                rawJson,
                jsonFile,
                oauthClientId,
                oauthClientSecret,
                oauthRefreshToken
        );

        try {
            if (credentials.createScopedRequired()) {
                credentials = credentials.createScoped(List.of(DriveScopes.DRIVE));
            }

            HttpRequestInitializer initializer = new HttpCredentialsAdapter(credentials);

            return new Drive.Builder(
                    GoogleNetHttpTransport.newTrustedTransport(),
                    JacksonFactory.getDefaultInstance(),
                    initializer
            ).setApplicationName(applicationName).build();
        } catch (Exception ex) {
            throw new IllegalStateException("Falha ao inicializar Google Drive: " + ex.getMessage(), ex);
        }
    }

    private GoogleCredentials buildCredentials(String rawJson,
                                               String jsonFile,
                                               String oauthClientId,
                                               String oauthClientSecret,
                                               String oauthRefreshToken) {
        if (oauthRefreshToken != null && !oauthRefreshToken.isBlank()) {
            String clientId = normalizeValue(oauthClientId, DEFAULT_OAUTH_CLIENT_ID);
            if (clientId == null || clientId.isBlank()
                    || oauthClientSecret == null || oauthClientSecret.isBlank()) {
                throw new IllegalStateException("GOOGLE_OAUTH_CLIENT_ID/SECRET nao configurados.");
            }

            return UserCredentials.newBuilder()
                    .setClientId(clientId)
                    .setClientSecret(oauthClientSecret.trim())
                    .setRefreshToken(oauthRefreshToken.trim())
                    .build();
        }

        String credentialsJson = resolveCredentialsJson(rawJson, jsonFile);
        if (credentialsJson == null || credentialsJson.isBlank()) {
            throw new IllegalStateException(
                    "Credenciais do Drive nao configuradas. Use GOOGLE_OAUTH_REFRESH_TOKEN " +
                    "ou GOOGLE_SERVICE_ACCOUNT_JSON/FILE."
            );
        }

        try {
            return GoogleCredentials.fromStream(
                    new ByteArrayInputStream(credentialsJson.getBytes(StandardCharsets.UTF_8))
            );
        } catch (IOException ex) {
            throw new IllegalStateException("Falha ao ler credenciais do Drive.", ex);
        }
    }

    private String resolveCredentialsJson(String rawJson, String jsonFile) {
        String value = (rawJson != null && !rawJson.isBlank()) ? rawJson : jsonFile;
        if (value == null) return null;

        String trimmed = value.trim();
        if (trimmed.isEmpty()) return trimmed;
        if (trimmed.startsWith("{")) {
            return normalizeInlineJson(trimmed);
        }

        try {
            var path = Paths.get(trimmed);
            if (!Files.exists(path)) {
                throw new IllegalStateException("Arquivo de credenciais nao encontrado: " + trimmed);
            }
            return new String(Files.readAllBytes(path), StandardCharsets.UTF_8);
        } catch (IOException ex) {
            throw new IllegalStateException("Falha ao ler arquivo de credenciais: " + trimmed, ex);
        }
    }

    private String normalizeInlineJson(String value) {
        return value.replace("\\n", "\n");
    }

    private String normalizeValue(String value, String fallback) {
        if (value == null) return fallback;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? fallback : trimmed;
    }
}
