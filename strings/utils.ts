export function chunkString(input: string, maxSize: number, attemptSplitOn: string = '\n'): string[] {
  if (maxSize <= 0) {
    throw new Error('Max size should be greater than 0');
  }

  const chunks: string[] = [];
  let index = 0;

  while (index < input.length) {
    let chunk = input.substring(index, index + maxSize);

    const lastNewLineIndex = chunk.lastIndexOf(attemptSplitOn);
    if (lastNewLineIndex !== -1 && lastNewLineIndex + 1 < maxSize) {
      chunk = chunk.substring(0, lastNewLineIndex + 1);
      index += lastNewLineIndex + 1;
    } else if (lastNewLineIndex !== -1 && lastNewLineIndex !== 0) {
      chunk = chunk.substring(0, lastNewLineIndex);
      index += lastNewLineIndex + 1;
    } else {
      index += maxSize;
    }

    chunks.push(chunk);
  }

  return chunks;
}
