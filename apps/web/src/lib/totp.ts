import speakeasy from "speakeasy";
import * as QRCode from "qrcode";

export { QRCode };

export function verifyTotpToken(token: string, secret: string): boolean {
  try {
    return speakeasy.totp.verify({
      secret,
      token,
      window: 1,
      encoding: "base32",
    });
  } catch {
    return false;
  }
}

export function generateTotpSecret(): string {
  return speakeasy.generateSecret({
    name: "BotBay Admin",
    length: 20,
  }).base32;
}

export function generateTotpUri(secret: string, name: string, issuer = "BotBay Admin"): string {
  return speakeasy.otpauthURL({
    secret,
    label: name,
    issuer,
  });
}

export async function generateTotpQr(secret: string, name: string, issuer = "BotBay Admin"): Promise<string> {
  const otpauth = generateTotpUri(secret, name, issuer);
  return QRCode.toDataURL(otpauth);
}
