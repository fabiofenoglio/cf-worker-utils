
export function describeError(errorOrString: unknown): string {
  if (errorOrString instanceof Error) {
    // If it's an Error object, return the error message
    return errorOrString.message;
  } else if (typeof errorOrString === 'string') {
    // If it's a string, return the string itself
    return errorOrString;
  } else {
    return '' + errorOrString;
  }
}