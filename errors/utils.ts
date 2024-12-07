import {ManagedError} from "./managed";

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

export async function failedResponseToError(result: Response): Promise<Error> {
  let responseText: string;
  try {
    responseText = await result.text();
  } catch (responseReadErr) {
    responseText = '<failed to read: ' + describeError(responseReadErr) + '>';
  }

  const details: any = {
    statusCode: result.status,
  };
  try {
    const locallySerializedResponse = JSON.parse(responseText);
    if (locallySerializedResponse && typeof locallySerializedResponse === 'object') {
      details.response = locallySerializedResponse;

    }
  } catch (err) {
    details.responseText = responseText;
  }

  return new ManagedError(
      'HTTP response returned with status ' + result.status + ' (' + result.statusText + ') - (' + responseText + ')', {
        code: 'HttpResponse' + result.status,
        details: details,
      }
  );
}