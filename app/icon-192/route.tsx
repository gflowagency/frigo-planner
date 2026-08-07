import { ImageResponse } from "next/og";
import { FridgeMark } from "@/lib/app-icon";

export async function GET() {
  return new ImageResponse(<FridgeMark size={192} />, { width: 192, height: 192 });
}
