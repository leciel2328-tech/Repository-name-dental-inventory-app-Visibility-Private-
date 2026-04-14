// PUT    /api/materials/:id  → 材料を更新
// DELETE /api/materials/:id  → 材料を削除

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const material = await prisma.material.update({
    where: { id: Number(id) },
    data: {
      name:         body.name,
      size:         body.size         ?? "",
      clinic:       body.clinic       ?? "",
      category:     body.category,
      currentStock: Number(body.currentStock),
      unit:         body.unit,
      dailyUsage:   Number(body.dailyUsage),
      importance:   body.importance,
      notes:        body.notes        ?? "",
    },
  });

  return NextResponse.json(material);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  await prisma.material.delete({
    where: { id: Number(id) },
  });

  return NextResponse.json({ success: true });
}
