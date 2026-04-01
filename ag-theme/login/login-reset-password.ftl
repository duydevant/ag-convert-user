<#import "template.ftl" as layout>
<@layout.registrationLayout displayInfo=true displayMessage=!messagesPerField.existsError('username'); section>
    <#if section = "header">
        ${msg("emailForgotTitle")}
        <span class="login-subtitle">${msg("emailForgotSubtitle")}</span>
    <#elseif section = "form">
        <form id="kc-reset-password-form" class="${properties.kcFormGroupClass!}" action="${url.loginAction}" method="post">

            <div class="${properties.kcFormGroupClass!} floating-label-group">
                <input type="text" id="username" class="${properties.kcInputClass!}" name="username" autofocus placeholder=" "
                       value="${(auth.attemptedUsername!'')}"
                       aria-invalid="<#if messagesPerField.existsError('username')>true</#if>" />
                <label for="username" class="floating-label">
                    <#if !realm.loginWithEmailAllowed>${msg("username")}<#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}<#else>${msg("email")}</#if>
                </label>
                <#if messagesPerField.existsError('username')>
                    <span id="input-error-username" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                        ${kcSanitize(messagesPerField.getFirstError('username'))?no_esc}
                    </span>
                </#if>
            </div>

            <div class="${properties.kcFormGroupClass!}" style="margin-top: 8px;">
                <div id="kc-form-buttons" class="${properties.kcFormButtonsClass!}">
                    <input class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!} ${properties.kcButtonLargeClass!}" type="submit" value="${msg("doSubmit")}"/>
                </div>
                <div id="kc-form-options" style="text-align: center; margin-top: 16px; font-size: 13px; color: #64748b;">
                    <span><a href="${url.loginUrl}" style="font-weight: 600; text-decoration: none;">${msg("backToLogin")}</a></span>
                </div>
            </div>
        </form>
        <script>document.title = "Reset password | ${realm.displayName!realm.name}";</script>
    </#if>
</@layout.registrationLayout>
