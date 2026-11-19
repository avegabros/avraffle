import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const location = searchParams.get('location') || undefined;
    const eventCode = searchParams.get('eventCode') || undefined;
    const yearStr = searchParams.get('year') || undefined;
    const year = yearStr ? parseInt(yearStr, 10) : undefined;

    const where: any = {};
    if (location && location !== 'ALL') {
      where.OR = [{ location }, { location: 'ALL' }];
    }
    if (eventCode) {
      where.eventCode = eventCode;
    } else if (year) {
      where.eventYear = year;
    }

    const items = await prisma.feedback.findMany({
      where,
      orderBy: { id: 'desc' },
      take: 500,
    });

    // Compute averages
    const totalCount = items.length;
    let avgOverall = 0;
    const catStats: Record<string, { total: number; count: number; avg: number }> = {
      food: { total: 0, count: 0, avg: 0 },
      drinks: { total: 0, count: 0, avg: 0 },
      program: { total: 0, count: 0, avg: 0 },
      venue: { total: 0, count: 0, avg: 0 },
      raffle: { total: 0, count: 0, avg: 0 },
      decor: { total: 0, count: 0, avg: 0 },
      games: { total: 0, count: 0, avg: 0 },
      presentations: { total: 0, count: 0, avg: 0 },
    };

    if (totalCount > 0) {
      let sumOverall = 0;
      for (const f of items) {
        sumOverall += f.rating;
        if (f.foodRating) { catStats.food.total += f.foodRating; catStats.food.count++; }
        if (f.drinksRating) { catStats.drinks.total += f.drinksRating; catStats.drinks.count++; }
        if (f.programRating) { catStats.program.total += f.programRating; catStats.program.count++; }
        if (f.venueRating) { catStats.venue.total += f.venueRating; catStats.venue.count++; }
        if (f.raffleRating) { catStats.raffle.total += f.raffleRating; catStats.raffle.count++; }
        if (f.decorRating) { catStats.decor.total += f.decorRating; catStats.decor.count++; }
        if (f.gamesRating) { catStats.games.total += f.gamesRating; catStats.games.count++; }
        if (f.presentationsRating) { catStats.presentations.total += f.presentationsRating; catStats.presentations.count++; }
      }
      avgOverall = parseFloat((sumOverall / totalCount).toFixed(2));
      for (const k in catStats) {
        if (catStats[k].count > 0) {
          catStats[k].avg = parseFloat((catStats[k].total / catStats[k].count).toFixed(2));
        }
      }
    }

    return NextResponse.json({
      success: true,
      totalCount,
      avgOverall,
      catStats,
      feedback: items,
    });
  } catch (error) {
    console.error('Feedback fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      rating = 5,
      employeeId,
      name,
      location = 'ALL',
      eventCode,
      eventYear,
      foodRating,
      drinksRating,
      programRating,
      venueRating,
      raffleRating,
      decorRating,
      gamesRating,
      presentationsRating,
      comment,
    } = body;

    // Get active event if eventCode not provided
    let finalEventCode = eventCode;
    let finalEventYear = eventYear;
    if (!finalEventCode) {
      const activeEvent = await prisma.event.findFirst({ where: { isActive: true } });
      if (activeEvent) {
        finalEventCode = activeEvent.code;
        finalEventYear = activeEvent.year;
      } else {
        finalEventYear = finalEventYear || 2026;
      }
    }

    let existing = null;
    if (employeeId) {
      existing = await prisma.feedback.findFirst({
        where: {
          employeeId: String(employeeId).trim(),
          eventCode: finalEventCode || null,
        },
      });
    }

    const payload = {
      rating: Math.max(1, Math.min(5, parseInt(String(rating), 10) || 5)),
      employeeId: employeeId ? String(employeeId).trim() : null,
      name: name ? String(name).trim() : null,
      location: String(location || 'ALL'),
      eventCode: finalEventCode || null,
      eventYear: parseInt(String(finalEventYear || 2026), 10),
      foodRating: foodRating ? Math.max(1, Math.min(5, parseInt(String(foodRating), 10))) : null,
      drinksRating: drinksRating ? Math.max(1, Math.min(5, parseInt(String(drinksRating), 10))) : null,
      programRating: programRating ? Math.max(1, Math.min(5, parseInt(String(programRating), 10))) : null,
      venueRating: venueRating ? Math.max(1, Math.min(5, parseInt(String(venueRating), 10))) : null,
      raffleRating: raffleRating ? Math.max(1, Math.min(5, parseInt(String(raffleRating), 10))) : null,
      decorRating: decorRating ? Math.max(1, Math.min(5, parseInt(String(decorRating), 10))) : null,
      gamesRating: gamesRating ? Math.max(1, Math.min(5, parseInt(String(gamesRating), 10))) : null,
      presentationsRating: presentationsRating ? Math.max(1, Math.min(5, parseInt(String(presentationsRating), 10))) : null,
      ...(comment !== undefined ? { comment: comment ? String(comment).trim() : null } : {}),
    };

    let resultRecord;
    if (existing) {
      resultRecord = await prisma.feedback.update({
        where: { id: existing.id },
        data: payload,
      });
    } else {
      resultRecord = await prisma.feedback.create({
        data: payload,
      });
    }

    return NextResponse.json({
      success: true,
      feedback: resultRecord,
      message: 'Feedback saved successfully!',
    });
  } catch (error) {
    console.error('Feedback submission error:', error);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}
