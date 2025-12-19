import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";

export async function GET(req: NextRequest) {
    const token = req.cookies.get("token")?.value;

    if (!token) {
        return NextResponse.json({ user: null }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
        return NextResponse.json({ user: null }, { status: 401 });
    }

    try {
        await connectToDatabase();
        const user = await User.findById(payload.userId).select("-passwordHash");
        if (!user) {
            return NextResponse.json({ user: null }, { status: 401 });
        }
        return NextResponse.json({ user });
    } catch (error) {
        return NextResponse.json({ user: null }, { status: 500 });
    }
}
