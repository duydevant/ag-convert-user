const CHECK_INTERVAL_MILLISECS = 2000;
const initialSession = getSession();

export function checkCookiesAndSetTimer(
  sessionIdOrLoginRestartUrl,
  tabIdOrUnused,
  loginRestartUrl
) {
  const restartUrl =
    typeof loginRestartUrl === "string"
      ? loginRestartUrl
      : sessionIdOrLoginRestartUrl;

  if (!restartUrl) {
    return;
  }

  if (initialSession) {
    return;
  }

  const session = getSession();

  if (!session) {
    setTimeout(
      () =>
        checkCookiesAndSetTimer(
          sessionIdOrLoginRestartUrl,
          tabIdOrUnused,
          loginRestartUrl
        ),
      CHECK_INTERVAL_MILLISECS
    );
    return;
  }
  location.reload();
}

function getSession() {
  return getCookieByName("KEYCLOAK_SESSION");
}

function getCookieByName(name) {
  for (const cookie of document.cookie.split(";")) {
    const [key, value] = cookie.split("=").map((entry) => entry.trim());

    if (key === name) {
      return value.startsWith('"') && value.endsWith('"')
        ? value.slice(1, -1)
        : value;
    }
  }

  return null;
}
