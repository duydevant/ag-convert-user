package com.ant.keycloak.auth0;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.jboss.logging.Logger;
import org.keycloak.authentication.AuthenticationFlowContext;
import org.keycloak.authentication.AuthenticationFlowError;
import org.keycloak.authentication.authenticators.browser.UsernamePasswordForm;
import org.keycloak.events.Errors;
import org.keycloak.models.UserCredentialModel;
import org.keycloak.models.UserModel;

import jakarta.ws.rs.core.MultivaluedMap;
import jakarta.ws.rs.core.Response;

import static org.keycloak.services.validation.Validation.FIELD_PASSWORD;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.stream.Collectors;


/**
 * Custom Keycloak Authenticator that extends the default UsernamePasswordForm.
 *
 * Flow:
 * 1. User enters username/password on Keycloak's standard login page
 * 2. This authenticator intercepts the credential validation
 * 3. If user exists in Keycloak AND has attribute "auth0_migrated" = "true":
 *    → Normal Keycloak password validation (no Auth0 call)
 * 4. If user exists in Keycloak BUT NOT migrated:
 *    a. Tries Keycloak password validation first
 *    b. If Keycloak fails → calls Auth0 /oauth/token to validate credentials
 *    c. If Auth0 validates → sets password in Keycloak + marks "auth0_migrated" = "true"
 * 5. If user does NOT exist in Keycloak:
 *    a. Calls Auth0 /oauth/token to validate credentials
 *    b. If Auth0 validates → fetches user profile from Auth0
 *    c. Creates user in Keycloak with Auth0 profile data
 *    d. Sets password + marks "auth0_migrated" = "true"
 *    e. Continues authentication with the newly created user
 */
public class Auth0MigrationAuthenticator extends UsernamePasswordForm {

    private static final Logger LOG = Logger.getLogger(Auth0MigrationAuthenticator.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final String ATTR_MIGRATED = "auth0_migrated";

    @Override
    public void action(AuthenticationFlowContext context) {
        MultivaluedMap<String, String> formData = context.getHttpRequest().getDecodedFormParameters();
        String username = formData.getFirst("username");
        String password = formData.getFirst("password");

        if (username == null || username.isEmpty() || password == null || password.isEmpty()) {
            // Let the parent handle the error (shows "Invalid username or password")
            super.action(context);
            return;
        }

        // Normalize: treat username as email (trim + lowercase)
        username = username.trim().toLowerCase();

        // Try to find user in Keycloak (by username or email)
        UserModel user = context.getSession().users()
                .getUserByUsername(context.getRealm(), username);
        if (user == null) {
            user = context.getSession().users()
                    .getUserByEmail(context.getRealm(), username);
        }

        if (user != null) {
            // ─── USER EXISTS IN KEYCLOAK ───
            String migrated = user.getFirstAttribute(ATTR_MIGRATED);
            if ("true".equalsIgnoreCase(migrated)) {
                // Already migrated → normal Keycloak auth
                LOG.debugf("User %s already migrated, using standard Keycloak auth", username);
                super.action(context);
                return;
            }

            // Not yet migrated: try Keycloak first, then Auth0
            LOG.infof("[Auth0 Migration] User %s exists but not migrated, trying Keycloak then Auth0", username);

            // Try Keycloak password first (in case password was set via import API)
            boolean keycloakValid = user.credentialManager()
                    .isValid(UserCredentialModel.password(password));
            if (keycloakValid) {
                LOG.infof("[Auth0 Migration] Keycloak password valid for %s, marking as migrated", username);
                user.setSingleAttribute(ATTR_MIGRATED, "true");
                context.setUser(user);
                context.success();
                return;
            }

            // Keycloak failed → try Auth0
            handleAuth0Migration(context, user, username, password);
        } else {
            // ─── USER DOES NOT EXIST IN KEYCLOAK ───
            LOG.infof("[Auth0 Migration] User %s not found in Keycloak, attempting Auth0 validation", username);
            handleAuth0MigrationWithUserCreation(context, username, password);
        }
    }

    /**
     * Handle Auth0 migration for an EXISTING Keycloak user.
     * Validates against Auth0, sets password in Keycloak, marks as migrated.
     */
    private void handleAuth0Migration(AuthenticationFlowContext context,
                                       UserModel user, String username, String password) {
        String auth0Domain = getConfig(context, "auth0Domain");
        String auth0ClientId = getConfig(context, "auth0ClientId");
        String auth0ClientSecret = getConfig(context, "auth0ClientSecret");
        String auth0Connection = getConfig(context, "auth0Connection");

        if (auth0Domain == null || auth0ClientId == null) {
            LOG.warn("[Auth0 Migration] Auth0 config missing, failing authentication");
            failAuthentication(context, user);
            return;
        }

        try {
            boolean auth0Valid = validateWithAuth0(
                auth0Domain, auth0ClientId, auth0ClientSecret,
                auth0Connection, username, password
            );

            if (auth0Valid) {
                LOG.infof("[Auth0 Migration] ✅ Auth0 validated for %s — migrating password to Keycloak", username);

                // Set password in Keycloak
                UserCredentialModel credential = UserCredentialModel.password(password, false);
                user.credentialManager().updateCredential(credential);

                // Mark as migrated
                user.setSingleAttribute(ATTR_MIGRATED, "true");

                LOG.infof("[Auth0 Migration] 🎉 Password migrated for %s", username);

                // Complete authentication successfully
                context.setUser(user);
                context.success();
            } else {
                LOG.warnf("[Auth0 Migration] ❌ Auth0 rejected credentials for %s", username);
                failAuthentication(context, user);
            }
        } catch (Exception e) {
            LOG.errorf(e, "[Auth0 Migration] Error validating with Auth0 for %s", username);
            failAuthentication(context, user);
        }
    }

    /**
     * Handle Auth0 migration when user does NOT exist in Keycloak.
     * 1. Validates credentials against Auth0
     * 2. Fetches user profile from Auth0 (using the access_token)
     * 3. Creates user in Keycloak
     * 4. Sets password + marks as migrated
     */
    private void handleAuth0MigrationWithUserCreation(AuthenticationFlowContext context,
                                                        String username, String password) {
        String auth0Domain = getConfig(context, "auth0Domain");
        String auth0ClientId = getConfig(context, "auth0ClientId");
        String auth0ClientSecret = getConfig(context, "auth0ClientSecret");
        String auth0Connection = getConfig(context, "auth0Connection");

        if (auth0Domain == null || auth0ClientId == null) {
            LOG.warn("[Auth0 Migration] Auth0 config missing, failing authentication");
            failAuthentication(context, null);
            return;
        }

        try {
            // Step 1: Validate credentials with Auth0 and get access_token
            String accessToken = validateWithAuth0AndGetToken(
                auth0Domain, auth0ClientId, auth0ClientSecret,
                auth0Connection, username, password
            );

            if (accessToken == null) {
                LOG.warnf("[Auth0 Migration] ❌ Auth0 rejected credentials for %s (user not in Keycloak)", username);
                failAuthentication(context, null);
                return;
            }

            LOG.infof("[Auth0 Migration] ✅ Auth0 validated for %s — creating user in Keycloak", username);

            // Step 2: Fetch user profile from Auth0 using /userinfo
            Auth0UserProfile profile = fetchAuth0UserProfile(auth0Domain, accessToken);

            // Step 3: Create user in Keycloak
            UserModel newUser = context.getSession().users()
                    .addUser(context.getRealm(), username);
            newUser.setEmail(profile.email != null ? profile.email : username);
            newUser.setFirstName(profile.firstName != null ? profile.firstName : "");
            newUser.setLastName(profile.lastName != null ? profile.lastName : "");
            newUser.setEnabled(true);
            newUser.setEmailVerified(profile.emailVerified);

            // Store Auth0 user_id as attribute for reference
            if (profile.sub != null) {
                newUser.setSingleAttribute("auth0_user_id", profile.sub);
            }

            // Step 4: Set password in Keycloak
            UserCredentialModel credential = UserCredentialModel.password(password, false);
            newUser.credentialManager().updateCredential(credential);

            // Step 5: Mark as migrated
            newUser.setSingleAttribute(ATTR_MIGRATED, "true");

            LOG.infof("[Auth0 Migration] 🎉 User %s created and migrated from Auth0 (name: %s %s)",
                    username, profile.firstName, profile.lastName);

            // Complete authentication with the new user
            context.setUser(newUser);
            context.success();

        } catch (Exception e) {
            LOG.errorf(e, "[Auth0 Migration] Error during user creation/migration for %s", username);
            failAuthentication(context, null);
        }
    }

    /**
     * Show authentication failure (invalid credentials error page)
     */
    private void failAuthentication(AuthenticationFlowContext context, UserModel user) {
        if (user != null) {
            context.getEvent().user(user);
        }
        context.getEvent().error(Errors.INVALID_USER_CREDENTIALS);
        Response challengeResponse = challenge(context, getDefaultChallengeMessage(context), FIELD_PASSWORD);
        context.failureChallenge(AuthenticationFlowError.INVALID_CREDENTIALS, challengeResponse);
        context.clearUser();
    }

    /**
     * Call Auth0 /oauth/token to validate user credentials.
     * Returns true if credentials are valid.
     */
    private boolean validateWithAuth0(String domain, String clientId, String clientSecret,
                                       String connection, String email, String password) throws Exception {
        return validateWithAuth0AndGetToken(domain, clientId, clientSecret, connection, email, password) != null;
    }

    /**
     * Call Auth0 /oauth/token to validate user credentials.
     * Returns access_token if valid, null if invalid.
     */
    private String validateWithAuth0AndGetToken(String domain, String clientId, String clientSecret,
                                                  String connection, String email, String password) throws Exception {
        URL url = new URL("https://" + domain + "/oauth/token");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setDoOutput(true);
        conn.setConnectTimeout(10000);
        conn.setReadTimeout(10000);

        // Build JSON payload
        String payload = MAPPER.writeValueAsString(new java.util.HashMap<String, String>() {{
            put("grant_type", "http://auth0.com/oauth/grant-type/password-realm");
            put("username", email);
            put("password", password);
            put("client_id", clientId);
            put("client_secret", clientSecret);
            put("realm", connection != null ? connection : "Username-Password-Authentication");
            put("scope", "openid profile email");
        }});

        try (OutputStream os = conn.getOutputStream()) {
            os.write(payload.getBytes(StandardCharsets.UTF_8));
        }

        int responseCode = conn.getResponseCode();
        LOG.debugf("[Auth0 Migration] Auth0 /oauth/token response code: %d for %s", responseCode, email);

        if (responseCode == 200) {
            // Read response to get access_token
            String responseBody;
            try (BufferedReader br = new BufferedReader(
                    new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                responseBody = br.lines().collect(Collectors.joining());
            }
            JsonNode json = MAPPER.readTree(responseBody);
            String accessToken = json.has("access_token") ? json.get("access_token").asText() : null;
            conn.disconnect();
            return accessToken;
        }

        conn.disconnect();
        return null;
    }

    /**
     * Fetch user profile from Auth0 using /userinfo endpoint.
     * Falls back to basic info if /userinfo fails.
     */
    private Auth0UserProfile fetchAuth0UserProfile(String domain, String accessToken) {
        Auth0UserProfile profile = new Auth0UserProfile();

        try {
            URL url = new URL("https://" + domain + "/userinfo");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Authorization", "Bearer " + accessToken);
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);

            int responseCode = conn.getResponseCode();
            if (responseCode == 200) {
                String responseBody;
                try (BufferedReader br = new BufferedReader(
                        new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                    responseBody = br.lines().collect(Collectors.joining());
                }

                JsonNode json = MAPPER.readTree(responseBody);

                profile.sub = json.has("sub") ? json.get("sub").asText() : null;
                profile.email = json.has("email") ? json.get("email").asText() : null;
                profile.emailVerified = json.has("email_verified") && json.get("email_verified").asBoolean();

                // Parse name: Auth0 may have "name", "given_name", "family_name"
                if (json.has("given_name")) {
                    profile.firstName = json.get("given_name").asText();
                }
                if (json.has("family_name")) {
                    profile.lastName = json.get("family_name").asText();
                }
                // Fallback: parse "name" if given_name/family_name not available
                if (profile.firstName == null && json.has("name")) {
                    String fullName = json.get("name").asText();
                    if (fullName != null && !fullName.isEmpty()) {
                        String[] parts = fullName.split("\\s+", 2);
                        profile.firstName = parts[0];
                        profile.lastName = parts.length > 1 ? parts[1] : "";
                    }
                }
                // Fallback: parse "nickname"
                if (profile.firstName == null && json.has("nickname")) {
                    profile.firstName = json.get("nickname").asText();
                }

                LOG.infof("[Auth0 Migration] Fetched Auth0 profile: email=%s, name=%s %s, sub=%s",
                        profile.email, profile.firstName, profile.lastName, profile.sub);
            } else {
                LOG.warnf("[Auth0 Migration] /userinfo returned %d, using minimal profile", responseCode);
            }

            conn.disconnect();
        } catch (Exception e) {
            LOG.warnf(e, "[Auth0 Migration] Failed to fetch Auth0 profile, using minimal profile");
        }

        return profile;
    }

    /**
     * Get config value from authenticator config
     */
    private String getConfig(AuthenticationFlowContext context, String key) {
        if (context.getAuthenticatorConfig() == null) return null;
        return context.getAuthenticatorConfig().getConfig().get(key);
    }

    /**
     * Simple POJO to hold Auth0 user profile data
     */
    private static class Auth0UserProfile {
        String sub;           // Auth0 user_id (e.g., "auth0|abc123")
        String email;
        boolean emailVerified;
        String firstName;
        String lastName;
    }
}
