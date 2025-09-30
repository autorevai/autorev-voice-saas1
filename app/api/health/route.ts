import { NextResponse } from "next/server";
import packageJson from "../../../package.json";

// ---------- helpers ----------
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, x-shared-secret, x-tool-name, x-vapi-signature",
  };
}

function withCors(body: any, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...corsHeaders(),
    },
  });
}

// ---------- HTTP handlers ----------
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET() {
  return withCors({
    ok: true,
    env: process.env.NODE_ENV || "development",
    time: new Date().toISOString(),
    version: packageJson.version,
  }, 200);
}