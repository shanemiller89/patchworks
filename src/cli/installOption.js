export function resolveInstallFlag(cliValue, configValue, defaultValue = true) {
    if (typeof cliValue === 'boolean') {
        return cliValue;
    }
    if (typeof configValue === 'boolean') {
        return configValue;
    }
    return defaultValue;
}
