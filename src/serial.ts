export async function requestPort() {
  return await navigator.serial.requestPort();
}
