package com.app.expenseControl.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, AuthenticationManager authManager) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .cors(Customizer.withDefaults())
                .authenticationManager(authManager)
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/oauth/google/**").permitAll()

                        .requestMatchers("/admin/**").hasRole("ADMIN")

                        .requestMatchers(HttpMethod.POST,
                                "/solicitacoes/*/anexos",
                                "/requests/*/attachments").hasAnyRole("ADMIN", "FILIAL")
                        .requestMatchers(HttpMethod.GET,
                                "/solicitacoes/*/anexos",
                                "/requests/*/attachments",
                                "/anexos/*/download",
                                "/attachments/*/download").hasAnyRole("ADMIN", "FILIAL")
                        .requestMatchers(HttpMethod.DELETE,
                                "/anexos/*",
                                "/attachments/*").hasAnyRole("ADMIN", "FILIAL")

                        .requestMatchers(HttpMethod.POST, "/solicitacoes").hasRole("FILIAL")
                        .requestMatchers(HttpMethod.PUT, "/solicitacoes/*/reenvio").hasRole("FILIAL")
                        .requestMatchers(HttpMethod.GET, "/solicitacoes/**").hasRole("FILIAL")
                        .requestMatchers(HttpMethod.GET, "/categorias").hasRole("FILIAL")

                        .anyRequest().authenticated()
                )
                .httpBasic(Customizer.withDefaults());

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(UserDetailsService userDetailsService,
                                                       PasswordEncoder passwordEncoder) {

        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);

        return new ProviderManager(provider);
    }
}
