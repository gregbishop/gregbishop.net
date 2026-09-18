// Strip 256-color escapes from terminal text, for assertions.
// eslint-disable-next-line no-control-regex
const ESC = /\x1b\[[0-9;]*m/g;
export const stripAnsi = (s) => s.replace(ESC, '');
