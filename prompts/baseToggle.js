import { createPrompt, isEnterKey, useKeypress, usePrefix, useState, } from '@inquirer/core';
import chalk from 'chalk';
// Define a custom toggle prompt
export const customTogglePrompt = createPrompt((config, done) => {
    const [status, setStatus] = useState('idle');
    const activeLabel = config.active || 'Yes';
    const inactiveLabel = config.inactive || 'No';
    const [value, setValue] = useState(config.default ? activeLabel : inactiveLabel);
    const prefix = usePrefix({ status });
    // Handle keypress events
    useKeypress((key) => {
        if (isEnterKey(key)) {
            setStatus('done');
            done(value === activeLabel);
        }
        else if (key.name === 'left' || key.name === 'right') {
            setValue(value === activeLabel ? inactiveLabel : activeLabel); // Toggle between active and inactive labels
        }
    });
    const message = chalk.bold(config.message);
    const optionsDisplay = `${value === activeLabel
        ? chalk.cyanBright(activeLabel)
        : chalk.dim(activeLabel)}/${value === inactiveLabel
        ? chalk.cyanBright(inactiveLabel)
        : chalk.dim(inactiveLabel)}`;
    const formattedValue = status === 'done' ? chalk.green(value) : optionsDisplay;
    return `${prefix} ${message} ${formattedValue}`;
});
