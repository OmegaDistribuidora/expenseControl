package com.app.expenseControl.config;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

import javax.sql.DataSource;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

@Configuration
public class DataSourceConfig {

    @Bean
    public DataSource dataSource(
            @Value("${spring.datasource.url}") String localJdbcUrl,
            @Value("${spring.datasource.username:}") String localUsername,
            @Value("${spring.datasource.password:}") String localPassword,
            @Value("${spring.datasource.driver-class-name:org.postgresql.Driver}") String driverClassName,
            @Value("${DATABASE_URL:}") String databaseUrl
    ) {
        DatabaseSettings settings = resolveSettings(localJdbcUrl, localUsername, localPassword, databaseUrl);

        HikariDataSource dataSource = new HikariDataSource();
        dataSource.setDriverClassName(driverClassName);
        dataSource.setJdbcUrl(settings.jdbcUrl());
        if (StringUtils.hasText(settings.username())) {
            dataSource.setUsername(settings.username());
        }
        if (settings.password() != null) {
            dataSource.setPassword(settings.password());
        }
        return dataSource;
    }

    private DatabaseSettings resolveSettings(String localJdbcUrl,
                                             String localUsername,
                                             String localPassword,
                                             String databaseUrl) {
        if (!StringUtils.hasText(databaseUrl)) {
            return new DatabaseSettings(localJdbcUrl, localUsername, localPassword);
        }

        String trimmed = databaseUrl.trim();
        if (trimmed.startsWith("jdbc:postgresql://")) {
            return new DatabaseSettings(trimmed, localUsername, localPassword);
        }

        URI uri = parseUri(trimmed);
        String scheme = uri.getScheme();
        if (!"postgres".equalsIgnoreCase(scheme) && !"postgresql".equalsIgnoreCase(scheme)) {
            throw new IllegalStateException("DATABASE_URL inv\u00e1lida: esquema deve ser postgres:// ou postgresql://");
        }

        String host = uri.getHost();
        if (!StringUtils.hasText(host)) {
            throw new IllegalStateException("DATABASE_URL inv\u00e1lida: host ausente.");
        }

        String path = uri.getPath();
        if (!StringUtils.hasText(path) || "/".equals(path)) {
            throw new IllegalStateException("DATABASE_URL inv\u00e1lida: nome do banco ausente.");
        }

        int port = uri.getPort() > 0 ? uri.getPort() : 5432;
        StringBuilder jdbc = new StringBuilder("jdbc:postgresql://")
                .append(host)
                .append(":")
                .append(port)
                .append(path);

        if (StringUtils.hasText(uri.getRawQuery())) {
            jdbc.append("?").append(uri.getRawQuery());
        }

        Credentials credentials = parseCredentials(uri.getRawUserInfo());
        String username = StringUtils.hasText(credentials.username()) ? credentials.username() : localUsername;
        String password = credentials.password() != null ? credentials.password() : localPassword;

        return new DatabaseSettings(jdbc.toString(), username, password);
    }

    private URI parseUri(String value) {
        try {
            return new URI(value);
        } catch (URISyntaxException ex) {
            throw new IllegalStateException("DATABASE_URL inv\u00e1lida.", ex);
        }
    }

    private Credentials parseCredentials(String rawUserInfo) {
        if (!StringUtils.hasText(rawUserInfo)) {
            return new Credentials(null, null);
        }

        String[] parts = rawUserInfo.split(":", 2);
        String username = decode(parts[0]);
        String password = parts.length > 1 ? decode(parts[1]) : "";
        return new Credentials(username, password);
    }

    private String decode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }

    private record DatabaseSettings(String jdbcUrl, String username, String password) {
    }

    private record Credentials(String username, String password) {
    }
}
