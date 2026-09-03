const ANSI = {
  green: '\u001b[32m',
  orange: '\u001b[38;5;208m',
  grey: '\u001b[90m',
  yellow: '\u001b[33m',
  red: '\u001b[31m',
  reset: '\u001b[0m',
};

function formatMessage(fileName, message, color, hasValues){
    /*
    Function to format log messages with ANSI color codes for console output.
    
    It takes a file name, a message, a color, and a boolean indicating if there are additional values to log.
    The formatted message includes the file name in orange, the message in the specified color, and resets the color at the end.

    If there are additional values, it appends a newline character at the end of the message.
    */
  const suffix = hasValues ? '' : '\n';

  return `${ANSI.green}[L4RI]${ANSI.reset} ${ANSI.grey}${fileName}${ANSI.reset} \n${color}${message}${ANSI.reset}${suffix}`;
}

function formatThrownError(thrownError) {
  if (thrownError instanceof Error) {
    return thrownError.stack || `${thrownError.name}: ${thrownError.message}`;
  }

  if (typeof thrownError === 'string') {
    return thrownError;
  }

  try {
    return JSON.stringify(thrownError);
  } catch {
    return String(thrownError);
  }
}


export function log(fileName, message, ...values) {
    /*
    Function to logs messages to the console with desired format built from formatMessage function. 
    
    It takes a file name, a message, and any additional values to log.
    */
  console.log(formatMessage(fileName, message, ANSI.yellow, values.length > 0), ...values);
}


export function error(fileName, message, ...values) {
    /*
    Function to log error messages to the console with desired format built from formatMessage function. 
    
    It takes a file name, an error message, and any additional values to log.
    */
  console.error(formatMessage(fileName, message, ANSI.red, values.length > 0), ...values);
}

export function warn(fileName, message, ...values) {
    /*
    Function to log warning messages to the console with desired format built from formatMessage function. 
    
    It takes a file name, a warning message, and any additional values to log.
    */
  console.warn(formatMessage(fileName, message, ANSI.orange, values.length > 0), ...values);
}

export function logError(fileName, message, thrownError) {
    /*
    Function to log error messages to the console with desired format built from formatMessage function. 
    
    It takes a file name, an error message, and an error object to log.
    */
  const formattedError = formatThrownError(thrownError);
  console.error(
    formatMessage(fileName, message, ANSI.red, true),
    `${ANSI.red}${formattedError}${ANSI.reset}`,
  );
}
