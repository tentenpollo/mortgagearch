import { NextRequest } from "next/server";
import { cookies } from "next/headers";

export async function requireBrokerAuth(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("broker_session")?.value;
  
  if (!token) {
    throw new Error("Unauthorized");
  }
  
  return { token };
}

export function getBrokerFromRequest(request: NextRequest) {
  return { brokerId: "default" };
}
