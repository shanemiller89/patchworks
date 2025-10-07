export function shouldInstallDependencies(options) {
    return Boolean(options.install) && !options.reportsOnly;
}
