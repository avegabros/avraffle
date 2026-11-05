import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, firstName, lastName, department, position, location, eventYear, inWheel, isRegistered, isWinner, prizeWon } = body;

    if (!id) {
      return NextResponse.json({ error: 'Guest ID is required' }, { status: 400 });
    }

    const dataToUpdate: Record<string, unknown> = {};
    if (firstName !== undefined) dataToUpdate.firstName = firstName;
    if (lastName !== undefined) dataToUpdate.lastName = lastName;
    if (department !== undefined) dataToUpdate.department = department;
    if (position !== undefined) dataToUpdate.position = position;
    if (location !== undefined) dataToUpdate.location = location;
    if (eventYear !== undefined) dataToUpdate.eventYear = parseInt(String(eventYear), 10);
    if (inWheel !== undefined) dataToUpdate.inWheel = inWheel;
    if (isRegistered !== undefined) dataToUpdate.isRegistered = isRegistered;

    // Reset or update winner status
    if (isWinner !== undefined) {
      dataToUpdate.isWinner = isWinner;
      if (!isWinner) {
        // Resetting winner: clear prize won, clear win date, return them to wheel if registered!
        dataToUpdate.prizeWon = null;
        dataToUpdate.winOn = null;
        dataToUpdate.inWheel = true;
      } else {
        dataToUpdate.prizeWon = prizeWon || 'Claimed Prize';
        dataToUpdate.winOn = new Date();
        dataToUpdate.inWheel = false;
      }
    }

    const updated = await prisma.guest.update({
      where: { id: parseInt(String(id), 10) },
      data: dataToUpdate,
    });

    return NextResponse.json({ success: true, guest: updated });
  } catch (error) {
    console.error('Failed to update guest:', error);
    return NextResponse.json({ error: 'Failed to update guest' }, { status: 500 });
  }
}
