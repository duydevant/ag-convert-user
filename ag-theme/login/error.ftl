<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=false displayInfo=false; section>
    <#if section = "header">
        ${msg("errorTitle")}
        <span class="login-subtitle">${msg("errorSubtitle")}</span>
    <#elseif section = "form">
        <div id="kc-error-message" style="text-align: center; padding: 16px 0;">
            <div style="margin-bottom: 24px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
            </div>
            <p style="font-size: 14px; color: var(--color-text); line-height: 1.6; margin: 0 0 24px;">
                ${kcSanitize(message.summary)?no_esc}
            </p>
            <#if skipLink??>
            <#else>
                <div style="margin-top: 8px;">
                    <a id="backToLogin" href="<#if client?? && client.baseUrl?has_content>${client.baseUrl}<#else>/realms/${realm.name}/account</#if>" class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!} ${properties.kcButtonLargeClass!}" style="display: inline-flex; align-items: center; justify-content: center; text-decoration: none; color: #fff;">
                        ${msg("backToLogin")}
                    </a>
                </div>
            </#if>
        </div>
        <script>document.title = "Error | ${realm.displayName!realm.name}";</script>
    </#if>
</@layout.registrationLayout>
