import logger from '../../reports/logger.js';
export function createOutputErrorHandler(program) {
    return (str, write) => {
        write('');
        logger.error(str.trim());
        program.help();
    };
}
