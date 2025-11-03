import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST /api/auth/logout - Log user logout activity
export async function POST(request) {
  try {
    const { email, name, department, location, role } = await request.json();

    // Validate input
    if (!email) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    // Log logout activity
    try {
      await prisma.activity.create({
        data: {
          action: 'logout',
          entityType: 'user',
          entityId: email, // Using email as ID since we don't have user ID from client
          entityName: name || email,
          description: `${name || email} logged out`,
          performedBy: email,
          metadata: JSON.stringify({
            email: email,
            department: department || 'N/A',
            location: location || 'N/A',
            role: role || 'user',
            timestamp: new Date().toISOString()
          })
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Logout logged successfully',
      });
    } catch (activityError) {
      console.error('Failed to log logout activity:', activityError);
      return NextResponse.json(
        { error: 'Failed to log logout activity' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Logout logging error:', error);
    return NextResponse.json(
      { error: 'An error occurred during logout logging' },
      { status: 500 }
    );
  }
}
