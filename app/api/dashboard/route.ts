// app/api/dashboard/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/db';

const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    
    // Get date range from query params (for filtering)
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build date filter
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        started_at: {
          gte: startDate,
          lte: endDate
        }
      };
    }

    // Fetch all calls for the tenant with date filtering
    const { data: calls, error: callsError } = await supabase
      .from('calls')
      .select('*')
      .eq('tenant_id', DEMO_TENANT_ID)
      .order('started_at', { ascending: false });

    if (callsError) throw callsError;

    // Filter calls by date range if provided
    const filteredCalls = calls?.filter(call => {
      if (!startDate || !endDate) return true;
      const callDate = new Date(call.started_at);
      return callDate >= new Date(startDate) && callDate <= new Date(endDate);
    }) || [];

    // Fetch bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .eq('tenant_id', DEMO_TENANT_ID)
      .order('created_at', { ascending: false });

    if (bookingsError) throw bookingsError;

    // Calculate metrics
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const callsToday = filteredCalls.filter(call => 
      new Date(call.started_at) >= todayStart
    ).length;

    const bookingsToday = bookings?.filter(booking => 
      new Date(booking.created_at) >= todayStart
    ).length || 0;

    const totalBookings = bookings?.length || 0;
    
    const conversionRate = filteredCalls.length > 0 
      ? Math.round((totalBookings / filteredCalls.length) * 100)
      : 0;

    // Calculate outcome distribution
    const outcomeStats = filteredCalls.reduce((acc, call) => {
      const outcome = call.outcome || 'unknown';
      acc[outcome] = (acc[outcome] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate calls by day (last 7 days)
    const callsByDayMap = new Map<string, number>();
    const baseDate = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      callsByDayMap.set(dateStr, 0);
    }

    filteredCalls.forEach(call => {
      const dateStr = new Date(call.started_at).toISOString().split('T')[0];
      if (callsByDayMap.has(dateStr)) {
        callsByDayMap.set(dateStr, callsByDayMap.get(dateStr)! + 1);
      }
    });

    const callsByDay = Array.from(callsByDayMap.entries()).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      calls: count
    }));

    // Calculate calls by hour
    const callsByHourMap = new Map<number, number>();
    
    for (let hour = 0; hour < 24; hour++) {
      callsByHourMap.set(hour, 0);
    }

    filteredCalls.forEach(call => {
      const hour = new Date(call.started_at).getHours();
      callsByHourMap.set(hour, callsByHourMap.get(hour)! + 1);
    });

    // Only include hours with activity
    const callsByHour = Array.from(callsByHourMap.entries())
      .filter(([_, count]) => count > 0)
      .map(([hour, count]) => ({
        hour: `${hour % 12 || 12}${hour >= 12 ? 'pm' : 'am'}`,
        calls: count
      }));

    // Calculate trends (compare to previous period)
    const previousPeriodStart = new Date(todayStart);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - 7);
    
    const callsPreviousWeek = calls?.filter(call => {
      const callDate = new Date(call.started_at);
      return callDate >= previousPeriodStart && callDate < todayStart;
    }).length || 0;

    const callsTrend = callsPreviousWeek > 0 
      ? Math.round(((filteredCalls.length - callsPreviousWeek) / callsPreviousWeek) * 100)
      : 0;

    return NextResponse.json({
      metrics: {
        callsToday,
        bookingsToday,
        conversionRate,
        totalBookings,
        callsTrend
      },
      charts: {
        callsByDay,
        callsByHour,
        outcomeDistribution: Object.entries(outcomeStats).map(([outcome, count]) => ({
          outcome,
          count: count as number,
          percentage: Math.round(((count as number) / filteredCalls.length) * 100)
        }))
      },
      recentCalls: filteredCalls.slice(0, 10),
      recentBookings: bookings?.slice(0, 5) || []
    });

  } catch (error) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}