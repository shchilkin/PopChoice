export function shouldRunOneShot(argv: string[], schedule: string): boolean {
  return argv.includes('--once') || schedule === '';
}
