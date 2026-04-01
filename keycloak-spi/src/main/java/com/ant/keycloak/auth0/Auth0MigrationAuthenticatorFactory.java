package com.ant.keycloak.auth0;

import org.keycloak.Config;
import org.keycloak.authentication.Authenticator;
import org.keycloak.authentication.AuthenticatorFactory;
import org.keycloak.models.AuthenticationExecutionModel;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.KeycloakSessionFactory;
import org.keycloak.provider.ProviderConfigProperty;

import java.util.Arrays;
import java.util.List;

/**
 * Factory for the Auth0 Migration Authenticator.
 * Registers the authenticator in Keycloak and defines its configuration properties.
 */
public class Auth0MigrationAuthenticatorFactory implements AuthenticatorFactory {

    public static final String PROVIDER_ID = "auth0-migration-authenticator";
    private static final Auth0MigrationAuthenticator SINGLETON = new Auth0MigrationAuthenticator();

    @Override
    public String getId() {
        return PROVIDER_ID;
    }

    @Override
    public String getDisplayType() {
        return "Auth0 Migration Authenticator";
    }

    @Override
    public String getHelpText() {
        return "Validates user credentials against Auth0 for users that haven't been migrated yet. "
             + "On successful Auth0 validation, sets the password in Keycloak and marks the user as migrated.";
    }

    @Override
    public String getReferenceCategory() {
        return "password";
    }

    @Override
    public boolean isConfigurable() {
        return true;
    }

    @Override
    public boolean isUserSetupAllowed() {
        return false;
    }

    @Override
    public AuthenticationExecutionModel.Requirement[] getRequirementChoices() {
        return new AuthenticationExecutionModel.Requirement[]{
            AuthenticationExecutionModel.Requirement.REQUIRED,
            AuthenticationExecutionModel.Requirement.ALTERNATIVE,
            AuthenticationExecutionModel.Requirement.DISABLED,
        };
    }

    @Override
    public List<ProviderConfigProperty> getConfigProperties() {
        return Arrays.asList(
            createProperty("auth0Domain",
                "Auth0 Domain",
                "Auth0 tenant domain (e.g., dev-xxxx.us.auth0.com)",
                ProviderConfigProperty.STRING_TYPE,
                ""),
            createProperty("auth0ClientId",
                "Auth0 Client ID",
                "Auth0 Application Client ID",
                ProviderConfigProperty.STRING_TYPE,
                ""),
            createProperty("auth0ClientSecret",
                "Auth0 Client Secret",
                "Auth0 Application Client Secret",
                ProviderConfigProperty.PASSWORD,
                ""),
            createProperty("auth0Connection",
                "Auth0 Connection",
                "Auth0 database connection name (default: Username-Password-Authentication)",
                ProviderConfigProperty.STRING_TYPE,
                "Username-Password-Authentication")
        );
    }

    private ProviderConfigProperty createProperty(String name, String label,
                                                    String helpText, String type,
                                                    String defaultValue) {
        ProviderConfigProperty prop = new ProviderConfigProperty();
        prop.setName(name);
        prop.setLabel(label);
        prop.setHelpText(helpText);
        prop.setType(type);
        prop.setDefaultValue(defaultValue);
        return prop;
    }

    @Override
    public Authenticator create(KeycloakSession session) {
        return SINGLETON;
    }

    @Override
    public void init(Config.Scope config) {
        // No initialization needed
    }

    @Override
    public void postInit(KeycloakSessionFactory factory) {
        // No post-initialization needed
    }

    @Override
    public void close() {
        // Nothing to close
    }
}
