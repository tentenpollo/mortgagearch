import { NextRequest, NextResponse } from "next/server";

export function requireBrokerAuth(request: NextRequest): NextResponse | null {
  const token = request.cookies.get("broker_session")?.value;

  if (!token) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  return null;
}
