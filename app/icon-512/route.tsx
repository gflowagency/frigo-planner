import { ImageResponse } from "next/og";
import { FridgeMark } from "@/lib/app-icon";

export async function GET() {
  return new ImageResponse(<FridgeMark size={512} />, { width: 512, height: 512 });
}
