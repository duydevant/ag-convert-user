---
description: Sync ag-theme to local Keycloak Docker mount directory
---

# Sync Theme to Keycloak

This syncs the `ag-theme` folder to the Docker bind-mount directory so changes are reflected immediately with Ctrl+Shift+R in the browser.

// turbo-all

1. Sync theme files:
```
robocopy "d:\ag-theme-1\ag-convert-user\ag-theme" "d:\ag-keycloak\keycloak-theme\ag-theme" /MIR /NFL /NDL /NJH /NJS
```

> Note: Robocopy exit code 1 means "files copied successfully". The Keycloak container already has `--spi-theme-cache-themes=false` and `--spi-theme-static-max-age=-1`, so just Ctrl+Shift+R in the browser to see changes.
