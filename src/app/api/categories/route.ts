import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Category from "@/models/Category";

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        const categories = await Category.find().sort({ createdAt: 1 });
        return NextResponse.json(categories);
    } catch (error) {
        console.error("Error fetching categories:", error);
        return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();
        const body = await req.json();

        if (!body.name) {
            return NextResponse.json({ error: "Category name is required" }, { status: 400 });
        }

        const category = await Category.create({
            name: body.name,
            color: body.color || '#3b82f6',
            defaultStartTime: body.defaultStartTime,
            defaultEndTime: body.defaultEndTime
        });

        return NextResponse.json(category, { status: 201 });
    } catch (error: any) {
        // Handle unique constraint error
        if (error.code === 11000) {
            return NextResponse.json({ error: "Category already exists" }, { status: 400 });
        }
        console.error("Error creating category:", error);
        return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        await connectToDatabase();
        const body = await req.json();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: "Category ID required" }, { status: 400 });
        }

        const category = await Category.findByIdAndUpdate(
            id,
            {
                name: body.name,
                color: body.color,
                defaultStartTime: body.defaultStartTime,
                defaultEndTime: body.defaultEndTime
            },
            { new: true }
        );

        return NextResponse.json(category);
    } catch (error) {
        console.error("Error updating category:", error);
        return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: "ID required" }, { status: 400 });
        }

        await Category.findByIdAndDelete(id);
        return NextResponse.json({ message: "Category deleted" });
    } catch (error) {
        console.error("Error deleting category:", error);
        return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
    }
}
