<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('firstName','lastName','email','username','password','password-confirm') displayRequiredFields=false displayInfo=true; section>
    <#if section = "header">
        ${msg("registerTitle")}
        <span class="login-subtitle">${msg("registerSubtitle", realm.displayName!realm.name)}</span>
    <#elseif section = "form">
        <form id="kc-register-form" class="${properties.kcFormGroupClass!}" action="${url.registrationAction}" method="post">

            <#-- Dynamic fields from User Profile -->
            <#if profile?? && profile.attributes?has_content>
                <#list profile.attributes as attribute>
                    <div class="${properties.kcFormGroupClass!} floating-label-group">
                        <#if attribute.name == "email">
                            <input type="email" id="${attribute.name}" class="${properties.kcInputClass!}" name="${attribute.name}"
                                   value="${(attribute.value!'')}" autocomplete="email" placeholder=" "
                                   <#if attribute.readOnly?? && attribute.readOnly>disabled</#if>
                                   aria-invalid="<#if messagesPerField.existsError(attribute.name)>true</#if>" />
                        <#else>
                            <input type="text" id="${attribute.name}" class="${properties.kcInputClass!}" name="${attribute.name}"
                                   value="${(attribute.value!'')}" placeholder=" "
                                   <#if attribute.readOnly?? && attribute.readOnly>disabled</#if>
                                   aria-invalid="<#if messagesPerField.existsError(attribute.name)>true</#if>" />
                        </#if>
                        <label for="${attribute.name}" class="floating-label">
                            ${advancedMsg(attribute.displayName!attribute.name)}<#if attribute.required?? && attribute.required> *</#if>
                        </label>
                        <#if messagesPerField.existsError(attribute.name)>
                            <span id="input-error-${attribute.name}" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                                ${kcSanitize(messagesPerField.get(attribute.name))?no_esc}
                            </span>
                        </#if>
                    </div>
                </#list>
            <#else>
                <#-- Fallback: static fields if profile API is not available -->
                <div class="${properties.kcFormGroupClass!} floating-label-group">
                    <input type="text" id="firstName" class="${properties.kcInputClass!}" name="firstName"
                           value="${(register.formData.firstName!'')}" placeholder=" "
                           aria-invalid="<#if messagesPerField.existsError('firstName')>true</#if>" />
                    <label for="firstName" class="floating-label">${msg("firstName")}</label>
                    <#if messagesPerField.existsError('firstName')>
                        <span id="input-error-firstname" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                            ${kcSanitize(messagesPerField.get('firstName'))?no_esc}
                        </span>
                    </#if>
                </div>

                <div class="${properties.kcFormGroupClass!} floating-label-group">
                    <input type="text" id="lastName" class="${properties.kcInputClass!}" name="lastName"
                           value="${(register.formData.lastName!'')}" placeholder=" "
                           aria-invalid="<#if messagesPerField.existsError('lastName')>true</#if>" />
                    <label for="lastName" class="floating-label">${msg("lastName")}</label>
                    <#if messagesPerField.existsError('lastName')>
                        <span id="input-error-lastname" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                            ${kcSanitize(messagesPerField.get('lastName'))?no_esc}
                        </span>
                    </#if>
                </div>

                <div class="${properties.kcFormGroupClass!} floating-label-group">
                    <input type="text" id="email" class="${properties.kcInputClass!}" name="email"
                           value="${(register.formData.email!'')}" autocomplete="email" placeholder=" "
                           aria-invalid="<#if messagesPerField.existsError('email')>true</#if>" />
                    <label for="email" class="floating-label">${msg("email")}</label>
                    <#if messagesPerField.existsError('email')>
                        <span id="input-error-email" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                            ${kcSanitize(messagesPerField.get('email'))?no_esc}
                        </span>
                    </#if>
                </div>

                <#if !realm.registrationEmailAsUsername>
                    <div class="${properties.kcFormGroupClass!} floating-label-group">
                        <input type="text" id="username" class="${properties.kcInputClass!}" name="username"
                               value="${(register.formData.username!'')}" autocomplete="username" placeholder=" "
                               aria-invalid="<#if messagesPerField.existsError('username')>true</#if>" />
                        <label for="username" class="floating-label">${msg("username")}</label>
                        <#if messagesPerField.existsError('username')>
                            <span id="input-error-username" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                                ${kcSanitize(messagesPerField.get('username'))?no_esc}
                            </span>
                        </#if>
                    </div>
                </#if>
            </#if>

            <#-- Password fields (always present, not part of profile.attributes) -->
            <#if passwordRequired??>
                <div class="${properties.kcFormGroupClass!} floating-label-group">
                    <div class="${properties.kcInputGroup!}">
                        <input type="password" id="password" class="${properties.kcInputClass!}" name="password"
                               autocomplete="new-password" placeholder=" "
                               aria-invalid="<#if messagesPerField.existsError('password','password-confirm')>true</#if>" />
                        <label for="password" class="floating-label">${msg("password")}</label>
                        <button class="${properties.kcFormPasswordVisibilityButtonClass!}" type="button" aria-label="${msg('showPassword')}"
                                aria-controls="password" data-password-toggle
                                data-icon-show="${properties.kcFormPasswordVisibilityIconShow!}" data-icon-hide="${properties.kcFormPasswordVisibilityIconHide!}"
                                data-label-show="${msg('showPassword')}" data-label-hide="${msg('hidePassword')}">
                            <i class="${properties.kcFormPasswordVisibilityIconShow!}" aria-hidden="true"></i>
                        </button>
                    </div>
                    <#if messagesPerField.existsError('password')>
                        <span id="input-error-password" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                            ${kcSanitize(messagesPerField.get('password'))?no_esc}
                        </span>
                    </#if>
                </div>

                <div class="${properties.kcFormGroupClass!} floating-label-group">
                    <div class="${properties.kcInputGroup!}">
                        <input type="password" id="password-confirm" class="${properties.kcInputClass!}" name="password-confirm" placeholder=" "
                               aria-invalid="<#if messagesPerField.existsError('password-confirm')>true</#if>" />
                        <label for="password-confirm" class="floating-label">${msg("passwordConfirm")}</label>
                        <button class="${properties.kcFormPasswordVisibilityButtonClass!}" type="button" aria-label="${msg('showPassword')}"
                                aria-controls="password-confirm" data-password-toggle
                                data-icon-show="${properties.kcFormPasswordVisibilityIconShow!}" data-icon-hide="${properties.kcFormPasswordVisibilityIconHide!}"
                                data-label-show="${msg('showPassword')}" data-label-hide="${msg('hidePassword')}">
                            <i class="${properties.kcFormPasswordVisibilityIconShow!}" aria-hidden="true"></i>
                        </button>
                    </div>
                    <#if messagesPerField.existsError('password-confirm')>
                        <span id="input-error-password-confirm" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                            ${kcSanitize(messagesPerField.get('password-confirm'))?no_esc}
                        </span>
                    </#if>
                </div>
            </#if>

            <#if recaptchaRequired??>
                <div class="form-group">
                    <div class="${properties.kcInputWrapperClass!}">
                        <div class="g-recaptcha" data-size="compact" data-sitekey="${recaptchaSiteKey}"></div>
                    </div>
                </div>
            </#if>

            <div class="${properties.kcFormGroupClass!}" style="margin-top: 8px;">
                <div id="kc-form-buttons" class="${properties.kcFormButtonsClass!}">
                    <input class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!} ${properties.kcButtonLargeClass!}" type="submit" value="${msg("doRegister")}"/>
                </div>
            </div>
        </form>
        <script>document.title = "Sign up | ${realm.displayName!realm.name}";</script>
    <#elseif section = "socialProviders">
        <#if realm.password && social?? && social.providers?has_content>
            <div id="kc-social-providers">
                <div class="social-divider">
                    <span>or sign up with</span>
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
        <div id="kc-registration-container">
            <div id="kc-registration">
                <span>${msg("alreadyHaveAccount")} <a tabindex="6" href="${url.loginUrl}">${msg("doLogIn")}</a></span>
            </div>
        </div>
    </#if>
</@layout.registrationLayout>
