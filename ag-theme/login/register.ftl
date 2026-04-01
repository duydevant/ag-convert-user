<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('firstName','lastName','email','username','password','password-confirm') displayRequiredFields=false; section>
    <#if section = "header">
        ${msg("registerTitle")}
        <span class="login-subtitle">${msg("registerSubtitle", realm.displayName!realm.name)}</span>
    <#elseif section = "form">
        <form id="kc-register-form" class="${properties.kcFormGroupClass!}" action="${url.registrationAction}" method="post">

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
                <div id="kc-form-options" style="text-align: center; margin-top: 16px; font-size: 13px; color: #64748b;">
                    <span>${msg("alreadyHaveAccount")} <a href="${url.loginUrl}" style="font-weight: 600; text-decoration: none;">${msg("doLogIn")}</a></span>
                </div>
            </div>
        </form>
        <script>document.title = "Sign up | ${realm.displayName!realm.name}";</script>
    </#if>
</@layout.registrationLayout>

