package com.app.expenseControl.controller;

import com.app.expenseControl.service.GoogleOAuthService;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/oauth/google")
public class GoogleOAuthController {

    private final GoogleOAuthService oauthService;

    public GoogleOAuthController(GoogleOAuthService oauthService) {
        this.oauthService = oauthService;
    }

    @GetMapping("/authorize")
    public ResponseEntity<Void> authorize() {
        String url = oauthService.buildAuthorizationUrl();
        return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(url)).build();
    }

    @GetMapping("/url")
    public OAuthUrlResponse url() {
        return new OAuthUrlResponse(
                oauthService.buildAuthorizationUrl(),
                oauthService.getRedirectUri(),
                oauthService.getScopes()
        );
    }

    @GetMapping("/callback")
    public OAuthTokenResponse callback(@RequestParam(value = "code", required = false) String code,
                                       @RequestParam(value = "error", required = false) String error) {
        if (error != null && !error.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OAuth error: " + error);
        }

        GoogleTokenResponse token = oauthService.exchangeCode(code);

        return new OAuthTokenResponse(
                token.getRefreshToken(),
                token.getAccessToken(),
                token.getExpiresInSeconds(),
                token.getScope(),
                token.getTokenType()
        );
    }

    public record OAuthUrlResponse(String url, String redirectUri, List<String> scopes) {}

    public record OAuthTokenResponse(
            String refreshToken,
            String accessToken,
            Long expiresIn,
            String scope,
            String tokenType
    ) {}
}
