<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username','password') displayInfo=realm.password && realm.registrationAllowed && !registrationDisabled??; section>
    <#if section = "header">
        ${msg("loginAccountTitle")}
        <span class="login-subtitle">${msg("loginAccountSubtitle", realm.displayName!realm.name)}</span>
    <#elseif section = "form">
        <div id="kc-form">
            <div id="kc-form-wrapper">
                <#if realm.password>
                    <form id="kc-form-login" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post">
                        <#if !usernameHidden??>
                            <div class="${properties.kcFormGroupClass!} floating-label-group">
                                <input tabindex="1" id="username" class="${properties.kcInputClass!}" name="username" value="${(login.username!'')}" type="text" autocomplete="off" placeholder=" "
                                       aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>" />
                                <label for="username" class="floating-label">
                                    <#if !realm.loginWithEmailAllowed>${msg("username")}<#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}<#else>${msg("email")}</#if>
                                </label>
                                <#if messagesPerField.existsError('username','password')>
                                    <span id="input-error" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                                        ${kcSanitize(messagesPerField.getFirstError('username','password'))?no_esc}
                                    </span>
                                </#if>
                            </div>
                        </#if>
                        <div class="${properties.kcFormGroupClass!} floating-label-group">
                            <div class="${properties.kcInputGroup!}">
                                <input tabindex="2" id="password" class="${properties.kcInputClass!}" name="password" type="password" autocomplete="off" placeholder=" "
                                       aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>" />
                                <label for="password" class="floating-label">
                                    ${msg("password")}
                                </label>
                                <button class="${properties.kcFormPasswordVisibilityButtonClass!}" type="button" aria-label="${msg('showPassword')}"
                                        aria-controls="password" data-password-toggle
                                        data-icon-show="${properties.kcFormPasswordVisibilityIconShow!}" data-icon-hide="${properties.kcFormPasswordVisibilityIconHide!}"
                                        data-label-show="${msg('showPassword')}" data-label-hide="${msg('hidePassword')}">
                                    <i class="${properties.kcFormPasswordVisibilityIconShow!}" aria-hidden="true"></i>
                                </button>
                            </div>
                            <#if usernameHidden?? && messagesPerField.existsError('username','password')>
                                <span id="input-error" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                                    ${kcSanitize(messagesPerField.getFirstError('username','password'))?no_esc}
                                </span>
                            </#if>
                        </div>
                        <div class="${properties.kcFormGroupClass!} kc-form-options-row">
                            <div id="kc-form-options" class="kc-form-options-left">
                                <#if realm.rememberMe && !usernameHidden??>
                                    <div class="checkbox">
                                        <label class="remember-me-label">
                                            <#if login.rememberMe??>
                                                <input tabindex="3" id="rememberMe" name="rememberMe" type="checkbox" checked> ${msg("rememberMe")}
                                            <#else>
                                                <input tabindex="3" id="rememberMe" name="rememberMe" type="checkbox"> ${msg("rememberMe")}
                                            </#if>
                                        </label>
                                    </div>
                                </#if>
                            </div>
                            <div class="kc-form-options-right">
                                <#if realm.resetPasswordAllowed>
                                    <a tabindex="5" href="${url.loginResetCredentialsUrl}" class="reset-password-link">${msg("doForgotPassword")}</a>
                                </#if>
                            </div>
                        </div>
                        <div id="kc-form-buttons" class="${properties.kcFormGroupClass!}" style="margin-top: 8px;">
                            <input type="hidden" id="id-hidden-input" name="credentialId" <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>/>
                            <input tabindex="4" class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!} ${properties.kcButtonLargeClass!}" name="login" id="kc-login" type="submit" value="${msg("logIn")}"/>
                        </div>
                    </form>
                    <script>
                        document.title = "Log in | ${realm.displayName!realm.name}";
                        (function() {
                            var fa = document.createElement('link');
                            fa.rel = 'stylesheet';
                            fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css';
                            document.head.appendChild(fa);
                        })();
                    </script>
                    <script type="module" src="${url.resourcesPath}/js/passwordVisibility.js"></script>
                </#if>
            </div>
        </div>
    <#elseif section = "socialProviders">
        <#if realm.password && social?? && social.providers?has_content>
            <div id="kc-social-providers">
                <div class="social-divider">
                    <span>or sign in with</span>
                </div>
                <ul>
                    <#list social.providers as p>
                        <li>
                            <a href="${p.loginUrl}" id="social-${p.alias}"
                               class="social-btn">
                                <#if p.alias == "google">
                                    <img src="${url.resourcesPath}/img/google-icon-logo-svgrepo-com.svg" alt="Google" class="social-icon" />
                                <#elseif p.alias == "facebook">
                                    <img src="${url.resourcesPath}/img/facebook.svg" alt="Facebook" class="social-icon" />
                                <#else>
                                    <i class="fa fa-${p.alias}" aria-hidden="true"></i>
                                </#if>
                                <span>${p.displayName!}</span>
                            </a>
                        </li>
                    </#list>
                </ul>
            </div>
        </#if>
    <#elseif section = "info">
        <#if realm.password && realm.registrationAllowed && !registrationDisabled??>
            <div id="kc-registration-container">
                <div id="kc-registration">
                    <span>${msg("noAccount")} <a tabindex="6" href="${url.registrationUrl}">${msg("doRegister")}</a></span>
                </div>
            </div>
        </#if>
    </#if>
</@layout.registrationLayout>