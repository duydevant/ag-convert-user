<#import "template.ftl" as layout>
<@layout.registrationLayout displayInfo=true; section>
    <#if section = "header">
        ${msg("emailVerifyTitle")}
        <span class="login-subtitle">${msg("emailVerifySubtitle")}</span>
    <#elseif section = "form">
        <div id="kc-verify-email" style="text-align: center; padding: 16px 0;">
            <div style="margin-bottom: 24px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                </svg>
            </div>
            <p style="font-size: 14px; color: var(--color-text); line-height: 1.6; margin: 0 0 8px;">
                ${msg("emailVerifyInstruction1")}
            </p>
            <p style="font-size: 13px; color: var(--color-text-light); line-height: 1.6; margin: 0 0 24px;">
                ${msg("emailVerifyInstruction2")}
            </p>
            <div style="margin-top: 8px;">
                <a href="${url.loginAction}" class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!} ${properties.kcButtonLargeClass!}" style="display: inline-flex; align-items: center; justify-content: center; text-decoration: none; color: #fff;">
                    ${msg("emailVerifyResend")}
                </a>
            </div>
        </div>
        <script>document.title = "Verify email | ${realm.displayName!realm.name}";</script>
    </#if>
</@layout.registrationLayout>
