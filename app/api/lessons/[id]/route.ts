import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('Authorization');
    const user = authHeader ? await verifyAuth(authHeader) : null;

    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', params.id)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json(
        { success: false, error: 'Lesson not found' },
        { status: 404 }
      );
    }

    const { data: module, error: moduleError } = await supabase
      .from('modules')
      .select(`
        *,
        lessons:lessons(*)
      `)
      .eq('id', lesson.module_id)
      .single();

    if (moduleError || !module) {
      return NextResponse.json(
        { success: false, error: 'Module not found' },
        { status: 404 }
      );
    }

    let isCompleted = false;
    if (user) {
      const { data: completion } = await supabase
        .from('content_consumption')
        .select('completed')
        .eq('user_id', user.id)
        .eq('lesson_id', params.id)
        .single();

      isCompleted = completion?.completed || false;
    }

    return NextResponse.json({
      success: true,
      lesson,
      module,
      isCompleted
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
