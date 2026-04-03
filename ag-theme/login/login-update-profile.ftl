<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username','email','firstName','lastName') displayRequiredFields=false; section>
    <#if section = "header">
        ${msg("loginProfileTitle")}
        <span class="login-subtitle">${msg("loginProfileSubtitle", realm.displayName!realm.name)}</span>
    <#elseif section = "form">
        <form id="kc-update-profile-form" class="${properties.kcFormGroupClass!}" action="${url.loginAction}" method="post">

            <#if profile?? && profile.attributes?has_content>
                <#list profile.attributes as attribute>
                    <div class="${properties.kcFormGroupClass!} floating-label-group">
                        <#if attribute.name == "username">
                            <input type="text" id="${attribute.name}" class="${properties.kcInputClass!}" name="${attribute.name}"
                                   value="${(attribute.value!'')}" placeholder=" "
                                   <#if !attribute.readOnly?? || !attribute.readOnly>autocomplete="username"</#if>
                                   <#if attribute.readOnly?? && attribute.readOnly>disabled</#if>
                                   aria-invalid="<#if messagesPerField.existsError(attribute.name)>true</#if>" />
                        <#elseif attribute.name == "email">
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
                            ${advancedMsg(attribute.displayName!attribute.name)}<#if attribute.required??  && attribute.required> *</#if>
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
                <#if user.editUsernameAllowed>
                    <div class="${properties.kcFormGroupClass!} floating-label-group">
                        <input type="text" id="username" class="${properties.kcInputClass!}" name="username"
                               value="${(user.username!'')}" placeholder=" "
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
                    <input type="email" id="email" class="${properties.kcInputClass!}" name="email"
                           value="${(user.email!'')}" autocomplete="email" placeholder=" "
                           aria-invalid="<#if messagesPerField.existsError('email')>true</#if>" />
                    <label for="email" class="floating-label">${msg("email")}</label>
                    <#if messagesPerField.existsError('email')>
                        <span id="input-error-email" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                            ${kcSanitize(messagesPerField.get('email'))?no_esc}
                        </span>
                    </#if>
                </div>

                <div class="${properties.kcFormGroupClass!} floating-label-group">
                    <input type="text" id="firstName" class="${properties.kcInputClass!}" name="firstName"
                           value="${(user.firstName!'')}" placeholder=" "
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
                           value="${(user.lastName!'')}" placeholder=" "
                           aria-invalid="<#if messagesPerField.existsError('lastName')>true</#if>" />
                    <label for="lastName" class="floating-label">${msg("lastName")}</label>
                    <#if messagesPerField.existsError('lastName')>
                        <span id="input-error-lastname" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                            ${kcSanitize(messagesPerField.get('lastName'))?no_esc}
                        </span>
                    </#if>
                </div>
            </#if>

            <div class="${properties.kcFormGroupClass!}" style="margin-top: 8px;">
                <div id="kc-form-buttons" class="${properties.kcFormButtonsClass!}">
                    <input class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!} ${properties.kcButtonLargeClass!}" type="submit" value="${msg("doSubmit")}" />
                </div>
            </div>
        </form>
        <script>document.title = "Update Profile | ${realm.displayName!realm.name}";</script>
    </#if>
</@layout.registrationLayout>
